import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Pure scheduling/resilience logic is what's under test here, not real image
// decoding — mock compress.js (the fallback path's engine) and platform.js's
// capability probe (pool.js's only platform.js dependency) so everything runs
// in plain Node against a dependency-injected mock Worker, matching this
// project's established mocking style (see compress-guard.test.js).
vi.mock('../src/compress.js', () => ({ compress: vi.fn() }));
vi.mock('../src/platform.js', () => ({
  ensureCapabilities: vi.fn().mockResolvedValue({ avif: false, webp: false }),
  capabilities: () => ({ avif: false, webp: false }),
}));

const { compress: mockCompressOne } = await import('../src/compress.js');
const { ensureCapabilities: mockEnsureCapabilities } = await import('../src/platform.js');
const { isPoolSupported, defaultPoolSize, createPool } = await import('../src/pool.js');

/** A dependency-injected stand-in for the real `Worker`, per §7.2. */
class MockWorker {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
    this.posted = [];
    this.terminated = false;
    MockWorker.instances.push(this);
  }
  postMessage(msg) {
    this.posted.push(msg);
  }
  terminate() {
    this.terminated = true;
  }
  respond(msg) {
    this.onmessage?.({ data: msg });
  }
}
MockWorker.instances = [];

/** A Worker stand-in whose construction fails, simulating a CSP that blocks worker-src. */
class ThrowingWorker {
  constructor() {
    throw new DOMException('Blocked by Content-Security-Policy', 'SecurityError');
  }
}

function doneResult(overrides = {}) {
  return {
    blob: new Blob(['compressed']),
    width: 100,
    height: 100,
    originalWidth: 200,
    originalHeight: 200,
    originalSize: 1000,
    compressedSize: 500,
    savings: 50,
    format: 'jpeg',
    mimeType: 'image/jpeg',
    ...overrides,
  };
}

// Node's global URL lacks the two Blob-URL statics browsers provide.
if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock-url';
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};

beforeEach(() => {
  MockWorker.instances = [];
  mockCompressOne.mockReset();
  mockEnsureCapabilities.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('isPoolSupported()', () => {
  it('is true when both Worker and OffscreenCanvas exist', () => {
    vi.stubGlobal('Worker', MockWorker);
    vi.stubGlobal('OffscreenCanvas', class {});
    expect(isPoolSupported()).toBe(true);
  });

  it('is false without Worker (undefined in plain Node)', () => {
    vi.stubGlobal('OffscreenCanvas', class {});
    expect(isPoolSupported()).toBe(false);
  });

  it('is false without OffscreenCanvas (undefined in plain Node)', () => {
    vi.stubGlobal('Worker', MockWorker);
    expect(isPoolSupported()).toBe(false);
  });
});

describe('defaultPoolSize()', () => {
  it('uses hardwareConcurrency, capped at 8', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 16 });
    expect(defaultPoolSize()).toBe(8);
  });

  it('falls back to 4 cores when hardwareConcurrency is unavailable', () => {
    vi.stubGlobal('navigator', {});
    expect(defaultPoolSize()).toBe(4);
  });

  it('caps at 4 on a detected low-memory device (deviceMemory <= 4)', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 8, deviceMemory: 2 });
    expect(defaultPoolSize()).toBe(4);
  });

  it('ignores deviceMemory above the low-memory threshold', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 8, deviceMemory: 8 });
    expect(defaultPoolSize()).toBe(8);
  });
});

