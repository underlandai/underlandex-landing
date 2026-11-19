// Generates the favicon set in public/ from the UnderlandEX mark.
// Run after the mark changes: node scripts/build-brand-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const markRaw = fs.readFileSync(path.join(root, 'src/assets/images/underlandex/mark.svg'), 'utf8');
const pub = (f) => path.join(root, 'public', f);

const paths = [...markRaw.matchAll(/<path\b[^>]*>/g)]
  .map((m) => {
    const fill = /fill:(#[0-9a-fA-F]{3,8})/.exec(m[0])?.[1];
    const d = /\sd="([^"]+)"/.exec(m[0])?.[1];
    return fill && d ? `<path fill="${fill}" d="${d.replace(/\s+/g, ' ').trim()}"/>` : '';
  })
  .join('');

const W = 94.394463;
const H = 94.87484;
// The mark centred on a square canvas. `scale` is the share of the canvas it fills.
const svg = (scale, bg) => {
  const size = 100;
  const k = (size * scale) / Math.max(W, H);
  const tx = (size - W * k) / 2;
  const ty = (size - H * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${
    bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''
  }<g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${k.toFixed(5)})">${paths}</g></svg>`;
};

const png = (source, size) => sharp(Buffer.from(source), { density: 1200 }).resize(size, size).png().toBuffer();

// ICO container holding PNG images (supported by every current browser).
const ico = (images) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size === 256 ? 0 : size, 0);
    e.writeUInt8(size === 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
};

const INK = '#0b1917';
const transparent = svg(0.96);

fs.writeFileSync(pub('favicon.svg'), transparent + '\n');
fs.writeFileSync(
  pub('favicon.ico'),
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(transparent, size) }))))
);
fs.writeFileSync(pub('favicon-16x16.png'), await png(transparent, 16));
fs.writeFileSync(pub('favicon-32x32.png'), await png(transparent, 32));
// Touch and home-screen icons: mark on the brand's dark ground, inside the maskable safe zone.
fs.writeFileSync(pub('apple-touch-icon.png'), await png(svg(0.66, INK), 180));
fs.writeFileSync(pub('android-chrome-192x192.png'), await png(svg(0.62, INK), 192));
fs.writeFileSync(pub('android-chrome-512x512.png'), await png(svg(0.62, INK), 512));
fs.writeFileSync(
  pub('site.webmanifest'),
  JSON.stringify(
    {
      name: 'UnderlandEX',
      short_name: 'UnderlandEX',
      icons: [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
      theme_color: INK,
      background_color: INK,
      display: 'browser',
      start_url: '/',
    },
    null,
    2
  ) + '\n'
);
console.log('favicons written to public/');
