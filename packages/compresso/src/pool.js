import { compress as compressOne } from './compress.js';
import { ensureCapabilities } from './platform.js';
import { generateFileName } from './utils.js';

/**
 * A fixed pool of compression workers, for running many compressions in
 * parallel off the main thread. `createPool()` never throws for lack of
 * Worker support (or a CSP that blocks worker construction) — it falls back
 * to a correct, serial, main-thread implementation with the exact same
 * shape, so a host never branches on which one it got (see
 * `createFallbackPool` below).
 *
 * Generalizes compresso-app's proven `engine/pool.ts` + `engine/worker.ts`,
 * plus a resilience subsystem that single internal app didn't need: a worker
 * can crash natively (OOM, driver fault) or be silently suspended by the OS
 * (iOS backgrounding a tab), and a cooperative postMessage protocol alone has
 * no way to detect either — both would otherwise strand a job, and a pool
 * slot, forever. See `failSlot` below.
 */

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_WORKER_URL = new URL('./worker.js', import.meta.url);
const PARAM_KEYS = ['quality', 'format', 'maxWidth', 'maxHeight', 'maxSizeMB', 'maxInputPixels', 'backgroundColor'];

export function isPoolSupported() {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
}

/**
 * Memory-bound, not CPU-bound: every busy worker can be holding a decoded
 * ~12 MP bitmap. `navigator.deviceMemory` (Chromium-family only, coarse GB
 * buckets) refines the core-count-based cap where it's available; where it
 * isn't (Safari, Firefox), the core-based cap alone is the — imperfect,
 * documented — answer. A host targeting known low-RAM, high-core-count
 * hardware should pass an explicit, lower `size`.
 */
export function defaultPoolSize() {
  const nav = typeof navigator === 'undefined' ? {} : navigator;
  const cores = Math.max(1, Math.min(nav.hardwareConcurrency || 4, 8));
  const mem = nav.deviceMemory;
  return mem && mem <= 4 ? Math.min(cores, 4) : cores;
}

export function createPool({ size, workerUrl, maxQueueLength = Infinity, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!isPoolSupported()) return createFallbackPool();
  try {
    return createWorkerPool(
      size ?? defaultPoolSize(),
      workerUrl ?? DEFAULT_WORKER_URL,
      maxQueueLength,
      timeoutMs
    );
  } catch {
    // Most likely a CSP blocking worker construction (see README's "Batch &
    // Workers" section) — a restricted host still gets correct, serial
    // behavior instead of an uncaught throw.
    return createFallbackPool();
  }
}

/** Aggregate per-file progress into a `compressMultiple`-shaped batch event. */
function wrapProgress(total, onProgress) {
  if (!onProgress) return () => {};
  const progressByIndex = new Array(total).fill(0);
  return (fileIndex, progress, stage) => {
    progressByIndex[fileIndex] = progress;
    const overallProgress = progressByIndex.reduce((sum, p) => sum + p, 0) / total;
    onProgress({ progress, stage, fileIndex, totalFiles: total, overallProgress });
  };
}

function invalidFilesError() {
  return new TypeError('compressMany() expects an array of files');
}

/* ------------------------------------------------------------ fallback pool */

/**
 * The concrete implementation of "gracefully degrades depending on the
 * environment": real parallelism where the platform supports it, correct,
 * unblocked, serial behavior everywhere else — with zero application-level
 * `if` statements, because the degradation lives here, once, instead of
 * being re-implemented by every consumer.
 */
function createFallbackPool() {
  return {
    compress: (file, options = {}) => compressOne(file, options),
    async compressMany(files, options = {}, onProgress) {
      if (!Array.isArray(files)) throw invalidFilesError();
      const report = wrapProgress(files.length, onProgress);
      const out = [];
      for (let i = 0; i < files.length; i++) {
        try {
          const value = await compressOne(files[i], {
            ...options,
            onProgress: (e) => report(i, e.progress, e.stage),
          });
          out.push({ status: 'fulfilled', value });
        } catch (reason) {
          out.push({ status: 'rejected', reason });
        }
      }
      return out;
    },
    cancel() {},
    destroy() {},
    stats: () => ({ size: 0, busy: 0, queued: 0, recoveries: 0 }),
  };
}

/* --------------------------------------------------------------- real pool */

function poolError(message, kind) {
  return Object.assign(new Error(message), { kind });
}

