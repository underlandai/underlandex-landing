import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../src/assets/images/underlandex');

const targets = [
  { url: 'https://underlandex.com/', out: 'preview-explorer.png', waitFor: 3000, scrollTo: 300 },
  { url: 'https://mna.underlandex.com/', out: 'preview-mna.png', waitFor: 4000, scrollTo: 200 },
];

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  for (const { url, out, waitFor, scrollTo } of targets) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    console.log(`→ ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, waitFor));
    if (scrollTo) await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
    await new Promise((r) => setTimeout(r, 800));
    const outPath = path.join(outDir, out);
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1440, height: 900 } });
    console.log(`   ✓ saved ${outPath}`);
    await page.close();
  }
} finally {
  await browser.close();
}
