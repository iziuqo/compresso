import { describe, expect, it } from 'vitest';
import { allocateBudget, findQuality, planPhoto, resolveFormat } from '../src/plan.js';

const KB = 1024;
const MB = 1024 * KB;

/**
 * A fake host whose encoded size is a simple function of pixels and quality:
 * bytes = pixels × bytesPerPixel × quality (PNG: × 3, quality ignored). Enough
 * to pin the decisions, which is all the planner owns.
 */
function fakeHost({ width, height, size, formats = ['jpeg', 'png'], bpp = 0.5 }) {
  const calls = { prepares: 0, measures: 0, writes: 0, keeps: 0, releases: 0 };
  let scaled = { width, height };
  const bytes = (format, quality) =>
    Math.round(scaled.width * scaled.height * (format === 'png' ? 3 : bpp * quality));
  const host = {
    formats,
    async prepare(maxLongEdge) {
      calls.prepares++;
      const scale = Math.min(1, (maxLongEdge ?? Infinity) / Math.max(width, height));
      scaled = { width: Math.round(width * scale), height: Math.round(height * scale) };
      return { ...scaled, originalSize: size };
    },
    async measure(format, quality) {
      calls.measures++;
      return bytes(format, quality);
    },
    async write(format, quality) {
      calls.writes++;
      return { size: bytes(format, quality), ...scaled };
    },
    async keep() {
      calls.keeps++;
      return { size, width, height };
    },
    release() {
      calls.releases++;
    },
  };
  return { host, calls };
}

describe('resolveFormat', () => {
  it('takes the first preferred format the host can write, JPEG otherwise', () => {
    expect(resolveFormat(['heic', 'jpeg'], ['jpeg', 'png'])).toBe('jpeg');
    expect(resolveFormat(['heic', 'jpeg'], ['heic', 'jpeg'])).toBe('heic');
    expect(resolveFormat(['webp'], ['png'])).toBe('jpeg');
  });
});

describe('findQuality', () => {
  it('keeps the starting quality when it already fits, in one encode', async () => {
    let encodes = 0;
    expect(await findQuality(async (q) => (encodes++, q * 100), 0.8, 100)).toBe(0.8);
    expect(encodes).toBe(1);
  });

  it('finds the highest quality under the ceiling', async () => {
    const q = await findQuality(async (q) => q * 100, 0.8, 50);
    expect(q * 100).toBeLessThanOrEqual(50);
    expect(q).toBeGreaterThan(0.48);
  });

  it('returns null when nothing fits, within 11 encodes', async () => {
    let encodes = 0;
    expect(await findQuality(async () => (encodes++, 1000), 0.8, 10)).toBeNull();
    expect(encodes).toBeLessThanOrEqual(11);
  });

  it('reports its progress up to 1', async () => {
    const steps = [];
    await findQuality(async () => 1000, 0.8, 10, (s) => steps.push(s));
    expect(steps.at(-1)).toBeLessThanOrEqual(1);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
  });
});

describe('planPhoto', () => {
  const recipe = (extra) => ({ formats: ['jpeg'], ...extra });

  it('writes once at the starting quality when it fits', async () => {
    const { host, calls } = fakeHost({ width: 1000, height: 1000, size: MB });
    const out = await planPhoto(host, recipe());
    expect(out).toMatchObject({ format: 'jpeg', quality: 0.8, kept: false, missedTarget: false });
    expect(out.result.size).toBe(400_000);
    expect(calls).toMatchObject({ writes: 1, keeps: 0 });
    expect(calls.releases).toBe(calls.prepares);
  });

  it('never returns a bigger file: keeps the source', async () => {
    const { host, calls } = fakeHost({ width: 1000, height: 1000, size: 1000, bpp: 5 });
    const out = await planPhoto(host, recipe());
    expect(out).toMatchObject({ kept: true, format: null, quality: null, missedTarget: false });
    expect(calls).toMatchObject({ keeps: 1, writes: 0 });
  });

  it('meets a target by lowering quality, at full size', async () => {
    const { host } = fakeHost({ width: 1000, height: 1000, size: 2 * MB });
    const out = await planPhoto(host, recipe({ targetBytes: 200 * KB }));
    expect(out.result.size).toBeLessThanOrEqual(200 * KB);
    expect(out.result.width).toBe(1000);
    expect(out.missedTarget).toBe(false);
  });

  it('steps the long edge down when quality alone cannot meet the target', async () => {
    const { host, calls } = fakeHost({ width: 8000, height: 6000, size: 20 * MB, bpp: 2 });
    const out = await planPhoto(host, recipe({ targetBytes: 200 * KB }));
    expect(out.result.size).toBeLessThanOrEqual(200 * KB);
    expect(out.result.width).toBeLessThan(8000);
    expect(out.missedTarget).toBe(false);
    expect(calls.releases).toBe(calls.prepares);
  });

  it('gives the smallest file and says so when the target is out of reach', async () => {
    const { host } = fakeHost({ width: 1000, height: 1000, size: 5 * MB, bpp: 50 });
    const out = await planPhoto(host, recipe({ targetBytes: 10 * KB }));
    expect(out).toMatchObject({ kept: false, quality: 0.05, missedTarget: true });
    expect(Math.max(out.result.width, out.result.height)).toBeGreaterThanOrEqual(480);
  });

  it('keeps the source when even the smallest file would be bigger', async () => {
    const { host } = fakeHost({ width: 1000, height: 1000, size: 1000, bpp: 50 });
    const out = await planPhoto(host, recipe({ targetBytes: 500 }));
    expect(out).toMatchObject({ kept: true, missedTarget: true });
  });

  it('keeps the source when a PNG would grow', async () => {
    const { host } = fakeHost({ width: 500, height: 500, size: 100 * KB });
    expect(await planPhoto(host, recipe({ formats: ['png'] }))).toMatchObject({ kept: true, quality: null });
  });

  it('ends its progress at 1', async () => {
    const { host } = fakeHost({ width: 1000, height: 1000, size: 2 * MB });
    const progress = [];
    await planPhoto(host, recipe({ targetBytes: 200 * KB }), { onProgress: (p) => progress.push(p) });
    expect(progress.at(-1)).toBe(1);
    expect(Math.max(...progress.slice(0, -1))).toBeLessThanOrEqual(0.95);
  });

  it('honours an abort signal', async () => {
    const { host, calls } = fakeHost({ width: 1000, height: 1000, size: MB });
    await expect(planPhoto(host, recipe(), { signal: AbortSignal.abort() })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(calls.prepares).toBe(0);
  });
});

describe('allocateBudget', () => {
  it('stays within the budget and treats equal photos equally', () => {
    const shares = allocateBudget(5 * MB, [3 * MB, 3 * MB, 3 * MB]);
    expect(shares.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(5 * MB);
    expect(shares[0]).toBe(shares[1]);
  });

  it('never gives a photo more than it weighs, and passes the rest on', () => {
    const shares = allocateBudget(15 * MB, [2 * MB, 20 * MB, 20 * MB]);
    expect(shares[0]).toBeLessThanOrEqual(2 * MB);
    expect(shares.reduce((a, b) => a + b, 0)).toBeGreaterThan(14.4 * MB);
    expect(allocateBudget(30 * MB, [MB, 20 * MB])).toEqual([MB, 20 * MB]);
  });

  it('weighs an unknown size like an average photo', () => {
    const [known, unknown] = allocateBudget(4 * MB, [2 * MB, 0]);
    expect(unknown).toBe(known);
  });
});