describe('createPool() — fallback path (no Worker/OffscreenCanvas support)', () => {
  it('compress() delegates directly to compress.js, options untouched', async () => {
    const file = new Blob(['x']);
    mockCompressOne.mockResolvedValueOnce('RESULT');
    const pool = createPool();
    await expect(pool.compress(file, { quality: 0.5 })).resolves.toBe('RESULT');
    expect(mockCompressOne).toHaveBeenCalledWith(file, { quality: 0.5 });
  });

  it('compressMany() runs serially and returns a Promise.allSettled-shaped array, in order', async () => {
    const calls = [];
    mockCompressOne.mockImplementation(async (file, options) => {
      calls.push(file);
      if (file === 'fails') throw new Error('boom');
      options.onProgress?.({ progress: 1, stage: 'done' });
      return `ok:${file}`;
    });
    const pool = createPool();
    const result = await pool.compressMany(['a', 'fails', 'c']);
    expect(result).toEqual([
      { status: 'fulfilled', value: 'ok:a' },
      { status: 'rejected', reason: expect.any(Error) },
      { status: 'fulfilled', value: 'ok:c' },
    ]);
    expect(calls).toEqual(['a', 'fails', 'c']); // serial, input order
  });

  it('compressMany() reports aggregated batch progress, mirroring compressMultiple', async () => {
    mockCompressOne.mockImplementation(async (file, options) => {
      options.onProgress?.({ progress: 1, stage: 'done' });
      return file;
    });
    const events = [];
    const pool = createPool();
    await pool.compressMany(['a', 'b'], {}, (e) => events.push(e));
    expect(events).toEqual([
      { progress: 1, stage: 'done', fileIndex: 0, totalFiles: 2, overallProgress: 0.5 },
      { progress: 1, stage: 'done', fileIndex: 1, totalFiles: 2, overallProgress: 1 },
    ]);
  });

  it('compressMany() rejects for a non-array argument, without touching compress()', async () => {
    const pool = createPool();
    await expect(pool.compressMany('nope')).rejects.toThrow(TypeError);
    expect(mockCompressOne).not.toHaveBeenCalled();
  });

  it('cancel()/destroy()/stats() are safe no-ops with the zeroed shape', () => {
    const pool = createPool();
    expect(() => pool.cancel('anything')).not.toThrow();
    expect(() => pool.destroy()).not.toThrow();
    expect(pool.stats()).toEqual({ size: 0, busy: 0, queued: 0, recoveries: 0 });
  });
});

describe('createPool() — falls back when worker construction throws (e.g. CSP-blocked)', () => {
  it('returns a working fallback pool instead of throwing', async () => {
    vi.stubGlobal('Worker', ThrowingWorker);
    vi.stubGlobal('OffscreenCanvas', class {});
    mockCompressOne.mockResolvedValueOnce('RESULT');

    const pool = createPool({ size: 2 });
    expect(pool.stats()).toEqual({ size: 0, busy: 0, queued: 0, recoveries: 0 });
    await expect(pool.compress(new Blob(['x']))).resolves.toBe('RESULT');
  });
});

