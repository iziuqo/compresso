import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isHeicSource, sniffHeicMagic } from '../src/heic.js';

const HEIC_DIR = fileURLToPath(new URL('../../../_assets/heic', import.meta.url));
const hasCorpus = existsSync(HEIC_DIR);

function ftypBox(brand) {
  const bytes = new Uint8Array(12);
  bytes.set([0x00, 0x00, 0x00, 0x18], 0); // box size, arbitrary/irrelevant here
  bytes.set([0x66, 0x74, 0x79, 0x70], 4); // "ftyp"
  for (let i = 0; i < 4; i++) bytes[8 + i] = brand.charCodeAt(i);
  return bytes;
}

describe('sniffHeicMagic', () => {
  it('confirms a real HEIC ftyp brand ("heic")', async () => {
    await expect(sniffHeicMagic(new Blob([ftypBox('heic')]))).resolves.toBe(true);
  });

  it('confirms the HEIF sequence brand ("hevc")', async () => {
    await expect(sniffHeicMagic(new Blob([ftypBox('hevc')]))).resolves.toBe(true);
  });

  it('rejects a well-formed ftyp box with an unrelated brand (e.g. MP4)', async () => {
    await expect(sniffHeicMagic(new Blob([ftypBox('isom')]))).resolves.toBe(false);
  });

  it('rejects bytes with no ftyp box at all', async () => {
    // This is the regression case for the actual vulnerability: an arbitrary,
    // untyped, unnamed blob that isHeicSource()'s permissive fallback would
    // previously have routed straight into the WASM HEIC decoder unconfirmed.
    const arbitrary = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    await expect(sniffHeicMagic(new Blob([arbitrary]))).resolves.toBe(false);
  });

  it('rejects a JPEG\'s real header bytes', async () => {
    const jpegHead = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    await expect(sniffHeicMagic(new Blob([jpegHead]))).resolves.toBe(false);
  });

  it('never throws on a too-short blob', async () => {
    await expect(sniffHeicMagic(new Blob([new Uint8Array([1, 2, 3])]))).resolves.toBe(false);
  });
});

describe('isHeicSource — unchanged, still deliberately permissive for untyped/unnamed blobs', () => {
  it('treats an untyped, unnamed blob as a HEIC candidate (unchanged from before this fix)', () => {
    // Confirms the fix lives at the decode()/sniffHeicMagic layer, not here — this
    // function's contract (cheap, synchronous, no bytes read) is unchanged.
    expect(isHeicSource(new Blob([new Uint8Array([1, 2, 3])]))).toBe(true);
  });
});

describe.skipIf(!hasCorpus)('sniffHeicMagic — real corpus (_assets/heic, local-only)', () => {
  it('confirms every real HEIC fixture in the corpus', async () => {
    for (const name of readdirSync(HEIC_DIR).filter((n) => !n.startsWith('.'))) {
      const blob = new Blob([readFileSync(`${HEIC_DIR}/${name}`)]);
      await expect(sniffHeicMagic(blob), name).resolves.toBe(true);
    }
  });
});
