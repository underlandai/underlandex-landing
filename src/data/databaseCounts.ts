// The database counts printed on this site, read from the product when a page is rendered.
// Source: GET https://app.underlandex.com/api/ux/stats/database (open, counts only; each figure
// carries its own definition and "as at" time). Nothing on the pages is a hard-coded count any more.
//
//   assets     figures.mineral_sites.value       mines, deposits, prospects and occurrences in the registers
//   companies  figures.companies.value           companies joined to a holder, owner, author or issuer
//   tenements  figures.tenements.value           tenements in the registers' current records
//   estimates  figures.resource_estimates.value  one site and one estimate date with a resource line
//
// If the product does not answer in time, the page shows the last figures it gave, below, with
// their date: never an empty band, and never older than this file. Update LAST when deploying.

export interface DatabaseCounts {
  assets: number;
  companies: number;
  tenements: number;
  estimates: number;
  asAt: string;
  live: boolean;
}

const ROUTE = 'https://app.underlandex.com/api/ux/stats/database';

/** The route's answer of 26/11/2026 14:36 UTC. */
const LAST: DatabaseCounts = {
  assets: 550446,
  companies: 12128,
  tenements: 584457,
  estimates: 14688,
  asAt: '2026-11-26T14:36:00Z',
  live: false,
};

const KEEP_MS = 60_000;
let kept: { at: number; counts: DatabaseCounts } | null = null;

const whole = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null;

export async function getDatabaseCounts(): Promise<DatabaseCounts> {
  if (kept && Date.now() - kept.at < KEEP_MS) return kept.counts;
  let counts = kept?.counts ?? LAST;
  try {
    const res = await fetch(ROUTE, { signal: AbortSignal.timeout(5000), headers: { accept: 'application/json' } });
    if (res.ok) {
      const body = await res.json();
      const f = body?.figures ?? {};
      const assets = whole(f.mineral_sites?.value);
      const companies = whole(f.companies?.value);
      const tenements = whole(f.tenements?.value);
      const estimates = whole(f.resource_estimates?.value);
      // all four or none: the page never mixes live figures with kept ones
      if (assets && companies && tenements && estimates) {
        counts = { assets, companies, tenements, estimates, asAt: String(body.as_at ?? ''), live: true };
        kept = { at: Date.now(), counts };
      }
    }
  } catch {
    // the kept figures stand
  }
  return counts;
}

export const fmtCount = (n: number) => n.toLocaleString('en-AU');
