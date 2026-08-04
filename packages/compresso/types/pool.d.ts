import type { CompressOptions, CompressResult, MultiProgressEvent } from './index';

/**
 * The union of every `kind` a pool/compress error may carry. A superset of
 * the single-file `compress()` path's kinds, extended with pool-specific
 * failure modes.
 */
export type ErrorKind = 'decode' | 'aborted' | 'unsupported' | 'too-large' | 'queue-full' | 'timeout' | 'generic';

/** Options for `createPool()`. All optional — sensible defaults apply. */
export interface PoolOptions {
  /** Number of workers to spawn. Default: `defaultPoolSize()`. */
  size?: number;
  /**
   * Override the worker script's URL — an escape hatch for bundlers that
   * can't resolve `new URL('./worker.js', import.meta.url)` correctly, or
   * for hosting the worker file under a specific CSP-nonce'd path. Default:
   * the built `worker.js` shipped alongside `pool.js`.
   */
  workerUrl?: string | URL;
  /**
   * Override where a worker loads the lazy HEIC codec chunk from — the same
   * class of escape hatch as `workerUrl`, for the same class of bundler/
   * hosting edge case. Most hosts never need this. Default: the built HEIC
   * codec chunk shipped alongside `pool.js`/`worker.js`.
   */
  heicToUrl?: string | URL;
  /**
   * Maximum number of jobs allowed to wait in the queue at once. Once
   * exceeded, further `compress()`/`compressMany()` calls reject immediately
   * with `kind: 'queue-full'` instead of growing the queue further. Default:
   * unbounded.
   */
  maxQueueLength?: number;
  /**
   * Milliseconds a single job may run before its worker is considered stuck
   * and replaced. Guards against a silently-suspended worker (e.g. iOS
   * backgrounding a tab) as well as a pathologically slow decode. Pass
   * `Infinity` to disable. Default: `30000`.
   */
  timeoutMs?: number;
}

/**
 * One outcome of a `compressMany()` batch — the standard
 * `Promise.allSettled()` result shape, so a failure in one file never fails
 * the whole batch.
 */
export type CompressManyResult =
  | { status: 'fulfilled'; value: CompressResult }
  | { status: 'rejected'; reason: Error & { kind?: ErrorKind } };

/** A snapshot of a pool's current load — deliberately minimal, for diagnostics/bug reports. */
export interface PoolStats {
  /** Number of workers in the pool (0 on the fallback path). */
  size: number;
  /** Number of workers currently running a job. */
  busy: number;
  /** Number of jobs waiting for a free worker. */
  queued: number;
  /** Running count of crash/timeout-triggered worker replacements since the pool was created. */
  recoveries: number;
}

/**
 * A fixed-size pool of workers for compressing many images in parallel, off
 * the main thread. Falls back to a correct, serial, main-thread
 * implementation in any environment without Worker/OffscreenCanvas support
 * (or where constructing a worker is blocked, e.g. by a page's CSP) — same
 * shape either way, so a host never needs to branch on which it got.
 */
export interface Pool {
  /** Compress one file through the pool (or the fallback path). */
  compress(source: File | Blob | string, options?: CompressOptions): Promise<CompressResult>;
  /**
   * Compress many files. Never rejects for an individual file's failure —
   * each input's outcome is reported as one entry in the returned array, in
   * input order. Only rejects for a caller error (e.g. a non-array `files`).
   */
  compressMany(
    files: (File | Blob | string)[],
    options?: CompressOptions,
    onProgress?: (event: MultiProgressEvent) => void
  ): Promise<CompressManyResult[]>;
  /** Cancel a queued or in-flight job by id. No-op for an unknown id. */
  cancel(id: string): void;
  /** Cancel every queued and in-flight job, then terminate all workers. */
  destroy(): void;
  /** A snapshot of the pool's current load. */
  stats(): PoolStats;
}

/** Whether this environment can run the real worker pool (Worker + OffscreenCanvas). */
export function isPoolSupported(): boolean;

/**
 * A memory-aware default worker count: cores, capped at 8, and further
 * capped on detected low-memory devices where `navigator.deviceMemory` is
 * available (Chromium-family only; elsewhere the core-based cap is the
 * documented, known-imperfect default). Override with `createPool({ size })`
 * on hardware you know better than this heuristic can.
 */
export function defaultPoolSize(): number;

/**
 * Create a pool of workers for parallel image compression. Never throws for
 * lack of Worker support — it feature-detects and falls back to a serial,
 * main-thread implementation with the same shape. Also falls back if worker
 * construction itself is blocked (e.g. by a page's CSP).
 */
export function createPool(options?: PoolOptions): Pool;
