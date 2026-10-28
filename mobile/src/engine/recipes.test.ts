import { describe, expect, it } from 'vitest';

import { KB, MB } from './presets';
import { recipesFor } from './recipes';
import type { Source } from './types';

const src = (uri: string, size: number): Source => ({ uri, name: uri, size, width: 4000, height: 3000 });
const photos = [src('a', 4 * MB), src('b', 4 * MB), src('c', 2 * MB)];

describe('recipesFor', () => {
  it('gives every photo the purpose recipe plus the global tweaks', () => {
    const r = recipesFor('message', photos, { quality: 0.5 }, MB);
    expect(r.every((x) => x.quality === 0.5 && x.targetBytes === 400 * KB)).toBe(true);
  });

  it('lets one photo override the global settings without touching the others', () => {
    const r = recipesFor('message', photos, { quality: 0.5 }, MB, { b: { quality: 0.9, formats: ['webp'] } });
    expect(r[0]).toMatchObject({ quality: 0.5, formats: ['jpeg'] });
    expect(r[1]).toMatchObject({ quality: 0.9, formats: ['webp'] });
    expect(r[2]).toMatchObject({ quality: 0.5 });
  });

  it('uses the chosen upload limit', () => {
    expect(recipesFor('upload', photos, {}, 200 * KB)[0].targetBytes).toBe(200 * KB);
  });

  it('splits the email budget, keeping a photo’s own size limit out of the split', () => {
    const shared = recipesFor('email', photos, {}, MB);
    expect(shared.reduce((s, r) => s + r.targetBytes!, 0)).toBeLessThanOrEqual(5 * MB);

    const r = recipesFor('email', photos, {}, MB, { a: { targetBytes: 2 * MB } });
    expect(r[0].targetBytes).toBe(2 * MB);
    expect(r[1].targetBytes! + r[2].targetBytes!).toBeLessThanOrEqual(3 * MB);
    expect(r[1].targetBytes).toBeGreaterThan(r[2].targetBytes!);
  });

  it('lets a global size limit replace the email budget', () => {
    expect(recipesFor('email', photos, { targetBytes: null }, MB).every((r) => r.targetBytes === null)).toBe(true);
  });
});
