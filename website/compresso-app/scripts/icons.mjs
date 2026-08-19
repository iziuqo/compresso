import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

/**
 * The mark: two plates closing on each other.
 *
 * Every edge is straight and every corner is hard, which is what the previous
 * ellipse was not. Two solid trapezoids, tips facing, with a gap between them:
 * it reads as pressure at 512px and it still reads as pressure at 16px, where
 * the wide flat bases are the last thing to survive. Rendered against opposed
 * triangles, a rectangle-between-rules, and a descending bar stack before it
 * was chosen.
 *
 * The same glyph runs in the header, where the two plates close once on load.
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

await mkdir('public/icons', { recursive: true });

const full = Buffer.from(glyph(BLACK, WHITE));
// maskable icons get cropped to a circle by the OS, so the mark pulls in
const maskable = Buffer.from(glyph(BLACK, WHITE, 0.72));

for (const [name, src, size] of [
  ['icon-192.png', full, 192],
  ['icon-512.png', full, 512],
  ['maskable-192.png', maskable, 192],
  ['maskable-512.png', maskable, 512],
  ['apple-touch-icon.png', full, 180],
]) {
  await sharp(src).resize(size, size).png({ compressionLevel: 9 }).toFile(`public/icons/${name}`);
}

await writeFile('public/icons/favicon.svg', glyph(BLACK, WHITE).trim() + '\n');
console.log('icons written');
