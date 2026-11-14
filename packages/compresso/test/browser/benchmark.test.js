import { describe, expect, it } from 'vitest';
import { compress } from '../../src/compress.js';
import { fileFrom } from './support/fixtures.js';
import { expectHonestResult } from './support/honest.js';
import { itTracked } from './support/known-bugs.js';
import landscapeUrl from '../../../../benchmark/corpus/landscape.jpg?url';
import transparentUrl from '../../../../benchmark/corpus/transparent-graphic.png?url';
import screenshotUrl from '../../../../benchmark/corpus/screenshot.png?url';
import optimizedWebpUrl from '../../../../benchmark/corpus/already-optimized.webp?url';
import sampleHeicUrl from '../../../../benchmark/corpus/sample.heic?url';

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
    const file = await fileFrom(landscapeUrl, 'landscape.jpg', 'image/jpeg');
    const result = await compress(file, { format: 'auto' });
    console.log(`landscape.jpg: ${result.originalSize} -> ${result.compressedSize} bytes (${result.savings}% smaller, ${result.format})`);
    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
    await expectHonestResult(result, file);
  });

  it('compresses a transparent PNG graphic via auto-format, respecting the never-bigger guarantee', async () => {
    const file = await fileFrom(transparentUrl, 'transparent-graphic.png', 'image/png');
    const result = await compress(file, { format: 'auto' });
    console.log(`transparent-graphic.png: ${result.originalSize} -> ${result.compressedSize} bytes (${result.savings}% smaller, ${result.format})`);
    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
    await expectHonestResult(result, file);
  });

  it('compresses a text-heavy screenshot PNG via auto-format, respecting the never-bigger guarantee', async () => {
    const file = await fileFrom(screenshotUrl, 'screenshot.png', 'image/png');
    const result = await compress(file, { format: 'auto' });
    console.log(`screenshot.png: ${result.originalSize} -> ${result.compressedSize} bytes (${result.savings}% smaller, ${result.format})`);
    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
    await expectHonestResult(result, file);
  });

  it('does not inflate an already-optimized WebP', async () => {
    const file = await fileFrom(optimizedWebpUrl, 'already-optimized.webp', 'image/webp');
    const result = await compress(file, { format: 'auto' });
    console.log(`already-optimized.webp: ${result.originalSize} -> ${result.compressedSize} bytes (${result.savings}% smaller, ${result.format})`);
    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
    await expectHonestResult(result, file);
  });

  itTracked('benchmark/untyped-heic', 'decodes and compresses a HEIC photo', async () => {
    const file = await fileFrom(sampleHeicUrl, 'sample.heic', ''); // no MIME — matches a typical iPhone upload
    const result = await compress(file, { format: 'auto' });
    console.log(`sample.heic: ${result.originalSize} -> ${result.compressedSize} bytes (${result.format})`);
    expect(result.compressedSize).toBeGreaterThan(0);
    await expectHonestResult(result, file);
  });
});
