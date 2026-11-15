import { compress as compressOne, DEFAULT_MAX_INPUT_PIXELS } from './compress.js';
import { decodeHeicToBitmap } from './heic.js';
import { ensureCapabilities } from './platform.js';
import { probeDimensions } from './probe.js';
import { detectFormat, resultFile } from './utils.js';

/**
 * A fixed pool of compression workers, for running many compressions in
 * parallel off the main thread. `createPool()` never throws for lack of
 * Worker support (or a CSP that blocks worker construction) — it falls back
 * to a correct, serial, main-thread implementation with the exact same
 * shape, so a host never branches on which one it got (see
 * `createWorkerPool` below).
 *
 * Generalizes compresso-app's proven `engine/pool.ts` + `engine/worker.ts`,
 * plus a resilience subsystem that single internal app didn't need: a worker
 * can crash natively (OOM, driver fault) or be silently suspended by the OS
 * (iOS backgrounding a tab), and a cooperative postMessage protocol alone has
 * no way to detect either — both would otherwise strand a job, and a pool
 * slot, forever. See `failSlot` below.
 */

/**
 * The longest a job may go without a progress message, for a photo up to
 * PIXELS_PER_TIMEOUT; bigger photos get proportionally longer (PERF-01). A
 * job that keeps reporting progress is never cut off, however long it takes.
 */
const DEFAULT_TIMEOUT_MS = 30_000;
const PIXELS_PER_TIMEOUT = 12_000_000;
/** Pixels per byte of a typical photo, for files whose header probe.js can't read (HEIC, AVIF). */
const PIXELS_PER_BYTE = 6;
/** The longest delay setTimeout honours; a longer one fires at once. */
const MAX_TIMER_MS = 2 ** 31 - 1;
/** Replacements for workers that crash one after another, before the pool gives up on workers. */
const MAX_CRASH_REPLACEMENTS = 2;
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

