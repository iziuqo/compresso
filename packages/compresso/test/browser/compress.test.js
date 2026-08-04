import { describe, expect, it } from 'vitest';
import { compress } from '../../src/compress.js';
import sampleJpgUrl from '../fixtures/sample.jpg?url';
import samplePngUrl from '../fixtures/sample.png?url';
import sampleHeicUrl from '../fixtures/sample.heic?url';
import sampleAvifUrl from '../fixtures/sample.avif?url';

async function fetchBlob(url, type, name) {
  const res = await fetch(url);
  return new File([await res.arrayBuffer()], name, { type });
}

describe('compress() — real decode, committed fixtures (every CI run, every engine)', () => {
  it('compresses a JPEG, respecting the never-bigger guarantee', async () => {
    const file = await fetchBlob(sampleJpgUrl, 'image/jpeg', 'sample.jpg');
    const result = await compress(file, { format: 'auto' });
    expect(result.originalWidth).toBe(64);
    expect(result.originalHeight).toBe(64);
    expect(result.compressedSize).toBeGreaterThan(0);
    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
  });

  it('compresses a PNG via auto-format, respecting the never-bigger guarantee', async () => {
    // format: 'auto' never resolves to 'png' (getBestFormat only picks avif/webp/
    // jpeg), so the never-bigger guarantee is in force here even though the
    // source is a PNG — unlike the explicit-format case below.
    const file = await fetchBlob(samplePngUrl, 'image/png', 'sample.png');
    const result = await compress(file, { format: 'auto' });
    expect(result.originalWidth).toBe(64);
    expect(result.originalHeight).toBe(64);
    expect(result.format).not.toBe('png');
    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
  });

  it('keeps a PNG as PNG on request, exempt from the never-bigger guarantee', async () => {
    // PNG ignores quality, so a size search can't shrink it — this is the one
    // documented, deliberate exception to the invariant the other tests assert.
    const file = await fetchBlob(samplePngUrl, 'image/png', 'sample.png');
    const result = await compress(file, { format: 'png' });
    expect(result.mimeType).toBe('image/png');
    expect(result.originalWidth).toBe(64);
    expect(result.originalHeight).toBe(64);
  });

  it('decodes HEIC input (native on WebKit, lazy WASM elsewhere) and compresses it', async () => {
    const file = await fetchBlob(sampleHeicUrl, '', 'sample.heic'); // no MIME — matches a typical iPhone upload
    const result = await compress(file, { format: 'auto' });
    expect(result.originalWidth).toBe(64);
    expect(result.originalHeight).toBe(64);
    expect(result.compressedSize).toBeGreaterThan(0);
    // HEIC is input-only — output is never HEIC, regardless of engine.
    expect(result.format).not.toBe('heic');
  });

  it('decodes AVIF input and compresses it, respecting the never-bigger guarantee', async () => {
    // Notably exercises the "no re-encode in the target format beats the
    // source" fallback on WebKit, where auto falls back to JPEG and AVIF's
    // own encoding is typically more efficient than JPEG can match at any
    // quality — compress() returns the AVIF source unchanged in that case,
    // honestly relabeled as its own format. See CHANGELOG.md's [Unreleased]
    // "Fixed" entry for the bug this used to hit before that fallback existed.
    const file = await fetchBlob(sampleAvifUrl, 'image/avif', 'sample.avif');
    const result = await compress(file, { format: 'auto' });
    expect(result.originalWidth).toBe(64);
    expect(result.originalHeight).toBe(64);
    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
  });
});
