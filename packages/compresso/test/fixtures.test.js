import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FORMATS, sniffFormat } from './support/formats.js';

/**
 * Keeps the committed corpus honest: every image in test/fixtures/ is in the
 * manifest with its licence and checksum, nothing drifts, and the whole set
 * stays small enough to clone quickly. Also checks the honesty check's own
 * signature reader against every fixture's declared type.
 */
const DIR = new URL('./fixtures/', import.meta.url);
const { files } = JSON.parse(readFileSync(new URL('manifest.json', DIR)));
const MAX_CORPUS_BYTES = 3 * 1024 * 1024;
const NOT_FIXTURES = new Set(['README.md', 'manifest.json', 'generate.py']);

describe('test/fixtures manifest', () => {
  it('lists every committed fixture, and nothing else', () => {
    const onDisk = readdirSync(DIR).filter((name) => !NOT_FIXTURES.has(name)).sort();
    expect(files.map((f) => f.file).sort()).toEqual(onDisk);
  });

  it('stays under 3 MB in total', () => {
    expect(files.reduce((sum, f) => sum + f.bytes, 0)).toBeLessThan(MAX_CORPUS_BYTES);
  });

  for (const entry of files) {
    it(`${entry.file}: licence, checksum, size and signature match`, () => {
      const bytes = readFileSync(new URL(entry.file, DIR));
      expect(entry.licence).toBeTruthy();
      expect(entry.stresses).toBeTruthy();
      expect(entry.width * entry.height).toBeGreaterThan(0);
      expect(bytes.length).toBe(entry.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
      expect(FORMATS[sniffFormat(new Uint8Array(bytes))]?.mime).toBe(entry.type);
    });
  }
});
