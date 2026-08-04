import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { probeDimensions } from '../src/probe.js';

const ASSETS_DIR = fileURLToPath(new URL('../../../_assets', import.meta.url));
const hasCorpus = existsSync(ASSETS_DIR);

function blobOf(path, type) {
  return new Blob([readFileSync(path)], { type });
}

function filesIn(dir) {
  return readdirSync(dir).filter((name) => !name.startsWith('.'));
}

describe('probeDimensions — synthetic fixtures (always run, no corpus needed)', () => {
  it('reads a PNG IHDR chunk', async () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // length + "IHDR"
      0x00, 0x00, 0x01, 0x90, // width = 400
      0x00, 0x00, 0x00, 0xc8, // height = 200
    ]);
    await expect(probeDimensions(new Blob([png]))).resolves.toEqual({ width: 400, height: 200 });
  });

  it('reads a JPEG SOF0 marker past a leading APP0 segment', async () => {
    // SOI, APP0 (16-byte segment, contents irrelevant), SOF0 declaring 300x150.
    const jpeg = new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0), // APP0, length 16
      0xff, 0xc0, 0x00, 0x0b, // SOF0, length 11
      0x08, // precision
      0x00, 0x96, // height = 150
      0x01, 0x2c, // width = 300
      0x03, // component count (irrelevant beyond this point)
    ]);
    await expect(probeDimensions(new Blob([jpeg]))).resolves.toEqual({ width: 300, height: 150 });
  });

  it('reads a lossy (VP8) WebP header', async () => {
    const b = new Uint8Array(30);
    b.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
    b.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
    b.set([0x56, 0x50, 0x38, 0x20], 12); // "VP8 "
    // 14-bit width/height, little-endian, at offsets 26/28.
    b[26] = 100 & 0xff; b[27] = (100 >> 8) & 0x3f;
    b[28] = 50 & 0xff; b[29] = (50 >> 8) & 0x3f;
    await expect(probeDimensions(new Blob([b]))).resolves.toEqual({ width: 100, height: 50 });
  });

  it('reads a lossless (VP8L) WebP header', async () => {
    const b = new Uint8Array(30); // probeWebp requires 30 bytes for any sub-format
    b.set([0x52, 0x49, 0x46, 0x46], 0);
    b.set([0x57, 0x45, 0x42, 0x50], 8);
    b.set([0x56, 0x50, 0x38, 0x4c], 12); // "VP8L"
    // width-1 (14 bits) | height-1 (14 bits) | alpha (1) | version (3), packed LE across 4 bytes.
    const widthLess1 = 639; // width 640
    const heightLess1 = 479; // height 480
    const packed = (widthLess1 & 0x3fff) | ((heightLess1 & 0x3fff) << 14);
    b[21] = packed & 0xff;
    b[22] = (packed >> 8) & 0xff;
    b[23] = (packed >> 16) & 0xff;
    b[24] = (packed >> 24) & 0xff;
    await expect(probeDimensions(new Blob([b]))).resolves.toEqual({ width: 640, height: 480 });
  });

  it('reads an extended (VP8X) WebP header', async () => {
    const b = new Uint8Array(30);
    b.set([0x52, 0x49, 0x46, 0x46], 0);
    b.set([0x57, 0x45, 0x42, 0x50], 8);
    b.set([0x56, 0x50, 0x38, 0x58], 12); // "VP8X"
    const widthLess1 = 1919; // width 1920
    const heightLess1 = 1079; // height 1080
    b[24] = widthLess1 & 0xff; b[25] = (widthLess1 >> 8) & 0xff; b[26] = (widthLess1 >> 16) & 0xff;
    b[27] = heightLess1 & 0xff; b[28] = (heightLess1 >> 8) & 0xff; b[29] = (heightLess1 >> 16) & 0xff;
    await expect(probeDimensions(new Blob([b]))).resolves.toEqual({ width: 1920, height: 1080 });
  });

  it('declares an oversized PNG so the caller can reject it', async () => {
    // 20000x20000 = 400 MP, well past the library's 100 MP default — the point of
    // the probe is that this is detectable from 24 bytes, no decode required.
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x4e, 0x20, // width = 20000
      0x00, 0x00, 0x4e, 0x20, // height = 20000
    ]);
    const dims = await probeDimensions(new Blob([png]));
    expect(dims.width * dims.height).toBeGreaterThan(100_000_000);
  });

  it('returns null for bytes that match none of the three formats', async () => {
    await expect(probeDimensions(new Blob([new Uint8Array([1, 2, 3, 4, 5])]))).resolves.toBeNull();
  });

  it('returns null for a PNG signature with no IHDR following it', async () => {
    const truncated = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    await expect(probeDimensions(new Blob([truncated]))).resolves.toBeNull();
  });

  it('never throws on an empty blob', async () => {
    await expect(probeDimensions(new Blob([]))).resolves.toBeNull();
  });
});

describe.skipIf(!hasCorpus)('probeDimensions — real corpus (_assets/, local-only)', () => {
  it('recognizes every real JPEG with plausible, non-oversized dimensions', async () => {
    const dir = fileURLToPath(new URL('../../../_assets/jpg', import.meta.url));
    for (const name of filesIn(dir)) {
      const dims = await probeDimensions(blobOf(`${dir}/${name}`, 'image/jpeg'));
      expect(dims, `${name} should be recognized as a JPEG`).not.toBeNull();
      expect(dims.width, name).toBeGreaterThan(0);
      expect(dims.height, name).toBeGreaterThan(0);
      expect(dims.width * dims.height, `${name} must not false-positive as oversized`).toBeLessThan(100_000_000);
    }
  });

  it('recognizes every real PNG with plausible, non-oversized dimensions', async () => {
    const dir = fileURLToPath(new URL('../../../_assets/png', import.meta.url));
    for (const name of filesIn(dir)) {
      const dims = await probeDimensions(blobOf(`${dir}/${name}`, 'image/png'));
      expect(dims, `${name} should be recognized as a PNG`).not.toBeNull();
      expect(dims.width, name).toBeGreaterThan(0);
      expect(dims.height, name).toBeGreaterThan(0);
      expect(dims.width * dims.height, `${name} must not false-positive as oversized`).toBeLessThan(100_000_000);
    }
  });

  it('reads the known-good EXIF fixture at its stored (pre-rotation) resolution', async () => {
    // Documented in PWA_PLAN.md §14: stored 1280x768, Orientation 6, displayed
    // upright as 768x1280 only after the *decoder* applies the rotation — the raw
    // SOF marker this probe reads always reports the stored, unrotated values.
    const dir = fileURLToPath(new URL('../../../_assets/jpg', import.meta.url));
    const dims = await probeDimensions(blobOf(`${dir}/exif-orient-6.jpg`, 'image/jpeg'));
    expect(dims).toEqual({ width: 1280, height: 768 });
  });
});
