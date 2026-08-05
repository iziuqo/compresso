import { describe, expect, it } from 'vitest';
import { compress } from '../../src/compress.js';
import landscapeUrl from '../../../../benchmark/corpus/landscape.jpg?url';
import transparentUrl from '../../../../benchmark/corpus/transparent-graphic.png?url';
import screenshotUrl from '../../../../benchmark/corpus/screenshot.png?url';
import optimizedWebpUrl from '../../../../benchmark/corpus/already-optimized.webp?url';
import sampleHeicUrl from '../../../../benchmark/corpus/sample.heic?url';

async function fetchBlob(url, type, name) {
  const res = await fetch(url);
  return new File([await res.arrayBuffer()], name, { type });
}

/**
 * Runs compress() against the public, committed corpus at benchmark/corpus/
 * (see benchmark/README.md) — unlike test/browser/corpus.test.js's gitignored
 * `_assets/`, this one is meant to be shared, so it always runs rather than
 * skipping. Each case both asserts the never-bigger guarantee and logs the
 * before/after numbers, doubling as the input for the comparison figures in
 * the README and the upcoming public benchmark suite (issue #4).
 */
describe('benchmark corpus — real decode, committed public fixtures (every CI run, every engine)', () => {
  it('compresses a high-resolution JPEG, respecting the never-bigger guarantee', async () => {
    const file = await fetchBlob(landscapeUrl, 'image/jpeg', 'landscape.jpg');
    const result = await compress(file, { format: 'auto' });
    console.log(`landscape.jpg: ${result.originalSize} -> ${result.compressedSize} bytes (${result.savings}% smaller, ${result.format})`);
    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
  });

  it('compresses a transparent PNG graphic via auto-format, respecting the never-bigger guarantee', async () => {
    const file = await fetchBlob(transparentUrl, 'image/png', 'transparent-graphic.png');
    const result = await compress(file, { format: 'auto' });
    console.log(`transparent-graphic.png: ${result.originalSize} -> ${result.compressedSize} bytes (${result.savings}% smaller, ${result.format})`);
    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
  });

  it('compresses a text-heavy screenshot PNG via auto-format, respecting the never-bigger guarantee', async () => {
    const file = await fetchBlob(screenshotUrl, 'image/png', 'screenshot.png');
    const result = await compress(file, { format: 'auto' });
    console.log(`screenshot.png: ${result.originalSize} -> ${result.compressedSize} bytes (${result.savings}% smaller, ${result.format})`);
    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
  });

  it('does not inflate an already-optimized WebP', async () => {
    const file = await fetchBlob(optimizedWebpUrl, 'image/webp', 'already-optimized.webp');
    const result = await compress(file, { format: 'auto' });
    console.log(`already-optimized.webp: ${result.originalSize} -> ${result.compressedSize} bytes (${result.savings}% smaller, ${result.format})`);
    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
  });

  it('decodes and compresses a HEIC photo', async () => {
    const file = await fetchBlob(sampleHeicUrl, '', 'sample.heic'); // no MIME — matches a typical iPhone upload
    const result = await compress(file, { format: 'auto' });
    console.log(`sample.heic: ${result.originalSize} -> ${result.compressedSize} bytes (${result.format})`);
    expect(result.compressedSize).toBeGreaterThan(0);
    expect(result.format).not.toBe('heic'); // HEIC is input-only
  });
});