// `heicToUrl` is still accepted and does nothing: workers no longer load the codec.
export function createPool({ size, workerUrl, maxQueueLength = Infinity, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const pool = (reason) => createWorkerPool(
    reason ? 0 : size ?? defaultPoolSize(),
    workerUrl ?? DEFAULT_WORKER_URL,
    maxQueueLength,
    timeoutMs,
    reason
  );
  if (!isPoolSupported()) return pool('workers-unsupported');
  try {
    return pool(null);
  } catch {
    // Most likely a CSP blocking worker construction (see README's "Batch &
    // Workers" section) — a restricted host still gets correct, serial
    // behavior instead of an uncaught throw.
    return pool('worker-blocked');
  }
}

/** Aggregate per-file progress into a `compressMultiple`-shaped batch event. */
function wrapProgress(total, onProgress) {
  const progressByIndex = new Array(total).fill(0);
  return (fileIndex, progress, stage) => {
    progressByIndex[fileIndex] = progress;
    const overallProgress = progressByIndex.reduce((sum, p) => sum + p, 0) / total;
    onProgress?.({ progress, stage, fileIndex, totalFiles: total, overallProgress });
  };
}

function poolError(message, kind) {
  return Object.assign(new Error(message), { kind });
}

/**
 * The pool. Without workers (`reason` says why: none in this environment, or
 * none allowed to start) it has no slots and runs every job on the main
 * thread, one at a time, with the same shape, so a host never branches on
 * which one it got. That is the concrete form of "degrades gracefully": the
 * degradation lives here, once, instead of in every consumer.
 */
function createWorkerPool(size, workerUrl, maxQueueLength, timeoutMs, reason) {
  let seq = 0;
  let recoveries = 0;
  let caps = null;
  let capsPromise = null;
  // `reason`: why the pool runs on the main thread, given up on workers or
  // never had them; null while it uses them.
  let crashesInARow = 0;
  const queue = [];
  const slots = [];

  function spawn() {
    const worker = new Worker(workerUrl, { type: 'module' });
    worker.onmessage = (e) => receive(worker, e.data);
    // Failures a cooperative postMessage protocol cannot self-report: a
    // native crash (onerror) or an undeserializable message (onmessageerror,
    // e.g. a worker that died mid-postMessage). Both are treated as fatal to
    // that worker — see crash.
    worker.onerror = () => crash(slotFor(worker), 'Worker crashed unexpectedly');
    worker.onmessageerror = () => crash(slotFor(worker), 'Worker sent an unreadable message');
    return worker;
  }

  // Spawn eagerly (matches the reference implementation) so a CSP-blocked
  // `new Worker()` throws here, synchronously, where createPool() can catch
  // it and fall back — rather than surfacing later on the first compress().
  try {
    for (let i = 0; i < size; i++) slots.push({ worker: spawn(), task: null, ready: false });
  } catch (err) {
    for (const slot of slots) slot.worker.terminate();
    throw err;
  }

  function slotFor(worker) {
    return slots.find((s) => s.worker === worker);
  }

  /**
   * Run a job on the main thread once the pool has given up on workers. Jobs
   * run one at a time, as in the fallback pool: each holds a decoded bitmap,
   * and a batch all at once could run the tab out of memory.
   */
  let mainThread = Promise.resolve();
  const onMainThread = (file, options) =>
    (mainThread = mainThread.catch(() => {}).then(() => compressOne(file, options)));

  function receive(worker, msg) {
    const slot = slotFor(worker);
    // worker.js posts `ready` once its module has loaded; see crash. A
    // retired worker's messages never get here: retire() drops its handler.
    if (msg.type === 'ready') return void (slot.ready = true);
    // Guards against a late message from a just-cancelled or just-timed-out
    // job being misattributed to whatever new job this worker slot picks up
    // next. Load-bearing, not incidental — preserved exactly from the
    // reference implementation (see the plan's §3.1/§4.6).
    if (!slot?.task || slot.task.id !== msg.id) return;

    // The worker can't read this HEIC natively: decode it here, with the
    // app's own heic-to, and hand the worker the bitmap (see worker.js).
    if (msg.type === 'decode-heic') {
      return void decodeHeicToBitmap(slot.task.file).then(
        (image) => worker.postMessage({ type: 'heic-decoded', id: msg.id, image }, [image]),
        (err) => worker.postMessage({ type: 'heic-decoded', id: msg.id, message: err.message })
      );
    }
    if (msg.type === 'progress') {
      watch(slot);
      slot.task.options.onProgress?.({ progress: msg.progress, stage: msg.stage });
      return;
    }

    clearTimeout(slot.timeoutHandle);
    const task = slot.task;
    slot.task = null;
    crashesInARow = 0;
    if (msg.type === 'done') task.resolve(toResult(task.file, msg.result));
    else task.reject(poolError(msg.message, msg.kind));
    pump();
  }

  /** Stop a slot's worker for good: no timer, no handlers. */
  function retire(slot) {
    clearTimeout(slot.timeoutHandle);
    slot.worker.onmessage = slot.worker.onerror = slot.worker.onmessageerror = null;
    slot.worker.terminate();
  }

  /** Crash or timeout: reject the in-flight job (if any), replace the worker. */
  function failSlot(slot, kind, message) {
    if (!slot) return; // already replaced/cleared by a concurrent failure or destroy()
    slot.task?.reject(poolError(message, kind));
    retire(slot);
    slot.task = null;
    slot.ready = false;
    slot.worker = spawn();
    recoveries++;
    pump();
  }

  /**
   * A worker that fails before it is ready can't load at all (a 404 or
   * blocked worker URL, a broken bundle), and every replacement would fail
   * the same way, in a loop (PKG-01). The pool then gives up on workers.
   * A worker that crashes after loading rejects its own job and is
   * replaced, but only MAX_CRASH_REPLACEMENTS times in a row.
   */
  function crash(slot, message) {
    if (!slot) return;
    if (!slot.ready) return giveUp('worker-failed-to-load');
    if (crashesInARow++ < MAX_CRASH_REPLACEMENTS) return failSlot(slot, 'generic', message);
    slot.task?.reject(poolError(message, 'generic'));
    slot.task = null;
    giveUp('worker-crashed-repeatedly');
  }

  /** Retire every worker; queued and in-flight jobs carry on on the main thread, in order. */
  function giveUp(why) {
    reason = why;
    const tasks = [...slots.map((slot) => slot.task).filter(Boolean), ...queue.splice(0)];
    slots.forEach(retire);
    slots.length = 0;
    for (const task of tasks) onMainThread(task.file, task.options).then(task.resolve, task.reject);
  }

  /** (Re)start a busy slot's watchdog: the job has `timeoutMs`, scaled to its photo, until its next message. */
  function watch(slot) {
    clearTimeout(slot.timeoutHandle);
    if (timeoutMs !== Infinity) {
      slot.timeoutHandle = setTimeout(() => failSlot(slot, 'timeout', 'Compression timed out'), Math.min(timeoutMs * slot.task.scale, MAX_TIMER_MS));
    }
  }

  function pump() {
    for (const slot of slots) {
      if (slot.task || queue.length === 0) continue;
      const task = queue.shift();
      slot.task = task;
      watch(slot);
      slot.worker.postMessage({
        type: 'run', id: task.id, file: task.file, params: paramsFor(task.options), caps,
      });
    }
  }

  function run(id, file, options) {
    return new Promise((resolve, reject) => {
      if (queue.length >= maxQueueLength) {
        reject(poolError('Pool queue is full', 'queue-full'));
        return;
      }
      const task = { id, file, options, scale: silenceScale(file?.size * PIXELS_PER_BYTE, options), resolve, reject };
      // The header gives the real pixel count a moment later; the next
      // progress message restarts the watchdog with it.
      if (file instanceof Blob) {
        probeDimensions(file).then((size) => size && (task.scale = silenceScale(size.width * size.height, options)), () => {});
      }
      queue.push(task);
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
    clearTimeout(slot.timeoutHandle);
    slot.task.reject(poolError('Compression cancelled', 'aborted'));
    slot.task = null;
    pump();
  }

  function destroy() {
    for (const task of queue.splice(0)) task.reject(poolError('Compression cancelled', 'aborted'));
    for (const slot of slots) {
      retire(slot);
      slot.task?.reject(poolError('Compression cancelled', 'aborted'));
    }
    slots.length = 0;
  }

  function stats() {
    return {
      size: slots.length, busy: slots.filter((s) => s.task).length, queued: queue.length, recoveries,
      mode: reason ? 'main-thread' : 'workers', reason,
    };
  }

  // `{ ...options }`: a copy, taken at the call, so a caller that reuses its
  // options object can't change a job that is still waiting.
  async function compress(file, { ...options } = {}) {
    caps ??= await (capsPromise ??= ensureCapabilities());
    // SVG too: a worker can't decode it, and the main thread returns it as it is.
    if (reason || detectFormat(file || '') === 'svg') return onMainThread(file, options);
    if (options.signal?.aborted) throw poolError('Compression cancelled', 'aborted');

    const id = `job-${++seq}`;
    const onAbort = () => cancel(id);
    options.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      return await run(id, file, options);
    } finally {
      options.signal?.removeEventListener('abort', onAbort);
    }
  }

  async function compressMany(files, options = {}, onProgress) {
    if (!Array.isArray(files)) throw new TypeError('compressMany() expects an array of files');
    const report = wrapProgress(files.length, onProgress);
    return Promise.allSettled(
      files.map((file, i) => compress(file, { ...options, onProgress: (e) => report(i, e.progress, e.stage) }))
    );
  }

  return { compress, compressMany, cancel, destroy, stats };
}

/**
 * How many `timeoutMs` a job of this many pixels may stay silent: one per 12 MP,
 * at least one (`|| 1`: a URL source). Pixels count up to the job's
 * `maxInputPixels`, since a bigger photo is refused once its header is read, so
 * a crafted header can't stretch the watchdog to hours.
 */
const silenceScale = (pixels, options) =>
  Math.max(1, Math.min(pixels, options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS) / PIXELS_PER_TIMEOUT || 1);

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
    file: resultFile(source, blob, rest),
    blob,
    url: URL.createObjectURL(blob),
    ...rest,
  };
}
