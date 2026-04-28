#!/usr/bin/env python3
"""
Cloudflare DNS cutover: underlandex.com → Vercel landing page.

Usage:
    python3 scripts/cutover-dns.py <CLOUDFLARE_API_TOKEN> [--alb <ALB_DNS>] [--dry-run]

Steps performed:
    1. List existing A/CNAME records for @ and www
    2. Add app.underlandex.com CNAME → ALB (if --alb provided)
    3. Delete existing @ and www records pointing to ECS
    4. Add @ A 76.76.21.21 (DNS only — Vercel)
    5. Add www CNAME cname.vercel-dns.com (DNS only — Vercel)

Rollback:
    Re-run with --rollback --alb <ALB_DNS> to restore ECS records.
"""

import sys
import json
import urllib.request
import urllib.error
import argparse

CF_ZONE_ID = "a1b76685d672e651c69500c4af62cb64"
CF_API_BASE = "https://api.cloudflare.com/client/v4"
VERCEL_IP = "76.76.21.21"
VERCEL_CNAME = "cname.vercel-dns.com"


def cf(token: str, method: str, path: str, body=None):
    url = f"{CF_API_BASE}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())


def list_records(token: str, name: str, rtype: str = None):
    params = f"?name={name}&zone_id={CF_ZONE_ID}"
    if rtype:
        params += f"&type={rtype}"
    resp = cf(token, "GET", f"/zones/{CF_ZONE_ID}/dns_records{params}")
    return resp.get("result", [])


def delete_record(token: str, record_id: str, name: str, dry_run: bool):
    print(f"  {'[DRY]' if dry_run else ''} DELETE record {name} (id={record_id})")
    if not dry_run:
        cf(token, "DELETE", f"/zones/{CF_ZONE_ID}/dns_records/{record_id}")


def create_record(token: str, rtype: str, name: str, content: str, proxied: bool, dry_run: bool):
    print(f"  {'[DRY]' if dry_run else ''} CREATE {rtype} {name} → {content} (proxied={proxied})")
    if not dry_run:
        resp = cf(token, "POST", f"/zones/{CF_ZONE_ID}/dns_records", {
            "type": rtype, "name": name, "content": content,
            "proxied": proxied, "ttl": 1
        })
        if not resp.get("success"):
            print(f"  ERROR: {resp.get('errors')}")
            return False
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("token", help="Cloudflare API token")
    parser.add_argument("--alb", help="ECS ALB DNS (e.g. underlandex-alb-xxx.ap-southeast-2.elb.amazonaws.com)")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without executing")
    parser.add_argument("--rollback", action="store_true", help="Restore ECS ALB records (requires --alb)")
    args = parser.parse_args()

    token = args.token
    dry_run = args.dry_run

    # Verify token
    me = cf(token, "GET", "/user/tokens/verify")
    if not me.get("success"):
        print("ERROR: Invalid token:", me.get("errors"))
        sys.exit(1)
    print("Token OK:", me["result"].get("status"))

    if args.rollback:
        if not args.alb:
            print("ERROR: --rollback requires --alb <ALB_DNS>")
            sys.exit(1)
        print("\n=== ROLLBACK: restoring ECS records ===")
        # Delete Vercel records
        for name in ["underlandex.com", "www.underlandex.com"]:
            for rec in list_records(token, name):
                delete_record(token, rec["id"], name, dry_run)
        # Restore ALB records
        create_record(token, "CNAME", "underlandex.com", args.alb, True, dry_run)
        create_record(token, "CNAME", "www.underlandex.com", args.alb, True, dry_run)
        print("\nRollback complete. DNS will propagate within ~60s.")
        return

    print("\n=== STEP 1: Inventory existing records ===")
    root_records = list_records(token, "underlandex.com")
    www_records = list_records(token, "www.underlandex.com")
    alb_dns = None

    for rec in root_records:
        print(f"  EXISTING @ {rec['type']} → {rec['content']} (proxied={rec['proxied']}, id={rec['id']})")
        if rec["type"] in ("A", "CNAME") and "amazonaws" in rec.get("content", ""):
            alb_dns = rec["content"]
    for rec in www_records:
        print(f"  EXISTING www {rec['type']} → {rec['content']} (proxied={rec['proxied']}, id={rec['id']})")

    if args.alb:
        alb_dns = args.alb

    if alb_dns:
        print(f"\n  ALB DNS: {alb_dns}")
    else:
        print("\n  WARNING: Could not determine ALB DNS from existing records.")
        print("  You will need to add app.underlandex.com manually after cutover.")

    if alb_dns:
        print("\n=== STEP 2: Add app.underlandex.com → ALB ===")
        existing_app = list_records(token, "app.underlandex.com")
        if existing_app:
            print(f"  app.underlandex.com already exists: {existing_app[0]['content']}")
        else:
            create_record(token, "CNAME", "app.underlandex.com", alb_dns, True, dry_run)

    print("\n=== STEP 3: Remove existing @ and www records ===")
    for rec in root_records:
        delete_record(token, rec["id"], "underlandex.com", dry_run)
    for rec in www_records:
        delete_record(token, rec["id"], "www.underlandex.com", dry_run)

    print("\n=== STEP 4: Add Vercel records (DNS only — no proxy) ===")
    create_record(token, "A", "underlandex.com", VERCEL_IP, False, dry_run)
    create_record(token, "CNAME", "www.underlandex.com", VERCEL_CNAME, False, dry_run)

    if dry_run:
        print("\nDRY RUN complete — no changes made.")
    else:
        print("\nDNS updated. Vercel will verify and email when complete (5–60 min).")
        print("Check: https://underlandex-landing.vercel.app (immediate) and https://underlandex.com (after DNS)")
        if alb_dns:
            print(f"Explorer still accessible at: https://app.underlandex.com (after ~60s propagation)")
        print("\nRollback if needed:")
        if alb_dns:
            print(f"  python3 scripts/cutover-dns.py <TOKEN> --alb {alb_dns} --rollback")
        else:
            print(f"  python3 scripts/cutover-dns.py <TOKEN> --alb <ALB_DNS> --rollback")


if __name__ == "__main__":
    main()
