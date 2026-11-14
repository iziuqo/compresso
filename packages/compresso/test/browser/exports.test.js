import { describe, expect, it } from 'vitest';
import { compressFile, compressMultiple, createCompressor } from '../../src/index.js';
import { fixture } from './support/fixtures.js';
import { expectHonestResult } from './support/honest.js';

/**
 * The convenience exports of the main entry, run for real: each must behave
 * like compress() with the options it is given (test/exports.test.js pins the
 * export list itself).
 */
describe('the main entry’s convenience exports, every engine', () => {
  it('compressFile() is compress() under another name', async () => {
    const source = await fixture('sample.jpg');
    const result = await compressFile(source, { format: 'jpeg', maxWidth: 32 });
    expect([result.format, result.width]).toEqual(['jpeg', 32]);
    await expectHonestResult(result, source);
  });

  it('compressMultiple() keeps the input order and reports progress across the batch', async () => {
    const sources = [await fixture('sample.jpg'), await fixture('sample.png')];
    const events = [];
    const results = await compressMultiple(sources, { format: 'jpeg', onProgress: (event) => events.push(event) });

    expect(results.map((r) => r.originalSize)).toEqual(sources.map((s) => s.size));
    for (const [i, result] of results.entries()) await expectHonestResult(result, sources[i]);
    expect(events.length).toBeGreaterThan(0);
    for (const { fileIndex, totalFiles, overallProgress } of events) {
      expect(totalFiles).toBe(2);
      expect(overallProgress).toBeGreaterThanOrEqual(fileIndex / 2);
      expect(overallProgress).toBeLessThanOrEqual((fileIndex + 1) / 2);
    }
    expect(new Set(events.map((e) => e.fileIndex))).toEqual(new Set([0, 1]));
  });

  it('createCompressor() applies its defaults, and per-call options win', async () => {
    const source = await fixture('sample.jpg');
    const compressor = createCompressor({ format: 'jpeg', maxWidth: 32 });

    const one = await compressor.compress(source, { maxWidth: 16 });
    expect([one.format, one.width]).toEqual(['jpeg', 16]);
    await expectHonestResult(one, source);

    const [two] = await compressor.compressMultiple([source]);
    expect([two.format, two.width]).toEqual(['jpeg', 32]);
    await expectHonestResult(two, source);
  });
});
