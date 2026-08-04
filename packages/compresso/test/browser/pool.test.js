import { describe, expect, it, vi } from 'vitest';
import { createPool, isPoolSupported } from '../../src/pool.js';
import { compressMultiple } from '../../src/index.js';
import sampleJpgUrl from '../fixtures/sample.jpg?url';
import samplePngUrl from '../fixtures/sample.png?url';

async function fetchBlob(url, type, name) {
  const res = await fetch(url);
  return new File([await res.arrayBuffer()], name, { type });
}

/**
 * A larger, non-trivial-to-encode synthetic image — the committed fixtures
 * are tiny (64×64) so real per-job work is dwarfed by worker-spawn/postMessage
 * overhead, which would make a timing comparison meaningless (and, per the
 * plan's §6.1.3, a small enough batch can legitimately be *slower* through
 * the pool — that's a real finding, not something to paper over with a
 * misleadingly tiny workload).
 */
async function generateSyntheticImage(size = 800) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#ff0000');
  gradient.addColorStop(0.5, '#00ff00');
  gradient.addColorStop(1, '#0000ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 6, 6);
  }
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

describe('createPool() — real engine, committed fixtures', () => {
  it('compresses via a real worker, respecting the never-bigger guarantee', async () => {
    expect(isPoolSupported()).toBe(true); // sanity: this whole suite assumes a real engine
    const pool = createPool({ size: 2 });
    try {
      const file = await fetchBlob(sampleJpgUrl, 'image/jpeg', 'sample.jpg');
      const result = await pool.compress(file, { format: 'auto' });
      expect(result.originalWidth).toBe(64);
      expect(result.originalHeight).toBe(64);
      expect(result.compressedSize).toBeGreaterThan(0);
      expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
      expect(result.file).toBeInstanceOf(File);
      expect(result.url).toMatch(/^blob:/);
    } finally {
      pool.destroy();
    }
  });

  it('compressMany() through a real pool: Promise.allSettled shape, all fulfilled', async () => {
    const pool = createPool({ size: 2 });
    try {
      const jpg = await fetchBlob(sampleJpgUrl, 'image/jpeg', 'sample.jpg');
      const png = await fetchBlob(samplePngUrl, 'image/png', 'sample.png');
      const results = await pool.compressMany([jpg, png]);
      expect(results).toHaveLength(2);
      for (const r of results) {
        expect(r.status).toBe('fulfilled');
        expect(r.value.compressedSize).toBeGreaterThan(0);
      }
    } finally {
      pool.destroy();
    }
  });

  it('reports per-file batch progress while running through real workers', async () => {
    const pool = createPool({ size: 2 });
    try {
      const jpg = await fetchBlob(sampleJpgUrl, 'image/jpeg', 'sample.jpg');
      const events = [];
      await pool.compressMany([jpg, jpg], {}, (e) => events.push(e));
      expect(events.length).toBeGreaterThan(0);
      expect(events.every((e) => e.totalFiles === 2 && e.fileIndex < 2)).toBe(true);
      expect(events.at(-1).overallProgress).toBeCloseTo(1, 1);
    } finally {
      pool.destroy();
    }
  });
});

describe('createPool() — actually parallelizes', () => {
  it('more than one worker is genuinely busy at the same time', async () => {
    const pool = createPool({ size: 4 });
    try {
      const file = await fetchBlob(sampleJpgUrl, 'image/jpeg', 'sample.jpg');
      const jobs = [pool.compress(file), pool.compress(file), pool.compress(file), pool.compress(file)];
      // A tiny fixture compresses in single-digit milliseconds — well under
      // vi.waitFor's default ~50ms poll interval, which would otherwise only
      // ever sample before dispatch and after completion, never catching the
      // real (but brief) busy window in between. Poll tightly instead.
      await vi.waitFor(() => expect(pool.stats().busy).toBeGreaterThan(1), { timeout: 5000, interval: 2 });
      await Promise.all(jobs);
    } finally {
      pool.destroy();
    }
  });

  it('a real batch through the pool is not slower than the same batch run serially (timing smoke test)', async () => {
    const blob = await generateSyntheticImage(800);
    const files = Array.from({ length: 6 }, (_, i) => new File([blob], `big-${i}.png`, { type: 'image/png' }));

    const serialStart = performance.now();
    await compressMultiple(files);
    const serialMs = performance.now() - serialStart;

    const pool = createPool({ size: 4 });
    try {
      const parallelStart = performance.now();
      await pool.compressMany(files);
      const parallelMs = performance.now() - parallelStart;
      // A generous margin, deliberately — this is a smoke test confirming
      // parallelism isn't *actively harmful*, not a precise speedup claim.
      // Real multipliers, across real device classes, are §6's job, backed
      // by actual measurement, not asserted here from one CI run.
      expect(parallelMs).toBeLessThan(serialMs * 1.15);
    } finally {
      pool.destroy();
    }
  });
});

describe('createPool() — cancellation actually stops work', () => {
  it('an aborted in-flight job rejects and frees its worker promptly', async () => {
    const pool = createPool({ size: 1 });
    try {
      const blob = await generateSyntheticImage(800);
      const file = new File([blob], 'big.png', { type: 'image/png' });
      const controller = new AbortController();

      const promise = pool.compress(file, { signal: controller.signal });
      await vi.waitFor(() => expect(pool.stats().busy).toBe(1), { interval: 2 });
      controller.abort();

      await expect(promise).rejects.toMatchObject({ kind: 'aborted' });
      await vi.waitFor(() => expect(pool.stats()).toMatchObject({ busy: 0, queued: 0 }), { interval: 2 });

      // The slot must actually be usable again, not just numerically "free".
      const next = await pool.compress(file);
      expect(next.compressedSize).toBeGreaterThan(0);
    } finally {
      pool.destroy();
    }
  });
});

describe('createPool() — a real per-job timeout recovers structurally', () => {
  it('rejects with kind: timeout and replaces the worker', async () => {
    const pool = createPool({ size: 1, timeoutMs: 1 }); // guaranteed to fire before any real decode/encode
    try {
      const file = await fetchBlob(sampleJpgUrl, 'image/jpeg', 'sample.jpg');
      await expect(pool.compress(file)).rejects.toMatchObject({ kind: 'timeout' });
      await vi.waitFor(() => expect(pool.stats()).toMatchObject({ size: 1, busy: 0 }), { interval: 2 });
      expect(pool.stats().recoveries).toBeGreaterThanOrEqual(1);
    } finally {
      pool.destroy();
    }
  });
});

describe('createPool() — fallback path, forced', () => {
  it('produces correct results with Worker/OffscreenCanvas support forced off', async () => {
    const realOffscreenCanvas = globalThis.OffscreenCanvas;
    delete globalThis.OffscreenCanvas;
    try {
      expect(isPoolSupported()).toBe(false);
      const pool = createPool();
      expect(pool.stats()).toEqual({ size: 0, busy: 0, queued: 0, recoveries: 0 });

      const file = await fetchBlob(sampleJpgUrl, 'image/jpeg', 'sample.jpg');
      const result = await pool.compress(file, { format: 'auto' });
      expect(result.compressedSize).toBeGreaterThan(0);
      expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);

      const batch = await pool.compressMany([file, file]);
      expect(batch.every((r) => r.status === 'fulfilled')).toBe(true);
    } finally {
      globalThis.OffscreenCanvas = realOffscreenCanvas;
    }
  });
});
