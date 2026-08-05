import { beforeEach, describe, expect, it, vi } from 'vitest';

// Satisfies compress()'s environment guard so the tests below reach the real
// shrinkToFit/never-bigger logic under test.
vi.stubGlobal('Image', class {});

// This suite exercises shrinkToFit's own quality-floor fallback (issue #6): when
// no quality in the binary search — down to and including the final unconditional
// `encode(canvas, mimeType, 0.1)` — produces a blob at or under the source's size,
// compress() must still never hand back something bigger than the input. Mocking
// platform.js lets encode() simulate a source that's genuinely incompressible at
// every quality, deterministically and without a real image fixture.
vi.mock('../src/platform.js', () => ({
  decode: vi.fn(),
  encode: vi.fn(),
  ensureCapabilities: vi.fn().mockResolvedValue({ avif: false, webp: false }),
  capabilities: () => ({ avif: false, webp: false }),
  createCanvas: vi.fn(() => ({ canvas: {}, ctx: { drawImage: vi.fn(), fillRect: vi.fn() } })),
}));

const { decode, encode } = await import('../src/platform.js');
const { compress } = await import('../src/compress.js');

function blobOfSize(size, type) {
  return new Blob([new Uint8Array(size)], { type });
}

beforeEach(() => {
  decode.mockReset();
  encode.mockReset();
  decode.mockResolvedValue({ image: {}, width: 10, height: 10 });
});

describe('compress() — never-bigger guarantee under shrinkToFit\'s quality-floor fallback', () => {
  it('falls back to the original bytes when no quality beats an incompressible source', async () => {
    const originalSize = 1000;
    const source = blobOfSize(originalSize, 'image/jpeg');

    // Every quality — including shrinkToFit's final q=0.1 floor — encodes bigger
    // than the source. No quality level should ever let this test "accidentally"
    // pass by finding something that fits.
    encode.mockImplementation(async () => blobOfSize(originalSize + 500, 'image/jpeg'));

    const result = await compress(source, { format: 'jpeg' });

    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
    expect(result.compressedSize).toBe(originalSize);
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('still prefers a real quality-search win when one exists under the ceiling', async () => {
    const originalSize = 1000;
    const source = blobOfSize(originalSize, 'image/jpeg');

    // First encode (at opts.quality) overshoots; a lower quality mid-search does
    // fit. The found-fitting blob should win over both the overshoot and the
    // source fallback — the fallback path must not shadow the normal search.
    encode.mockImplementation(async (_canvas, _mime, quality) =>
      blobOfSize(quality < 0.5 ? originalSize - 200 : originalSize + 500, 'image/jpeg')
    );

    const result = await compress(source, { format: 'jpeg' });

    expect(result.compressedSize).toBeLessThanOrEqual(originalSize);
    expect(result.compressedSize).toBe(originalSize - 200);
  });

  it('does not apply the source-bytes fallback to PNG, which is exempt from the size search', async () => {
    const originalSize = 1000;
    const source = blobOfSize(originalSize, 'image/png');

    // PNG ignores quality — shrinkToFit is never invoked for it — so even an
    // encode bigger than the source is returned as-is, by design.
    encode.mockImplementation(async () => blobOfSize(originalSize + 500, 'image/png'));

    const result = await compress(source, { format: 'png' });

    expect(result.compressedSize).toBe(originalSize + 500);
  });
});
