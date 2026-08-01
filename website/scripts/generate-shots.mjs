import sharp from 'sharp';
import { stat } from 'node:fs/promises';

/**
 * AVIF and WebP variants of the marketing screenshots, PNG kept as the final
 * fallback. A page whose whole argument is that images should be smaller can't
 * be the thing shipping megabyte PNGs.
 *
 * These are UI screenshots — flat fields and crisp text, the case lossy codecs
 * handle worst — so chroma stays unsubsampled and quality sits high enough that
 * glyph edges survive. Dimensions are never touched: the .mk-shot frame pins an
 * aspect-ratio per breakpoint, and a variant of a different size would crop.
 */
const SHOTS = ['app-dark-shot', 'app-light-shot', 'app-mobile-dark'];

const AVIF = { quality: 60, effort: 9, chromaSubsampling: '4:4:4' };
const WEBP = { quality: 85, effort: 6, smartSubsample: true };

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

let before = 0;
let after = 0;

for (const name of SHOTS) {
  const png = `public/app/${name}.png`;
  const src = sharp(png);
  const { width, height } = await src.metadata();

  await src.clone().avif(AVIF).toFile(`public/app/${name}.avif`);
  await src.clone().webp(WEBP).toFile(`public/app/${name}.webp`);

  // no resize was requested, but assert it rather than assume it: a variant
  // that drifts by a pixel silently breaks the frame's aspect-ratio
  for (const ext of ['avif', 'webp']) {
    const out = await sharp(`public/app/${name}.${ext}`).metadata();
    if (out.width !== width || out.height !== height) {
      throw new Error(
        `${name}.${ext} is ${out.width}x${out.height}, expected ${width}x${height}`
      );
    }
  }

  const [p, a, w] = await Promise.all(
    ['png', 'avif', 'webp'].map((ext) => stat(`public/app/${name}.${ext}`).then((s) => s.size))
  );
  before += p;
  after += a;
  console.log(
    `${name}  ${width}x${height}  png ${kb(p)} -> avif ${kb(a)} (${((1 - a / p) * 100).toFixed(0)}% off), webp ${kb(w)}`
  );
}

console.log(`\nwire bytes, modern browser: ${kb(before)} png -> ${kb(after)} avif`);
