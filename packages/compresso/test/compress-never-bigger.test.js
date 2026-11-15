import { beforeEach, describe, expect, it, vi } from 'vitest';

// Satisfies compress()'s environment guard so the tests below reach the real
// planner and its never-bigger rule.
vi.stubGlobal('Image', class {});

// This suite exercises the never-bigger rule (issue #6): when no quality the
// planner tries produces a blob at or under the source's size, compress() must
// still never hand back something bigger than the input. Mocking platform.js
// lets encode() simulate a source that's genuinely incompressible at every
// quality, deterministically and without a real image fixture.
vi.mock('../src/platform.js', () => ({
  decode: vi.fn(),
  encode: vi.fn(),
  ensureCapabilities: vi.fn().mockResolvedValue({ avif: false, webp: false }),
  capabilities: vi.fn(() => ({ avif: false, webp: false })),
  createCanvas: vi.fn(() => ({ canvas: {}, ctx: { drawImage: vi.fn(), fillRect: vi.fn() } })),
}));

const { capabilities, decode, encode } = await import('../src/platform.js');
const { compress } = await import('../src/compress.js');

function blobOfSize(size, type) {
  return new Blob([new Uint8Array(size)], { type });
}

beforeEach(() => {
  decode.mockReset();
  encode.mockReset();
  decode.mockResolvedValue({ image: {}, width: 10, height: 10 });
});

