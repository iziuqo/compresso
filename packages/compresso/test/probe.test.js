import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isAnimated, probeDimensions, sniffFormat } from '../src/probe.js';

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

describe('sniffFormat — what the bytes are, whatever their label says (COR-02)', () => {
  const ascii = (text) => [...text].map((c) => c.charCodeAt(0));
  const blob = (...bytes) => new Blob([new Uint8Array(bytes.flat())], { type: 'image/avif' });
  // An ftyp box: its size, the major brand, a minor version, then the compatible brands.
  const ftyp = (major, ...compatible) => blob([0, 0, 0, 16 + 4 * compatible.length], ascii('ftyp'), ascii(major), [0, 0, 0, 0], ...compatible.map(ascii));

  it('names each format by its magic numbers', async () => {
    await expect(sniffFormat(blob([0xff, 0xd8, 0xff, 0xe0]))).resolves.toBe('jpeg');
    await expect(sniffFormat(blob([0x89], ascii('PNG\r\n\x1a\n')))).resolves.toBe('png');
    await expect(sniffFormat(blob(ascii('GIF89a')))).resolves.toBe('gif');
    await expect(sniffFormat(blob(ascii('RIFF'), [0x24, 0, 0, 0], ascii('WEBPVP8 ')))).resolves.toBe('webp');
  });

  it('tells AVIF from HEIC by the ftyp brands', async () => {
    await expect(sniffFormat(ftyp('avif', 'mif1', 'miaf'))).resolves.toBe('avif');
    await expect(sniffFormat(ftyp('avis'))).resolves.toBe('avif');
    await expect(sniffFormat(ftyp('heic'))).resolves.toBe('heic');
    await expect(sniffFormat(ftyp('hevc'))).resolves.toBe('heic');
    await expect(sniffFormat(ftyp('mif1', 'heic'))).resolves.toBe('heic');
  });

  it('finds an AVIF brand anywhere in the ftyp box, not just the first few', async () => {
    await expect(sniffFormat(ftyp('mif1', 'miaf', 'MA1B', 'iso8', 'avif'))).resolves.toBe('avif');
  });

  it('reads no brands past the ftyp box', async () => {
    const box = await ftyp('isom', 'iso2').arrayBuffer();
    const next = new Uint8Array([0, 0, 0, 16, ...ascii('free'), ...ascii('heicavif')]);
    await expect(sniffFormat(new Blob([box, next]))).resolves.toBeNull();
  });

  it('does not take another ISOBMFF file, such as an MP4, for an image', async () => {
    const mp4 = blob([0, 0, 0, 0x18], ascii('ftypisom'), [0, 0, 2, 0], ascii('isomiso2'));
    await expect(sniffFormat(mp4)).resolves.toBeNull();
  });

  it('returns null for bytes it does not know, and for nothing at all', async () => {
    await expect(sniffFormat(blob(ascii('<svg xmlns')))).resolves.toBeNull();
    await expect(sniffFormat(new Blob([]))).resolves.toBeNull();
    await expect(sniffFormat(blob(ascii('RIFF'), [0, 0, 0, 0], ascii('WAVE')))).resolves.toBeNull();
  });
});

describe('isAnimated — more than one frame, read from headers (COR-16)', () => {
  const fixture = (name) => new Blob([readFileSync(new URL(`fixtures/${name}`, import.meta.url))]);
  const animated = async (name) => isAnimated(fixture(name), (await sniffFormat(fixture(name))));

  it('finds the frames of an animated GIF, APNG and animated WebP', async () => {
    for (const name of ['animated.gif', 'animated.png', 'animated.webp']) {
      await expect(animated(name), name).resolves.toBe(true);
    }
  });

  it('never takes a still image for an animation', async () => {
    // photo-gps.webp is an extended WebP (VP8X) too, for its EXIF.
    for (const name of ['photo.gif', 'sample.png', 'photo-gps.webp', 'photo.jpg', 'sample.avif', 'vector.svg']) {
      await expect(animated(name), name).resolves.toBe(false);
    }
  });

  it('counts a GIF\'s frames, so one that plays once, with no loop extension, is animated too', async () => {
    const bytes = new Uint8Array(await fixture('animated.gif').arrayBuffer());
    const loop = new TextDecoder('latin1').decode(bytes).indexOf('NETSCAPE2.0') - 3; // 0x21 0xFF 0x0B, then the name
    expect(loop).toBeGreaterThan(0);
    // The loop extension: its 3-byte header, an 11-byte name, a 4-byte sub-block and a terminator.
    const once = new Blob([bytes.subarray(0, loop), bytes.subarray(loop + 19)]);
    expect(new TextDecoder('latin1').decode(await once.arrayBuffer())).not.toContain('NETSCAPE');
    await expect(isAnimated(once, 'gif')).resolves.toBe(true);
  });

  it('stops at a truncated file instead of reading past its end', async () => {
    const bytes = new Uint8Array(await fixture('animated.gif').arrayBuffer());
    await expect(isAnimated(new Blob([bytes.subarray(0, 40)]), 'gif')).resolves.toBe(false);
    await expect(isAnimated(new Blob([bytes.subarray(0, 6)]), 'gif')).resolves.toBe(false);
    await expect(isAnimated(new Blob([]), 'png')).resolves.toBe(false);
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
