import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../src/assets/images/underlandex');

const targets = [
  // Explorer lives at app.underlandex.com (underlandex.com is this landing site)
  { url: 'https://app.underlandex.com/', out: 'preview-explorer.png', waitFor: 3000, scrollTo: 300 },
  // M&A dashboard: KPIs, deal charts and the commodity x quarter heatmap, built from the curated
  // transactions table. The root URL redirects to /news, a live feed that can be empty.
  {
    url: 'https://mna.underlandex.com/dashboard',
    out: 'preview-mna.png',
    waitFor: 4000,
    scrollTo: 0,
    ready: { selector: 'tbody tr', minCount: 5 },
    emptyText: ['No announcements found', 'No data', 'No deals'],
  },
];

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  for (const { url, out, waitFor, scrollTo, ready, emptyText = [] } of targets) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    console.log(`→ ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    if (ready) {
      // wait for the data to render; a timeout here fails the capture
      await page.waitForFunction(
        (sel, n) => document.querySelectorAll(sel).length >= n,
        { timeout: 30000 },
        ready.selector,
        ready.minCount
      );
    }
    await new Promise((r) => setTimeout(r, waitFor));
    if (scrollTo) await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
    await new Promise((r) => setTimeout(r, 800));
    // never save an empty-state picture: fail and keep the previous image instead
    const text = await page.evaluate(() => document.body.innerText);
    const hit = emptyText.find((t) => text.includes(t));
    if (hit) throw new Error(`${url} shows an empty state ("${hit}"); not saving ${out}`);
    if (ready) {
      const count = await page.evaluate((sel) => document.querySelectorAll(sel).length, ready.selector);
      if (count < ready.minCount)
        throw new Error(`${url} has ${count} "${ready.selector}" (< ${ready.minCount}); not saving ${out}`);
    }
    const outPath = path.join(outDir, out);
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
    console.log(`   ✓ saved ${outPath}`);
    await page.close();
  }
} finally {
  await browser.close();
}