describe('createPool() — real worker pool', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', MockWorker);
    vi.stubGlobal('OffscreenCanvas', class {});
  });

  it('spawns exactly `size` workers up front', () => {
    createPool({ size: 3 });
    expect(MockWorker.instances).toHaveLength(3);
  });

  it('dispatches a run message with a monotonic id, allowlisted params, and resolved caps', async () => {
    mockEnsureCapabilities.mockResolvedValueOnce({ avif: true, webp: false });
    const pool = createPool({ size: 1 });
    const file = new Blob(['x']);

    pool.compress(file, { quality: 0.5, format: 'jpeg', onProgress: () => {}, extraneous: 'drop-me' });
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));

    expect(MockWorker.instances[0].posted[0]).toEqual({
      type: 'run',
      id: 'job-1',
      file,
      params: { quality: 0.5, format: 'jpeg' },
      caps: { avif: true, webp: false },
      heicToUrl: expect.any(String),
    });
  });

  it('lets a host override where the worker imports the lazy HEIC codec from', async () => {
    const pool = createPool({ size: 1, heicToUrl: 'https://example.com/heic-to.js' });
    const file = new Blob(['x']);

    pool.compress(file, {});
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));

    expect(MockWorker.instances[0].posted[0].heicToUrl).toBe('https://example.com/heic-to.js');
  });

  it('resolves with a reconstructed CompressResult (file + url) on a done message', async () => {
    const pool = createPool({ size: 1 });
    const file = new File([new Blob(['x'])], 'photo.png');

    const promise = pool.compress(file);
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));
    const { id } = MockWorker.instances[0].posted[0];
    MockWorker.instances[0].respond({ type: 'done', id, result: doneResult({ format: 'jpeg', mimeType: 'image/jpeg' }) });

    const result = await promise;
    expect(result.file).toBeInstanceOf(File);
    expect(result.file.name).toBe('photo.jpg');
    expect(result.file.type).toBe('image/jpeg');
    expect(result.url).toMatch(/^blob:/);
    expect(result.compressedSize).toBe(500);
    expect(result.savings).toBe(50);
  });

  it('relays progress events (including stage) to onProgress', async () => {
    const pool = createPool({ size: 1 });
    const events = [];
    pool.compress(new Blob(['x']), { onProgress: (e) => events.push(e) });
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));
    const { id } = MockWorker.instances[0].posted[0];

    MockWorker.instances[0].respond({ type: 'progress', id, progress: 0.4, stage: 'compressing' });
    expect(events).toEqual([{ progress: 0.4, stage: 'compressing' }]);
  });

  it('rejects on an error message, preserving the worker-reported kind', async () => {
    const pool = createPool({ size: 1 });
    const promise = pool.compress(new Blob(['x']));
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));
    const { id } = MockWorker.instances[0].posted[0];

    MockWorker.instances[0].respond({ type: 'error', id, message: 'Image exceeds the maximum decodable size', kind: 'too-large' });
    await expect(promise).rejects.toMatchObject({ kind: 'too-large', message: 'Image exceeds the maximum decodable size' });
  });

  it('ignores a stale message whose id no longer matches the slot\'s current task', async () => {
    const pool = createPool({ size: 1 });
    const p1 = pool.compress(new Blob(['1']));
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));
    const staleId = MockWorker.instances[0].posted[0].id;

    pool.cancel(staleId); // frees the slot locally; see the cancel() describe block below
    await expect(p1).rejects.toMatchObject({ kind: 'aborted' });
    expect(MockWorker.instances[0].posted).toHaveLength(2); // [0] run, [1] abort

    const p2 = pool.compress(new Blob(['2']));
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(3));
    const currentId = MockWorker.instances[0].posted[2].id;
    expect(currentId).not.toBe(staleId);

    // The worker's late response to the already-cancelled job must not settle p2.
    MockWorker.instances[0].respond({ type: 'done', id: staleId, result: doneResult() });
    MockWorker.instances[0].respond({ type: 'done', id: currentId, result: doneResult() });
    await expect(p2).resolves.toBeDefined();
  });

  it('queues work beyond pool size and dispatches it once a slot frees up', async () => {
    const pool = createPool({ size: 1 });
    const p1 = pool.compress(new Blob(['1']));
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));

    const p2 = pool.compress(new Blob(['2']));
    expect(pool.stats()).toMatchObject({ size: 1, busy: 1, queued: 1 });
    expect(MockWorker.instances[0].posted).toHaveLength(1); // not dispatched yet

    const firstId = MockWorker.instances[0].posted[0].id;
    MockWorker.instances[0].respond({ type: 'done', id: firstId, result: doneResult() });
    await p1;

    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(2));
    expect(pool.stats()).toMatchObject({ size: 1, busy: 1, queued: 0 });
    const secondId = MockWorker.instances[0].posted[1].id;
    MockWorker.instances[0].respond({ type: 'done', id: secondId, result: doneResult() });
    await expect(p2).resolves.toBeDefined();
  });

  it('rejects new work with kind: queue-full once maxQueueLength is exceeded', async () => {
    const pool = createPool({ size: 1, maxQueueLength: 1 });
    pool.compress(new Blob(['1'])); // occupies the only worker
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));

    pool.compress(new Blob(['2'])); // fills the 1-slot queue
    await expect(pool.compress(new Blob(['3']))).rejects.toMatchObject({ kind: 'queue-full' });
  });
});

