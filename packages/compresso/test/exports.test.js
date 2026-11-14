import { describe, expect, it } from 'vitest';
import * as main from '../src/index.js';
import * as pool from '../src/pool.js';
import * as plan from '../src/plan.js';
import { tracked } from './support/known-failures.js';

const itTracked = tracked(it, 'node');

/** Name → typeof, so an added, removed or retyped export shows in review. */
const surface = (entry) => Object.fromEntries(Object.keys(entry).sort().map((name) => [name, typeof entry[name]]));

/**
 * The public API, entry by entry. A 1.x release may only add to this list
 * (the quality plan's "nothing breaks" rule): a removal or rename fails here
 * and needs a 2.0. Update it in the same pull request that adds an export.
 */
describe('public API snapshot', () => {
  it("'compresso.js'", () => {
    expect(surface(main)).toEqual({
      __resetCapabilities: 'function',
      __setCapabilities: 'function',
      __setHeicToUrl: 'function',
      compress: 'function',
      compressFile: 'function',
      compressMultiple: 'function',
      createCompressor: 'function',
      decodeHeic: 'function',
      detectFormat: 'function',
      formatBytes: 'function',
      getBestFormat: 'function',
      isFormatSupported: 'function',
      isHeicSource: 'function',
    });
  });

  it("'compresso.js/pool'", () => {
    expect(surface(pool)).toEqual({ createPool: 'function', defaultPoolSize: 'function', isPoolSupported: 'function' });
  });

  it("'compresso.js/plan'", () => {
    expect(surface(plan)).toEqual({
      allocateBudget: 'function',
      findQuality: 'function',
      fitVideo: 'function',
      planPhoto: 'function',
      planVideo: 'function',
      resolveFormat: 'function',
    });
  });
});

describe('formatBytes()', () => {
  it('formats bytes in base-1024 units with one decimal', () => {
    expect(main.formatBytes(0)).toBe('0 B');
    expect(main.formatBytes(512)).toBe('512 B');
    expect(main.formatBytes(1536)).toBe('1.5 KB');
    expect(main.formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  itTracked('COR-15/formatBytes', 'rounds up across a unit, and handles TB, negatives and fractions', () => {
    expect(main.formatBytes(1048575), 'COR-15 rounds into the next unit').toBe('1.0 MB');
    expect(main.formatBytes(1024 ** 4), 'COR-15 terabytes').toBe('1.0 TB');
    for (const value of [-1, 0.5]) expect(main.formatBytes(value), `COR-15 ${value}`).not.toMatch(/NaN|undefined/);
  });
});

describe('isHeicSource() and detectFormat()', () => {
  it('recognise HEIC by type, by name, and an untyped unnamed Blob as a candidate', () => {
    expect(main.isHeicSource(new Blob([], { type: 'image/heic' }))).toBe(true);
    expect(main.isHeicSource(new File([], 'IMG_0001.HEIC'))).toBe(true);
    expect(main.isHeicSource(new Blob([]))).toBe(true);
    expect(main.isHeicSource(new File([], 'a.jpg', { type: 'image/jpeg' }))).toBe(false);
  });

  it('detect a source format from a URL, a type or a name', () => {
    expect(main.detectFormat('https://example.com/a.webp')).toBe('webp');
    expect(main.detectFormat(new Blob([], { type: 'image/png' }))).toBe('png');
    expect(main.detectFormat(new File([], 'a.avif'))).toBe('avif');
  });
});
