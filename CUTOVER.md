# underlandex.com cutover plan

The Vercel landing at https://underlandex-landing.vercel.app is production-ready and serves on the Vercel
preview alias. To make it the canonical site at https://underlandex.com, the existing app needs to move to
`app.underlandex.com` and the root DNS needs to flip to Vercel.

## Status (updated 2026-04-28) ✅ COMPLETE

- ✅ Vercel: `underlandex.com` + `www.underlandex.com` assigned to `underlandex-landing` project under `lichen-commodities` team
- ✅ DNS cutover executed — `@` → `76.76.21.21` (Vercel, DNS only), `www` → `cname.vercel-dns.com`
- ✅ `app.underlandex.com` → `65.109.54.190` (Proxied — existing app server)
- ✅ Landing page confirmed serving at `https://underlandex.com`
- ⏳ SSL certificate provisioning (Vercel auto-issues, takes 5–15 min after DNS)

**Cloudflare account**: `oliver.mowbray@outlook.com` — credentials in `.cloudflare-credentials` (gitignored) and vault.

## Pre-cutover (do these in any order)

### 1. Transfer domain on Vercel (or remove from old team)

- Sign in at https://vercel.com as the owner of the `olivermowbray-4955` personal team
- Settings → Domains → `underlandex.com` → **Remove**
- Then in `lichen-commodities` team: re-add to the `underlandex-landing` project
  *(already added once on 2026-04-28; will activate on DNS verification)*

### 2. Move existing app to `app.underlandex.com`

The current production at `underlandex.com` is the Next.js explorer on AWS ECS Fargate
(see [/home/coder/projects/underlandex/CLAUDE.md](../underlandex/CLAUDE.md) §Production Deployment).

Steps:

- **AWS**: get the ECS service's ALB DNS (e.g. `underlandex-alb-xxx.ap-southeast-2.elb.amazonaws.com`) — already exists.
- **Cloudflare** (zone ID `a1b76685d672e651c69500c4af62cb64`): add `app.underlandex.com` → CNAME → `<ALB-DNS>` (Proxied).
- **ECS task definition**: rebuild + push with `NEXT_PUBLIC_SITE_URL=https://app.underlandex.com`.
- **Auth0 dashboard** → Applications → UnderlandEX:
  - Allowed Callback URLs: add `https://app.underlandex.com/api/auth/callback`
  - Allowed Logout URLs: add `https://app.underlandex.com`
  - Allowed Web Origins: add `https://app.underlandex.com`
- **Hardcoded URL audit** in the Next.js repo (already mostly cleaned):
  - `app/sitemap.ts`
  - email templates that point at `https://underlandex.com`
  - CRM webhook payload sources
  - replace each with `https://app.underlandex.com`
- Verify `https://app.underlandex.com` loads, login round-trips, projects search works.

### 3. Cloudflare DNS swap

Once both 1 and 2 are done, in Cloudflare under `underlandex.com` zone:

- Delete or update existing `A`/`CNAME` records for `@` and `www` that point to the ECS ALB.
- Add for the **root** (`@`):
  ```
  Type:    A
  Name:    @
  Content: 76.76.21.21
  Proxy:   DNS only (Vercel handles SSL)
  TTL:     Auto
  ```
- Add for `www`:
  ```
  Type:    CNAME
  Name:    www
  Content: cname.vercel-dns.com
  Proxy:   DNS only
  TTL:     Auto
  ```
- Wait for Vercel verification email (5–60 minutes).
- Verify https://underlandex.com serves the Vercel landing. Verify https://app.underlandex.com serves the explorer.

## Post-cutover

- Update Google Search Console: re-add `underlandex.com` if needed; add `app.underlandex.com` as new property.
- Update PostHog project URL allowlist: add `app.underlandex.com`.
- Update Resend domain: verify DNS is still correct (records aren't on the @-host).
- Update marketing copy / external links / Twitter / LinkedIn pointing at `underlandex.com` — they continue to work, but explorer-specific deep-links (`/projects/...`, `/companies/...`) need to move to `app.underlandex.com/...`.

## Rollback

If anything breaks post-DNS-flip:

- Cloudflare → revert A/CNAME records for `@` and `www` back to original ECS ALB targets.
- Within 5 min, traffic returns to ECS.

## Why this isn't fully automated

- Cloudflare API token from the underlandex repo is expired/invalid (`Invalid access token`).
- AWS Auth0 callback updates need Auth0 dashboard or M2M (creds in main repo's CLAUDE.md but they touch live auth).
- DNS cutover is high blast radius — must be done with the existing app already moved.