describe('cancel()', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', MockWorker);
    vi.stubGlobal('OffscreenCanvas', class {});
  });

  it('rejects and drops a queued task without ever dispatching it', async () => {
    const pool = createPool({ size: 1 });
    pool.compress(new Blob(['1']));
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));

    const p2 = pool.compress(new Blob(['2']));
    await vi.waitFor(() => expect(pool.stats().queued).toBe(1));
    pool.cancel('job-2');

    await expect(p2).rejects.toMatchObject({ kind: 'aborted' });
    expect(pool.stats().queued).toBe(0);
    expect(MockWorker.instances[0].posted).toHaveLength(1); // job-2 never dispatched
  });

  it('for an in-flight task: tells the worker to abort AND immediately frees the slot', async () => {
    const pool = createPool({ size: 1 });
    const p1 = pool.compress(new Blob(['1']));
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));
    const id = MockWorker.instances[0].posted[0].id;

    pool.cancel(id);
    await expect(p1).rejects.toMatchObject({ kind: 'aborted' });
    expect(MockWorker.instances[0].posted).toContainEqual({ type: 'abort', id });
    expect(pool.stats()).toMatchObject({ busy: 0, queued: 0 });
    expect(MockWorker.instances[0].terminated).toBe(false); // cancel ≠ crash; the worker itself is reused

    // The freed slot must accept new work right away, not stay stuck.
    const p2 = pool.compress(new Blob(['2']));
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(3));
    const newId = MockWorker.instances[0].posted[2].id;
    MockWorker.instances[0].respond({ type: 'done', id: newId, result: doneResult() });
    await expect(p2).resolves.toBeDefined();
  });

  it('via AbortSignal produces the same outcome as calling cancel() directly', async () => {
    const pool = createPool({ size: 1 });
    const controller = new AbortController();
    const promise = pool.compress(new Blob(['1']), { signal: controller.signal });
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));

    controller.abort();
    await expect(promise).rejects.toMatchObject({ kind: 'aborted' });
    expect(pool.stats()).toMatchObject({ busy: 0 });
  });

  it('rejects immediately for an already-aborted signal, without dispatching', async () => {
    const pool = createPool({ size: 1 });
    const controller = new AbortController();
    controller.abort();
    await expect(pool.compress(new Blob(['1']), { signal: controller.signal })).rejects.toMatchObject({ kind: 'aborted' });
    expect(MockWorker.instances[0].posted).toHaveLength(0);
  });

  it('is a no-op for an unknown id', async () => {
    const pool = createPool({ size: 1 });
    expect(() => pool.cancel('never-existed')).not.toThrow();
  });
});

describe('resilience: crash and timeout recovery', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', MockWorker);
    vi.stubGlobal('OffscreenCanvas', class {});
  });

  it('onerror: rejects the in-flight job with kind generic, replaces the worker, counts a recovery', async () => {
    const pool = createPool({ size: 1 });
    const promise = pool.compress(new Blob(['1']));
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));
    const dead = MockWorker.instances[0];

    dead.onerror();

    await expect(promise).rejects.toMatchObject({ kind: 'generic' });
    expect(dead.terminated).toBe(true);
    expect(MockWorker.instances).toHaveLength(2);
    expect(pool.stats()).toMatchObject({ size: 1, busy: 0, recoveries: 1 });
  });

  it('onmessageerror: same recovery as onerror', async () => {
    const pool = createPool({ size: 1 });
    const promise = pool.compress(new Blob(['1']));
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));

    MockWorker.instances[0].onmessageerror();

    await expect(promise).rejects.toMatchObject({ kind: 'generic' });
    expect(pool.stats().recoveries).toBe(1);
  });

  it('a crash while idle still replaces the worker without touching the queue', () => {
    const pool = createPool({ size: 1 });
    const idle = MockWorker.instances[0];
    expect(() => idle.onerror()).not.toThrow();
    expect(idle.terminated).toBe(true);
    expect(pool.stats()).toMatchObject({ size: 1, recoveries: 1 });
  });

  it('timeoutMs: replaces a worker that never responds, and the replacement retries the queue', async () => {
    vi.useFakeTimers();
    const pool = createPool({ size: 1, timeoutMs: 1000 });

    const p1 = pool.compress(new Blob(['1']));
    await vi.advanceTimersByTimeAsync(0);
    expect(MockWorker.instances[0].posted).toHaveLength(1);
    const stuck = MockWorker.instances[0];

    const p2 = pool.compress(new Blob(['2'])); // queues behind the stuck job
    await vi.advanceTimersByTimeAsync(0);
    expect(pool.stats().queued).toBe(1);

    const rejection = expect(p1).rejects.toMatchObject({ kind: 'timeout' }); // attach before advancing, see below
    await vi.advanceTimersByTimeAsync(1000);
    await rejection;
    expect(stuck.terminated).toBe(true);
    expect(MockWorker.instances).toHaveLength(2);
    expect(pool.stats().recoveries).toBe(1);

    await vi.advanceTimersByTimeAsync(0); // pump() retries the queue onto the replacement
    expect(MockWorker.instances[1].posted).toHaveLength(1);
    const newId = MockWorker.instances[1].posted[0].id;
    MockWorker.instances[1].respond({ type: 'done', id: newId, result: doneResult() });
    await expect(p2).resolves.toBeDefined();
  });

  it('timeoutMs: Infinity disables the timeout entirely', async () => {
    vi.useFakeTimers();
    const pool = createPool({ size: 1, timeoutMs: Infinity });
    pool.compress(new Blob(['1']));
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(pool.stats().recoveries).toBe(0);
    expect(MockWorker.instances).toHaveLength(1);
  });

  it('a late done message after a timeout is discarded by the stale-message guard', async () => {
    vi.useFakeTimers();
    const pool = createPool({ size: 1, timeoutMs: 1000 });
    const p1 = pool.compress(new Blob(['1']));
    await vi.advanceTimersByTimeAsync(0);
    const timedOutId = MockWorker.instances[0].posted[0].id;
    const stuck = MockWorker.instances[0];

    const rejection = expect(p1).rejects.toMatchObject({ kind: 'timeout' }); // attach before advancing, see above
    await vi.advanceTimersByTimeAsync(1000);
    await rejection;

    // The original (terminated, but still-referenced-by-the-test) worker's
    // late response must not throw or resolve anything now that its slot
    // belongs to the replacement.
    expect(() => stuck.respond({ type: 'done', id: timedOutId, result: doneResult() })).not.toThrow();
  });
});