describe('compress() — the never-bigger guarantee', () => {
  it('falls back to the original bytes when no quality beats an incompressible source', async () => {
    const originalSize = 1000;
    const source = blobOfSize(originalSize, 'image/jpeg');

    // Every quality encodes bigger than the source. No quality level should
    // ever let this test "accidentally" pass by finding something that fits.
    encode.mockImplementation(async () => blobOfSize(originalSize + 500, 'image/jpeg'));

    const result = await compress(source, { format: 'jpeg' });

    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
    expect(result.compressedSize).toBe(originalSize);
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('with a size target, still prefers a real quality-search win under the ceiling', async () => {
    const originalSize = 1000;
    const source = blobOfSize(originalSize, 'image/jpeg');

    // First encode (at opts.quality) overshoots; a lower quality mid-search does
    // fit. The found-fitting blob should win over both the overshoot and the
    // source fallback — the fallback path must not shadow the normal search.
    encode.mockImplementation(async (_canvas, _mime, quality) =>
      blobOfSize(quality < 0.5 ? originalSize - 200 : originalSize + 500, 'image/jpeg')
    );

    const result = await compress(source, { format: 'jpeg', maxSizeMB: 900 / 1024 / 1024 });

    expect(result.compressedSize).toBe(originalSize - 200);
    expect(result.missedTarget).toBe(false);
  });

  it('with no target or resize, returns the source after the one encode that cannot beat it (COR-05)', async () => {
    const originalSize = 1000;
    const source = blobOfSize(originalSize, 'image/jpeg');
    encode.mockImplementation(async (_canvas, _mime, quality) =>
      blobOfSize(quality < 0.5 ? originalSize - 200 : originalSize + 500, 'image/jpeg')
    );

    const result = await compress(source, { format: 'jpeg' });

    expect(result.blob).toBe(source);
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it('honours an asked conversion at the asked quality, even when the file grows (O4)', async () => {
    const originalSize = 1000;
    const source = blobOfSize(originalSize, 'image/webp');
    encode.mockImplementation(async (_canvas, _mime, quality) =>
      blobOfSize(quality < 0.5 ? originalSize - 200 : originalSize + 500, 'image/jpeg')
    );

    const result = await compress(source, { format: 'jpeg' });

    expect([result.kept, result.reason, result.compressedSize]).toEqual([false, null, originalSize + 500]);
    expect(result.savings, 'the result shows the file grew').toBeLessThan(0);
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it('with auto, a conversion still never grows: the source comes back, and says why', async () => {
    const source = blobOfSize(1000, 'image/webp');
    encode.mockImplementation(async () => blobOfSize(1500, 'image/jpeg'));

    const result = await compress(source);

    expect([result.blob, result.kept, result.reason, result.format, result.file.type]).toEqual([source, true, 'not-smaller', 'webp', 'image/webp']);
  });

  it('a kept HEIC keeps its own name and type, even untyped (COR-06)', async () => {
    const source = new File([new Uint8Array(1000)], 'IMG_0001.HEIC');
    encode.mockImplementation(async () => blobOfSize(1500, 'image/jpeg'));

    const result = await compress(source);

    expect([result.kept, result.format, result.mimeType, result.blob.type, result.file.name, result.file.type])
      .toEqual([true, 'heic', 'image/heic', 'image/heic', 'IMG_0001.HEIC', 'image/heic']);
  });

  it('names a kept source by its bytes, not its label or name (COR-06)', async () => {
    const jpeg = new Uint8Array(1000);
    jpeg.set([0xff, 0xd8, 0xff, 0xe0]);
    encode.mockImplementation(async () => blobOfSize(1500, 'image/jpeg'));

    const result = await compress(new File([jpeg], 'pic.png', { type: 'image/png' }));

    expect([result.kept, result.format, result.mimeType, result.blob.type, result.file.name])
      .toEqual([true, 'jpeg', 'image/jpeg', 'image/jpeg', 'pic.jpg']);
  });

  it('never names a kept source of a format it does not know after the target', async () => {
    encode.mockImplementation(async () => blobOfSize(1500, 'image/jpeg'));

    const typed = await compress(blobOfSize(1000, 'image/bmp'));
    const untyped = await compress(blobOfSize(1000, ''));

    expect([typed.kept, typed.format, typed.mimeType, typed.blob.type]).toEqual([true, 'bmp', 'image/bmp', 'image/bmp']);
    expect([untyped.kept, untyped.format, untyped.mimeType, untyped.blob.type]).toEqual([true, '', '', '']);
  });

  it('labels the blob as its bytes when the encoder returned another format (COR-02)', async () => {
    const png = new Uint8Array(500);
    png.set([0x89, 0x50, 0x4e, 0x47]);
    encode.mockImplementation(async () => new Blob([png], { type: 'image/jpeg' }));

    const result = await compress(blobOfSize(1000, 'image/webp'), { format: 'jpeg' });

    expect([result.format, result.mimeType, result.blob.type, result.file.type, result.reason])
      .toEqual(['png', 'image/png', 'image/png', 'image/png', 'unsupported-format']);
  });

  it('judges "already in the asked format" by the bytes, so an untyped JPEG never grows', async () => {
    const jpeg = new Uint8Array(1000);
    jpeg.set([0xff, 0xd8, 0xff, 0xe0]);
    encode.mockImplementation(async () => blobOfSize(1500, 'image/jpeg'));

    const result = await compress(new Blob([jpeg]), { format: 'jpeg' });

    expect([result.kept, result.reason, result.compressedSize]).toEqual([true, 'not-smaller', 1000]);
  });

  it('a format this browser can\'t encode falls back to the best one it can, and says so (O4)', async () => {
    encode.mockImplementation(async () => blobOfSize(500, 'image/jpeg'));

    const result = await compress(blobOfSize(1000, 'image/png'), { format: 'webp' });

    expect([result.format, result.mimeType, result.reason, result.file.name]).toEqual(['jpeg', 'image/jpeg', 'unsupported-format', 'image.jpg']);
  });

  for (const maxSizeMB of [undefined, null, 0, -1, Number.NaN]) {
    it(`treats maxSizeMB ${maxSizeMB} as no target`, async () => {
      const source = blobOfSize(1000, 'image/jpeg');
      encode.mockImplementation(async () => blobOfSize(800, 'image/jpeg'));

      const result = await compress(source, { format: 'jpeg', maxSizeMB });

      expect([result.compressedSize, result.missedTarget, result.width]).toEqual([800, false, 10]);
      expect(encode).toHaveBeenCalledTimes(1);
    });
  }

  it('does not apply the source-bytes fallback to PNG, which is exempt from the size search', async () => {
    const originalSize = 1000;
    const source = blobOfSize(originalSize, 'image/png');

    // PNG ignores quality, so with no size target even an encode bigger
    // than the source is returned as-is, by design.
    encode.mockImplementation(async () => blobOfSize(originalSize + 500, 'image/png'));

    const result = await compress(source, { format: 'png' });

    expect(result.compressedSize).toBe(originalSize + 500);
  });
});

describe('compress() — output inside real limits (COR-01)', () => {
  it('scales WebP past 16,383 px to fit, and reports the size encoded', async () => {
    capabilities.mockReturnValueOnce({ avif: false, webp: true });
    decode.mockResolvedValue({ image: {}, width: 800, height: 20000 });
    encode.mockImplementation(async () => blobOfSize(100, 'image/webp'));
    const result = await compress(blobOfSize(1000, 'image/png'), { format: 'webp' });
    expect([result.width, result.height]).toEqual([655, 16383]);
  });

  it('keeps every other format inside the 32,767 px edge every canvas holds', async () => {
    decode.mockResolvedValue({ image: {}, width: 40000, height: 400 });
    encode.mockImplementation(async () => blobOfSize(100, 'image/png'));
    const result = await compress(blobOfSize(1000, 'image/png'), { format: 'png' });
    expect([result.width, result.height]).toEqual([32767, 328]);
  });

  it('a kept source reports its own size, not the size it was scaled to', async () => {
    decode.mockResolvedValue({ image: {}, width: 40000, height: 400 });
    encode.mockImplementation(async () => blobOfSize(5000, 'image/jpeg'));
    const result = await compress(blobOfSize(1000, 'image/jpeg'), { format: 'jpeg' });
    expect(result.compressedSize).toBe(1000);
    expect([result.width, result.height]).toEqual([40000, 400]);
  });
});
