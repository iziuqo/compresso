import { afterEach, describe, expect, it, vi } from 'vitest';
import { __resetCapabilities, ensureCapabilities } from '../src/platform.js';
import { getBestFormat } from '../src/utils.js';

/**
 * The format proof as a worker runs it (plain Node has no `document`, so
 * platform.js takes the worker path): a fake `OffscreenCanvas` whose encoder
 * is the function under each test's control. The browser suite covers the
 * main thread against real encoders (test/browser/findings.test.js, CMP-16).
 */

const AVIF_HEAD = '\0\0\0\x1cftypavif\0\0\0\0avifmif1miaf';
const WEBP_HEAD = 'RIFF\0\0\0\0WEBPVP8 ';
const PNG_HEAD = '\x89PNG\r\n\x1a\n\0\0\0\rIHDR';

/** What an encode returns: bytes that start with `head`, `size` bytes in all. */
const output = (head, size) => ({ head, size });

/** A lossy encoder: the format's signature, and more bytes at a higher quality. */
const lossy = (head) => (quality) => output(head, 100 + Math.round(quality * 1000));

/** A blob of `output`'s bytes, labelled `type`, or `null` for no output. */
const blobOf = (output, type) =>
  output && new Blob([Uint8Array.from(output.head.padEnd(output.size, '\0'), (c) => c.charCodeAt(0))], { type });

function withEncoders(encoders) {
  vi.stubGlobal('OffscreenCanvas', class {
    getContext() {
      return { createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} };
    }
    async convertToBlob({ type, quality }) {
      // An engine without the encoder falls back to PNG, labelled as such.
      const encoder = encoders[type];
      return encoder ? blobOf(encoder(quality), type) : blobOf(output(PNG_HEAD, 3000), 'image/png');
    }
  });
  __resetCapabilities();
}

afterEach(() => {
  vi.unstubAllGlobals();
  __resetCapabilities();
});

describe('format proof in a worker', () => {
  it('accepts lossy AVIF and WebP encoders, and auto picks AVIF', async () => {
    withEncoders({ 'image/avif': lossy(AVIF_HEAD), 'image/webp': lossy(WEBP_HEAD) });
    expect(await ensureCapabilities()).toEqual({ avif: true, webp: true });
    expect(getBestFormat()).toBe('avif');
  });

  it('rejects PNG bytes labelled AVIF, the same at every quality (CMP-16 on iOS 26)', async () => {
    withEncoders({ 'image/avif': () => output(PNG_HEAD, 4000), 'image/webp': lossy(WEBP_HEAD) });
    expect(await ensureCapabilities()).toEqual({ avif: false, webp: true });
    expect(getBestFormat()).toBe('webp');
  });

  it('rejects real AVIF bytes that ignore quality', async () => {
    withEncoders({ 'image/avif': () => output(AVIF_HEAD, 4000) });
    expect(await ensureCapabilities()).toEqual({ avif: false, webp: false });
    expect(getBestFormat()).toBe('jpeg');
  });

  it('rejects an encoder whose size follows quality but whose bytes are another format', async () => {
    withEncoders({ 'image/webp': lossy(PNG_HEAD) });
    expect((await ensureCapabilities()).webp).toBe(false);
  });

  it('treats an encode that throws or returns nothing as no encoder', async () => {
    withEncoders({
      'image/avif': () => { throw new Error('encoder crashed'); },
      'image/webp': () => null,
    });
    expect(await ensureCapabilities()).toEqual({ avif: false, webp: false });
  });
});
