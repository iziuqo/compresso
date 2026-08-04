import { beforeEach, describe, expect, it, vi } from 'vitest';

// Satisfies compress()'s environment guard so the tests below can reach the
// pixel-dimension guard they're actually exercising.
vi.stubGlobal('Image', class {});

// The pixel guard's control flow — "does decode() get called, and when" — is
// what's under test here, not real image decoding. Mocking platform.js (which
// resize.js's `createCanvas` also imports, by the same resolved module) keeps
// these tests in plain Node with no real canvas/image work.
vi.mock('../src/platform.js', () => ({
  decode: vi.fn(),
  encode: vi.fn(),
  ensureCapabilities: vi.fn().mockResolvedValue({ avif: false, webp: false }),
  capabilities: () => ({ avif: false, webp: false }),
  createCanvas: vi.fn(),
}));

const { decode } = await import('../src/platform.js');
const { compress } = await import('../src/compress.js');

const DECODE_REACHED = new Error('DECODE_REACHED'); // sentinel: proves control flow got past the guard

function pngWithDimensions(width, height) {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52], 0);
  b[16] = (width >>> 24) & 0xff; b[17] = (width >>> 16) & 0xff; b[18] = (width >>> 8) & 0xff; b[19] = width & 0xff;
  b[20] = (height >>> 24) & 0xff; b[21] = (height >>> 16) & 0xff; b[22] = (height >>> 8) & 0xff; b[23] = height & 0xff;
  return new Blob([b], { type: 'image/png' });
}

beforeEach(() => {
  decode.mockReset();
  decode.mockRejectedValue(DECODE_REACHED);
});

describe('compress() — pre-decode pixel guard (Blob/File sources)', () => {
  it('rejects a header-declared oversized PNG before calling decode()', async () => {
    await expect(compress(pngWithDimensions(20000, 20000))).rejects.toMatchObject({ kind: 'too-large' });
    expect(decode).not.toHaveBeenCalled();
  });

  it('lets a normally-sized PNG through to decode()', async () => {
    await expect(compress(pngWithDimensions(400, 300))).rejects.toBe(DECODE_REACHED);
    expect(decode).toHaveBeenCalledTimes(1);
  });
});

describe('compress() — post-decode pixel guard (every source, incl. URL strings)', () => {
  it('rejects when decode() itself reports an oversized image', async () => {
    decode.mockResolvedValue({ image: {}, width: 20000, height: 20000 });
    // A string URL source skips the pre-decode probe entirely (it only applies to
    // Blob/File sources), isolating this test to the post-decode stage alone.
    await expect(compress('https://example.com/photo.jpg')).rejects.toMatchObject({ kind: 'too-large' });
  });

  it('proceeds past the guard when decode() reports a normal size', async () => {
    decode.mockResolvedValue({ image: {}, width: 400, height: 300 });
    // Nothing here mocks resize/encode, so the pipeline is expected to fail past
    // the guard — the point is that it fails there, not at the guard itself.
    await expect(compress('https://example.com/photo.jpg')).rejects.not.toMatchObject({ kind: 'too-large' });
  });
});