function createWorkerPool(size, workerUrl, maxQueueLength, timeoutMs) {
  let seq = 0;
  let recoveries = 0;
  let caps = null;
  let capsPromise = null;
  const queue = [];
  const slots = [];

  function spawn() {
    const worker = new Worker(workerUrl, { type: 'module' });
    worker.onmessage = (e) => receive(worker, e.data);
    // Failures a cooperative postMessage protocol cannot self-report: a
    // native crash (onerror) or an undeserializable message (onmessageerror,
    // e.g. a worker that died mid-postMessage). Both are treated as fatal to
    // that worker — see failSlot.
    worker.onerror = () => failSlot(slotFor(worker), 'generic', 'Worker crashed unexpectedly');
    worker.onmessageerror = () => failSlot(slotFor(worker), 'generic', 'Worker sent an unreadable message');
    return worker;
  }

  // Spawn eagerly (matches the reference implementation) so a CSP-blocked
  // `new Worker()` throws here, synchronously, where createPool() can catch
  // it and fall back — rather than surfacing later on the first compress().
  try {
    for (let i = 0; i < size; i++) slots.push({ worker: spawn(), task: null, timeoutHandle: null });
  } catch (err) {
    for (const slot of slots) slot.worker.terminate();
    throw err;
  }

  function slotFor(worker) {
    return slots.find((s) => s.worker === worker);
  }

  function clearSlotTimeout(slot) {
    if (slot.timeoutHandle != null) {
      clearTimeout(slot.timeoutHandle);
      slot.timeoutHandle = null;
    }
  }

  function receive(worker, msg) {
    const slot = slotFor(worker);
    // Guards against a late message from a just-cancelled or just-timed-out
    // job being misattributed to whatever new job this worker slot picks up
    // next. Load-bearing, not incidental — preserved exactly from the
    // reference implementation (see the plan's §3.1/§4.6).
    if (!slot?.task || slot.task.id !== msg.id) return;

    if (msg.type === 'progress') {
      slot.task.onProgress(msg.progress, msg.stage);
      return;
    }

    clearSlotTimeout(slot);
    const task = slot.task;
    slot.task = null;
    if (msg.type === 'done') task.resolve(toResult(task.file, msg.result));
    else task.reject(poolError(msg.message, msg.kind));
    pump();
  }

  /** Crash or timeout: reject the in-flight job (if any), replace the worker. */
  function failSlot(slot, kind, message) {
    if (!slot) return; // already replaced/cleared by a concurrent failure or destroy()
    const task = slot.task;
    clearSlotTimeout(slot);
    slot.task = null;
    slot.worker.onmessage = null;
    slot.worker.onerror = null;
    slot.worker.onmessageerror = null;
    slot.worker.terminate();
    slot.worker = spawn();
    recoveries++;
    if (task) task.reject(poolError(message, kind));
    pump();
  }

  function pump() {
    for (const slot of slots) {
      if (slot.task || queue.length === 0) continue;
      const task = queue.shift();
      slot.task = task;
      if (timeoutMs !== Infinity) {
        slot.timeoutHandle = setTimeout(() => failSlot(slot, 'timeout', 'Compression timed out'), timeoutMs);
      }
      slot.worker.postMessage({
        type: 'run', id: task.id, file: task.file, params: task.params, caps,
      });
    }
  }

  function run(id, file, params, onProgress) {
    return new Promise((resolve, reject) => {
      if (queue.length >= maxQueueLength) {
        reject(poolError('Pool queue is full', 'queue-full'));
        return;
      }
      queue.push({ id, file, params, onProgress, resolve, reject });
      pump();
    });
  }

  /**
   * Drop a queued task, or signal an in-flight one to stop. Unlike the
   * reference implementation, the in-flight case also settles the task and
   * frees the slot immediately — waiting for a confirmation message would
   * hang forever, since a worker that observes its own abort deliberately
   * posts nothing back (see worker.js). This is safe precisely because of
   * the stale-message guard in `receive()` above: if the worker's aborted
   * job does eventually post something, its `id` will no longer match
   * whatever this slot has moved on to, and it's discarded.
   */
  function cancel(id) {
    const i = queue.findIndex((t) => t.id === id);
    if (i >= 0) {
      const [task] = queue.splice(i, 1);
      task.reject(poolError('Compression cancelled', 'aborted'));
      return;
    }
    const slot = slots.find((s) => s.task?.id === id);
    if (!slot) return;
    slot.worker.postMessage({ type: 'abort', id });
    clearSlotTimeout(slot);
    const task = slot.task;
    slot.task = null;
    task.reject(poolError('Compression cancelled', 'aborted'));
    pump();
  }

  function destroy() {
    for (const task of queue.splice(0)) task.reject(poolError('Compression cancelled', 'aborted'));
    for (const slot of slots) {
      clearSlotTimeout(slot);
      if (slot.task) slot.task.reject(poolError('Compression cancelled', 'aborted'));
      slot.worker.onmessage = null;
      slot.worker.onerror = null;
      slot.worker.onmessageerror = null;
      slot.worker.terminate();
    }
    slots.length = 0;
  }

  function stats() {
    return { size: slots.length, busy: slots.filter((s) => s.task).length, queued: queue.length, recoveries };
  }

  async function compress(file, options = {}) {
    caps ??= await (capsPromise ??= ensureCapabilities());
    if (options.signal?.aborted) throw poolError('Compression cancelled', 'aborted');

    const id = `job-${++seq}`;
    const onAbort = () => cancel(id);
    options.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      return await run(id, file, paramsFor(options), (progress, stage) => options.onProgress?.({ progress, stage }));
    } finally {
      options.signal?.removeEventListener('abort', onAbort);
    }
  }

  async function compressMany(files, options = {}, onProgress) {
    if (!Array.isArray(files)) throw invalidFilesError();
    const report = wrapProgress(files.length, onProgress);
    return Promise.allSettled(
      files.map((file, i) => compress(file, { ...options, onProgress: (e) => report(i, e.progress, e.stage) }))
    );
  }

  return { compress, compressMany, cancel, destroy, stats };
}

function paramsFor(options) {
  const params = {};
  for (const key of PARAM_KEYS) if (options[key] !== undefined) params[key] = options[key];
  return params;
}

/**
 * worker.js deliberately omits `url`/`file` from its `done` message (a
 * main-thread object URL is meaningless off-thread, and `file`/`blob` are
 * the same bytes) — reconstruct the full public `CompressResult` shape here,
 * on the main thread, the same way `compress.js`'s own pipeline does.
 */
function toResult(source, result) {
  const { blob, ...rest } = result;
  return {
    file: new File([blob], generateFileName(source, rest.format), { type: rest.mimeType }),
    blob,
    url: URL.createObjectURL(blob),
    ...rest,
  };
}
