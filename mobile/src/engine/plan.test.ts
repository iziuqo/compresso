import { describe, expect, it } from 'vitest';

import { compressOne, findQuality, resolveFormat } from './plan';
import { allocateBudget, KB, MB, PURPOSES } from './presets';
import type { EncodeFormat, Engine, Recipe, Source } from './types';

/**
 * A fake host whose output size is a simple function of quality and pixel
 * count: bytes = bytesPerPixel(format) × pixels × quality. Good enough to pin
 * the decisions, which is all plan.ts owns.
 */
function fakeEngine(opts: { width: number; height: number; size: number; formats?: EncodeFormat[]; bpp?: number }) {
  const calls = { encodes: 0, writes: 0, copies: 0, prepares: 0, released: 0 };
  const handles = new Map<string, { w: number; h: number }>();
  const bpp = opts.bpp ?? 0.5;
  const sizeOf = (h: string, format: EncodeFormat, q: number) => {
    const { w, h: hh } = handles.get(h)!;
    return Math.round(w * hh * (format === 'png' ? 3 : bpp) * (format === 'png' ? 1 : q));
  };
  const engine: Engine = {
    formats: () => opts.formats ?? ['jpeg', 'png'],
    async prepare(_s, { maxLongEdge }) {
      calls.prepares++;
      const long = Math.max(opts.width, opts.height);
      const scale = Math.min(1, (maxLongEdge ?? long) / long);
      const handle = `h${calls.prepares}`;
      const w = Math.round(opts.width * scale);
      const h = Math.round(opts.height * scale);
      handles.set(handle, { w, h });
      return { handle, width: w, height: h, originalWidth: opts.width, originalHeight: opts.height, originalSize: opts.size, sourceFormat: 'jpeg' };
    },
    async encode(handle, { format, quality }) {
      calls.encodes++;
      return sizeOf(handle, format, quality);
    },
    async write(handle, { format, quality, name }) {
      calls.writes++;
      const { w, h } = handles.get(handle)!;
      return { uri: `file:///${name}`, size: sizeOf(handle, format, quality), width: w, height: h, format };
    },
    async copyOriginal(_h, name) {
      calls.copies++;
      return { uri: `file:///${name}`, size: opts.size, width: opts.width, height: opts.height, format: 'jpeg' };
    },
    release() { calls.released++; },
  };
  return { engine, calls };
}

const source: Source = { uri: 'file:///a.jpg', name: 'a', size: 0, width: 0, height: 0 };
const recipe = (r: Partial<Recipe>): Recipe => ({
  formats: ['jpeg'], quality: 0.8, maxLongEdge: null, targetBytes: null, metadata: 'strip-location', ...r,
});

describe('resolveFormat', () => {
  it('takes the first preferred format the host can write', () => {
    expect(resolveFormat(['heic', 'jpeg'], ['jpeg', 'png'])).toBe('jpeg');
    expect(resolveFormat(['heic', 'jpeg'], ['heic', 'jpeg', 'png'])).toBe('heic');
    expect(resolveFormat(['webp'], ['png'])).toBe('jpeg');
  });
});

describe('findQuality', () => {
  it('keeps the starting quality when it already fits', async () => {
    expect(await findQuality(async (q) => q * 100, 0.8, 100)).toBe(0.8);
  });
  it('searches down to the highest quality under the ceiling', async () => {
    const q = await findQuality(async (q) => q * 100, 0.8, 50);
    expect(q).not.toBeNull();
    expect(q! * 100).toBeLessThanOrEqual(50);
    expect(q!).toBeGreaterThan(0.48);
  });
  it('returns null when nothing fits', async () => {
    expect(await findQuality(async () => 1000, 0.8, 10)).toBeNull();
  });
});

describe('compressOne', () => {
  it('writes once at the starting quality when it fits', async () => {
    const { engine, calls } = fakeEngine({ width: 1000, height: 1000, size: 1 * MB });
    const out = await compressOne(engine, source, recipe({}), { name: 'a' });
    expect(out.kept).toBe(false);
    expect(out.quality).toBe(0.8);
    expect(out.size).toBe(400_000);
    expect(calls.writes).toBe(1);
    expect(calls.released).toBe(calls.prepares);
  });

  it('never returns a bigger file: falls back to the original', async () => {
    // Source is already tiny for its pixel count.
    const { engine, calls } = fakeEngine({ width: 1000, height: 1000, size: 1000, bpp: 5 });
    const out = await compressOne(engine, source, recipe({}), { name: 'a' });
    expect(out.kept).toBe(true);
    expect(out.size).toBe(1000);
    expect(calls.copies).toBe(1);
  });

  it('meets a target size by lowering quality', async () => {
    const { engine } = fakeEngine({ width: 1000, height: 1000, size: 2 * MB });
    const out = await compressOne(engine, source, recipe({ targetBytes: 200 * KB }), { name: 'a' });
    expect(out.size).toBeLessThanOrEqual(200 * KB);
    expect(out.width).toBe(1000);
    expect(out.missedTarget).toBe(false);
  });

  it('steps the long edge down when quality alone cannot meet the target', async () => {
    const { engine } = fakeEngine({ width: 8000, height: 6000, size: 20 * MB, bpp: 2 });
    const out = await compressOne(engine, source, recipe({ targetBytes: 200 * KB }), { name: 'a' });
    expect(out.size).toBeLessThanOrEqual(200 * KB);
    expect(out.width).toBeLessThan(8000);
    expect(out.missedTarget).toBe(false);
  });

  it('PNG that would grow keeps the original', async () => {
    const { engine } = fakeEngine({ width: 500, height: 500, size: 100 * KB });
    const out = await compressOne(engine, source, recipe({ formats: ['png'] }), { name: 'a' });
    expect(out.kept).toBe(true);
  });

  it('honours an abort signal', async () => {
    const { engine } = fakeEngine({ width: 1000, height: 1000, size: 1 * MB });
    const controller = new AbortController();
    controller.abort();
    await expect(compressOne(engine, source, recipe({}), { name: 'a', signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('allocateBudget', () => {
  it('stays within the budget', () => {
    const shares = allocateBudget(5 * MB, [3 * MB, 3 * MB, 3 * MB]);
    expect(shares.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(5 * MB);
    expect(shares[0]).toBe(shares[1]);
  });
  it('never gives a photo more than it weighs and passes the rest on', () => {
    const shares = allocateBudget(15 * MB, [2 * MB, 20 * MB, 20 * MB]);
    expect(shares[0]).toBeLessThanOrEqual(2 * MB);
    expect(shares.reduce((a, b) => a + b, 0)).toBeGreaterThan(14.4 * MB);
    const generous = allocateBudget(30 * MB, [1 * MB, 20 * MB]);
    expect(generous[0]).toBe(1 * MB);
    expect(generous[1]).toBe(20 * MB);
  });
  it('weighs unknown sizes like an average photo', () => {
    const shares = allocateBudget(4 * MB, [2 * MB, 0]);
    expect(shares[1]).toBe(shares[0]);
  });
});

describe('presets', () => {
  it('every purpose has a recipe with at least one format', () => {
    for (const p of PURPOSES) expect(p.recipe.formats.length).toBeGreaterThan(0);
  });
});