describe('destroy()', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', MockWorker);
    vi.stubGlobal('OffscreenCanvas', class {});
  });

  it('rejects every queued and in-flight job, and terminates every worker', async () => {
    const pool = createPool({ size: 1 });
    const p1 = pool.compress(new Blob(['1']));
    await vi.waitFor(() => expect(MockWorker.instances[0].posted).toHaveLength(1));
    const p2 = pool.compress(new Blob(['2'])); // queued

    pool.destroy();

    await expect(p1).rejects.toMatchObject({ kind: 'aborted' });
    await expect(p2).rejects.toMatchObject({ kind: 'aborted' });
    expect(MockWorker.instances[0].terminated).toBe(true);
    expect(pool.stats()).toEqual({ size: 0, busy: 0, queued: 0, recoveries: 0 });
  });
});

describe('compressMany() — worker pool path', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', MockWorker);
    vi.stubGlobal('OffscreenCanvas', class {});
  });

  it('returns a Promise.allSettled-shaped array, one entry per file, in input order', async () => {
    const pool = createPool({ size: 3 });
    const resultPromise = pool.compressMany([new Blob(['a']), new Blob(['b']), new Blob(['c'])]);

    await vi.waitFor(() => {
      expect(MockWorker.instances[0].posted).toHaveLength(1);
      expect(MockWorker.instances[1].posted).toHaveLength(1);
      expect(MockWorker.instances[2].posted).toHaveLength(1);
    });

    MockWorker.instances[0].respond({ type: 'done', id: MockWorker.instances[0].posted[0].id, result: doneResult() });
    MockWorker.instances[1].respond({ type: 'error', id: MockWorker.instances[1].posted[0].id, message: 'nope', kind: 'decode' });
    MockWorker.instances[2].respond({ type: 'done', id: MockWorker.instances[2].posted[0].id, result: doneResult() });

    const result = await resultPromise;
    expect(result.map((r) => r.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
    expect(result[1].reason).toMatchObject({ kind: 'decode' });
  });

  it('rejects for a non-array argument, without spawning any dispatch', async () => {
    const pool = createPool({ size: 1 });
    await expect(pool.compressMany(42)).rejects.toThrow(TypeError);
    expect(MockWorker.instances[0].posted).toHaveLength(0);
  });
});
