// Regenerates benchmark/corpus/ — synthetic, non-personal images that stress
// the same compression paths real photos would (high-resolution JPEG,
// transparent PNG, text-heavy screenshot, already-optimized WebP), without
// the license ambiguity of sourcing real ones. See benchmark/README.md for
// what each file is for. Rerun with:
//   node packages/compresso/scripts/generate-benchmark-corpus.mjs
//
// Runs the drawing in a real Chromium page (via Playwright, already a
// devDependency here for the browser test suite) because `canvas.toBlob`
// needs an actual browser — Node has no Canvas implementation of its own,
// same reason compress() itself can't run outside a browser.
import { chromium } from 'playwright';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const corpusDir = fileURLToPath(new URL('../../../benchmark/corpus/', import.meta.url));
await mkdir(corpusDir, { recursive: true });

async function drawToFile(drawFnSource, { width, height, mimeType, quality, fileName }) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const dataUrl = await page.evaluate(
    async ({ drawFnSource, width, height, mimeType, quality }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      // eslint-disable-next-line no-new-func -- reconstructing the function
      // passed in from Node; page.evaluate can only serialize source, not closures.
      const draw = new Function('ctx', 'width', 'height', drawFnSource);
      draw(canvas.getContext('2d'), width, height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
      // FileReader's own base64 encoding avoids spreading the byte array as
      // call arguments (blows the stack past a few thousand bytes).
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    },
    { drawFnSource, width, height, mimeType, quality },
  );
  await browser.close();
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  await writeFile(join(corpusDir, fileName), Buffer.from(base64, 'base64'));
  console.log(`wrote ${fileName}`);
}

// A smooth gradient alone would compress unrealistically well — the noise
// band approximates the fine detail a real photo has, so this stresses JPEG
// quality search the way a real high-resolution photo would.
await drawToFile(
  `
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#4a90d9');
  gradient.addColorStop(1, '#dceeff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    imageData.data[i] += noise;
    imageData.data[i + 1] += noise;
    imageData.data[i + 2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);
  ctx.fillStyle = 'rgba(255, 220, 120, 0.9)';
  ctx.beginPath();
  ctx.arc(width * 0.75, height * 0.25, Math.min(width, height) * 0.12, 0, Math.PI * 2);
  ctx.fill();
  `,
  { width: 1600, height: 1200, mimeType: 'image/jpeg', quality: 0.85, fileName: 'landscape.jpg' },
);

// Alpha-channel shapes on a transparent background — exercises PNG's
// transparency preservation and the backgroundColor-for-JPEG-conversion path.
await drawToFile(
  `
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(233, 30, 99, 0.85)';
  ctx.beginPath();
  ctx.arc(width * 0.35, height * 0.5, width * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(33, 150, 243, 0.6)';
  ctx.fillRect(width * 0.4, height * 0.15, width * 0.45, height * 0.7);
  `,
  { width: 800, height: 800, mimeType: 'image/png', fileName: 'transparent-graphic.png' },
);

// Flat white background + many lines of small text, the way a code editor or
// docs-page screenshot looks — a real differentiator, since text ringing
// makes this category compress poorly as JPEG but well as PNG.
await drawToFile(
  `
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '14px monospace';
  for (let line = 0; line < 45; line++) {
    const indent = (line % 5) * 20;
    ctx.fillText('const example = compress(file, { quality: 0.8 });', 20 + indent, 20 + line * 16);
  }
  `,
  { width: 1280, height: 800, mimeType: 'image/png', fileName: 'screenshot.png' },
);

// Same kind of photographic content as landscape.jpg, but encoded directly to
// WebP at an efficient quality — an already-optimized source a naive
// re-encode could inflate; exercises the never-bigger guarantee (see the
// regression test pinned in compress-never-bigger.test.js).
await drawToFile(
  `
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#2d5f2d');
  gradient.addColorStop(1, '#8fbf8f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  `,
  { width: 1200, height: 800, mimeType: 'image/webp', quality: 0.8, fileName: 'already-optimized.webp' },
);

// No browser can encode HEIC (it's Apple's format, decode-only via WASM
// elsewhere in this repo) — reusing the existing synthetic, non-personal test
// fixture is the honest stand-in until a real device contributes one; see
// benchmark/README.md's open-gap note.
await copyFile(
  fileURLToPath(new URL('../test/fixtures/sample.heic', import.meta.url)),
  join(corpusDir, 'sample.heic'),
);
console.log('wrote sample.heic (copied from test/fixtures/)');
