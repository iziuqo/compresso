import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

/**
 * The Compresso mark: two plates closing on each other. Same glyph as the app,
 * so the tab icon, the installed icon, and the wordmark in the header are one
 * shape wherever you meet the product.
 */
const glyph = (ground, ink, k = 1) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${ground}"/>
  <g transform="translate(256 256) scale(${k}) translate(-256 -256)">
    <path d="M104 128 H408 L332 236 H180 Z" fill="${ink}"/>
    <path d="M104 384 H408 L332 276 H180 Z" fill="${ink}"/>
  </g>
</svg>`;

const BLACK = '#000000', WHITE = '#FFFFFF';
const full = Buffer.from(glyph(BLACK, WHITE));
const maskable = Buffer.from(glyph(BLACK, WHITE, 0.72));

await mkdir('public', { recursive: true });
for (const [name, src, size] of [
  ['icon-192.png', full, 192],
  ['icon-512.png', full, 512],
  ['icon-maskable-192.png', maskable, 192],
  ['icon-maskable-512.png', maskable, 512],
  ['apple-touch-icon.png', full, 180],
]) {
  await sharp(src).resize(size, size).png({ compressionLevel: 9 }).toFile(`public/${name}`);
}
await writeFile('public/favicon.svg', glyph(BLACK, WHITE).trim() + '\n');
await writeFile('public/icon-source.svg', glyph(BLACK, WHITE).trim() + '\n');
await writeFile('public/icon-maskable-source.svg', glyph(BLACK, WHITE, 0.72).trim() + '\n');
// the wordmark logo: transparent ground so it sits on any surface
await writeFile(
  'public/logo.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <path d="M104 128 H408 L332 236 H180 Z" fill="currentColor"/>
  <path d="M104 384 H408 L332 276 H180 Z" fill="currentColor"/>
</svg>\n`
);
console.log('icons written');
