import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isFormatSupported, isHeicSource, decodeHeic, type CompressResult } from 'compresso.js';
import { createPool, defaultPoolSize, type Pool } from 'compresso.js/pool';

export type Format = 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';

export type Params = {
  quality: number;
  format: Format;
  maxWidth: number | null;
  maxHeight: number | null;
  maxSizeMB: number | null;
};

// Matches compresso.js's own DEFAULT_MAX_DIMENSION (compress.js), which the
// library applies only on the Safari-JPEG-fallback path. Applying it more
// broadly has a real cost too (on-device encode time/memory), so it's only
// worth paying when there's good reason — see isLikelyLowEndAndroid and
// isLargeImage below. Absent that reason, the true default is full
// resolution, same as the library gives every WebP/AVIF-capable browser.
export const CAPPED_MAX_DIMENSION = 2048;

// A 24 MP frame is already a high-end phone/mirrorless output, not a
// typical snapshot — comfortably past the point where encoding it at full
// resolution on a weak device is the exact cost this cap exists to avoid.
const LARGE_IMAGE_MEGAPIXELS = 24;

export const DEFAULT_PARAMS: Params = {
  quality: 0.8,
  format: 'auto',
  maxWidth: null,
  maxHeight: null,
  maxSizeMB: null,
};

const cappedParams = (p: Params): Params => (
  { ...p, maxWidth: CAPPED_MAX_DIMENSION, maxHeight: CAPPED_MAX_DIMENSION }
);

// Computed once — every caller just needs "the defaults, capped or not."
const CAPPED_DEFAULT_PARAMS: Params = cappedParams(DEFAULT_PARAMS);
const defaultParamsFor = (capped: boolean): Params => (capped ? CAPPED_DEFAULT_PARAMS : DEFAULT_PARAMS);

// True only while none of the *size* fields have been decided or touched
// yet. Deliberately narrower than "the whole Params object is untouched":
// changing quality/format expresses no opinion about resolution, so it must
// not block the size-based auto-cap below. Once this is false, applying the
// cap would override an actual size choice (including "no limit, on purpose").
const dimensionsUntouched = (p: Params) =>
  p.maxWidth == null && p.maxHeight == null && p.maxSizeMB == null;

/**
 * Android, plus a device-reported RAM figure at or below 4 GB from
 * Chromium's Device Memory API (unsupported elsewhere, including all of
 * iOS — where it never fires). This is a direct signal, not one inferred
 * from a proxy like screen size or connection speed — but the API itself
 * returns an intentionally coarse, quantized estimate, not an exact reading,
 * so "Likely" in the name is honest, not a hedge to be tightened.
 */
function isLikelyLowEndAndroid(): boolean {
  if (!/Android/i.test(navigator.userAgent)) return false;
  const mem = (navigator as { deviceMemory?: number }).deviceMemory;
  return typeof mem === 'number' && mem <= 4;
}

// Measured pixels from a completed decode — real dimensions, not a pre-guess.
const isLargeImage = (width: number, height: number) =>
  width * height > LARGE_IMAGE_MEGAPIXELS * 1_000_000;

export type Caps = { avif: boolean; webp: boolean };

export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

export type Job = {
  id: string;
  file: File;
  previewUrl: string | null;
  status: JobStatus;
  progress: number;
  out: CompressResult | null;
  errorKind: 'decode' | 'generic' | null;
};

const uid = () => Math.random().toString(36).slice(2, 10);

const IMAGE_RE = /\.(jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i;
export const isImage = (f: File) => f.type.startsWith('image/') || IMAGE_RE.test(f.name);

/** Probed once, on the main thread, purely for UI purposes (the pool probes its
 *  own capabilities internally now — see compresso.js's §2.9). */
function probeCaps(): Caps {
  return { avif: isFormatSupported('avif'), webp: isFormatSupported('webp') };
}

function toOptions(p: Params, signal: AbortSignal, onProgress: (n: number) => void) {
  return {
    quality: p.quality,
    format: p.format,
    ...(p.maxWidth ? { maxWidth: p.maxWidth } : {}),
    ...(p.maxHeight ? { maxHeight: p.maxHeight } : {}),
    ...(p.maxSizeMB ? { maxSizeMB: p.maxSizeMB } : {}),
    signal,
    onProgress: (e: { progress: number }) => onProgress(e.progress),
  };
}

/**
 * A displayable URL for the ORIGINAL. Most browsers can't paint HEIC, so those get
 * decoded for preview; Safari/iOS, which can, use the file directly.
 */
async function previewUrlFor(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  if (!isHeicSource(file)) return url;

  const ok = await new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
  if (ok) return url;

  // This browser can't paint HEIC, so the preview has to be decoded. If that
  // fails we hand back the original URL rather than nothing: the compression
  // itself may still succeed, and a tile with no image at all reads as broken
  // when it isn't.
  try {
    const decoded = URL.createObjectURL(await decodeHeic(file));
    URL.revokeObjectURL(url);
    return decoded;
  } catch {
    return url;
  }
}

/**
 * A single worker kept aside for the live preview, so dragging the quality slider
 * during a large batch answers immediately instead of queueing behind it.
 *
 * `compresso.js/pool`'s `createPool()` doesn't hand job ids back to the caller (see
 * its README's "if you've rolled your own worker pool" note), so unlike the old
 * hand-rolled `PreviewWorker`, "cancel whatever was running, keep only the latest"
 * goes through `AbortController` instead of a pool-assigned id.
 */
function createPreviewWorker() {
  const pool = createPool({ size: 1 });
  let controller: AbortController | null = null;

  return {
    async run(file: File, params: Params): Promise<CompressResult | null> {
      controller?.abort();
      const mine = (controller = new AbortController());
      try {
        const out = await pool.compress(file, toOptions(params, mine.signal, () => {}));
        return controller === mine ? out : null;
      } catch (err) {
        // Superseded by a newer call (its own `abort()` above triggered this
        // rejection) — the newer run already owns `controller`, so this result
        // is stale and dropping it silently is correct.
        if (controller !== mine) return null;
        // A genuine failure (crash, timeout, decode error) on the run that's
        // still current. Swallowing this to null previously left the job
        // stuck in "running" forever with no error surfaced — see runJob's
        // `if (!out) return`. Rethrow so runJob's catch marks it failed.
        throw err;
      }
    },
    destroy() {
      pool.destroy();
    },
  };
}

export function useQueue() {
  const [jobs, setJobs] = useState<Job[]>([]);
  // Decided once, synchronously, from device signals available before any
  // file exists — see isLikelyLowEndAndroid. The image-size half of the same
  // decision (isLargeImage) can only fire once a file has actually been
  // decoded, so it lands later, inside runJob.
  const [autoCapped, setAutoCapped] = useState(isLikelyLowEndAndroid);
  const [params, setParams] = useState<Params>(() => defaultParamsFor(autoCapped));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const caps = useMemo(probeCaps, []);
  const poolSize = useMemo(() => defaultPoolSize(), []);
  const poolRef = useRef<Pool | null>(null);
  const previewRef = useRef<ReturnType<typeof createPreviewWorker> | null>(null);
  // Only the main pool's jobs are tracked here — the preview worker manages its
  // own single in-flight AbortController internally (see createPreviewWorker).
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const jobsRef = useRef<Job[]>([]);
  const paramsRef = useRef(params);
  const selectedRef = useRef<string | null>(null);
  const autoCappedRef = useRef(autoCapped);
  const runToken = useRef(0);

  jobsRef.current = jobs;
  paramsRef.current = params;
  selectedRef.current = selectedId;
  autoCappedRef.current = autoCapped;

  /**
   * Lazily (re)created rather than built once at first render. React can unmount
   * and remount the same component while keeping refs — StrictMode does exactly
   * that in development — and a pool that was torn down on the way out must not
   * be reused on the way back in, or every worker is already terminated.
   */
  const getPool = useCallback(() => (poolRef.current ??= createPool()), []);
  const getPreview = useCallback(() => (previewRef.current ??= createPreviewWorker()), []);

  useEffect(() => () => {
    poolRef.current?.destroy();
    poolRef.current = null;
    previewRef.current?.destroy();
    previewRef.current = null;
    for (const controller of controllersRef.current.values()) controller.abort();
    controllersRef.current.clear();
    for (const j of jobsRef.current) {
      if (j.previewUrl) URL.revokeObjectURL(j.previewUrl);
      if (j.out) URL.revokeObjectURL(j.out.url);
    }
  }, []);

  const patch = useCallback((id: string, next: Partial<Job>) => {
    setJobs((cur) => cur.map((j) => (j.id === id ? { ...j, ...next } : j)));
  }, []);

  /** Run one job. The selected image goes to the dedicated preview worker so its
   *  result lands immediately even while a large batch is grinding through the pool. */
  const runJob = useCallback(async (job: Job, token: number) => {
    const p = paramsRef.current;
    const isSelected = job.id === selectedRef.current;
    patch(job.id, { status: 'running', progress: isSelected ? 0.35 : 0 });

    const controller = new AbortController();
    if (!isSelected) controllersRef.current.set(job.id, controller);

    try {
      const out = isSelected
        ? await getPreview().run(job.file, p)
        : await getPool().compress(job.file, toOptions(p, controller.signal, (progress) =>
            patch(job.id, { progress })));

      if (token !== runToken.current || !out) return;

      // The image turned out to be genuinely large — before this result ever
      // reaches the screen, decide whether the cap should have applied from
      // the start. Checked against the live params (not `p`, which may now
      // be stale) so this never overrides a size choice made mid-run,
      // including having removed the cap on purpose.
      const liveParams = paramsRef.current;
      if (!autoCappedRef.current && dimensionsUntouched(liveParams) && isLargeImage(out.originalWidth, out.originalHeight)) {
        autoCappedRef.current = true;
        setAutoCapped(true);
        // Discard this uncapped result rather than showing it: a "done" that
        // a moment later reverts to "still working" reads as a bug, not as
        // the smart default it actually is. setParams restales every job
        // (see the paramsKey effect below), so this one reruns too — capped,
        // and the only version the user ever sees.
        URL.revokeObjectURL(out.url);
        setParams(cappedParams(liveParams));
        return;
      }

      setJobs((cur) => cur.map((j) => {
        if (j.id !== job.id) return j;
        if (j.out) URL.revokeObjectURL(j.out.url);
        return { ...j, status: 'done', progress: 1, out, errorKind: null };
      }));
    } catch (err) {
      if (token !== runToken.current) return;
      const kind = (err as { kind?: string }).kind;
      if (kind === 'aborted') return;
      patch(job.id, { status: 'failed', progress: 0, errorKind: kind === 'decode' ? 'decode' : 'generic' });
    } finally {
      if (!isSelected) controllersRef.current.delete(job.id);
    }
  }, [patch, getPool, getPreview]);

  const add = useCallback(async (files: File[]) => {
    const accepted = files.filter(isImage);
    if (!accepted.length) return;

    const fresh: Job[] = accepted.map((file) => ({
      id: uid(), file, previewUrl: null, status: 'queued', progress: 0, out: null, errorKind: null,
    }));

    setJobs((cur) => [...cur, ...fresh]);
    setSelectedId((cur) => cur ?? fresh[0].id);
    selectedRef.current = selectedRef.current ?? fresh[0].id;

    const token = runToken.current;
    for (const job of fresh) {
      previewUrlFor(job.file)
        .then((url) => patch(job.id, { previewUrl: url }))
        .catch(() => patch(job.id, { previewUrl: URL.createObjectURL(job.file) }));
      void runJob(job, token);
    }
  }, [patch, runJob]);

  /** Params changed: everything is stale. Debounced so dragging a slider doesn't
   *  re-queue the batch on every frame. */
  const paramsKey = JSON.stringify(params);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (!jobsRef.current.length) return;

    const timer = window.setTimeout(() => {
      for (const controller of controllersRef.current.values()) controller.abort();
      controllersRef.current.clear();
      const token = ++runToken.current;
      const current = jobsRef.current;
      setJobs((cur) => cur.map((j) => ({ ...j, status: 'queued', progress: 0, errorKind: null })));
      for (const job of current) void runJob(job, token);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [paramsKey, runJob]);

  const remove = useCallback((id: string) => {
    controllersRef.current.get(id)?.abort();
    controllersRef.current.delete(id);
    setJobs((cur) => {
      const target = cur.find((j) => j.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      if (target?.out) URL.revokeObjectURL(target.out.url);
      const next = cur.filter((j) => j.id !== id);
      setSelectedId((sel) => (sel === id ? next[0]?.id ?? null : sel));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    for (const controller of controllersRef.current.values()) controller.abort();
    controllersRef.current.clear();
    runToken.current++;
    setJobs((cur) => {
      for (const j of cur) {
        if (j.previewUrl) URL.revokeObjectURL(j.previewUrl);
        if (j.out) URL.revokeObjectURL(j.out.url);
      }
      return [];
    });
    setSelectedId(null);
    // Starting over drops the images but not what was learned about the
    // device/session — a cap already earned stays earned.
    setParams(defaultParamsFor(autoCappedRef.current));
  }, []);

  const retry = useCallback((id: string) => {
    const job = jobsRef.current.find((j) => j.id === id);
    if (job) void runJob(job, runToken.current);
  }, [runJob]);

  const totals = useMemo(() => {
    let original = 0, output = 0, done = 0, running = 0;
    for (const j of jobs) {
      if (j.status === 'running') running++;
      if (!j.out) continue;
      original += j.out.originalSize;
      output += j.out.compressedSize;
      done++;
    }
    return {
      original, output, done, running,
      saved: original - output,
      fraction: original > 0 ? (original - output) / original : 0,
      total: jobs.length,
      settled: jobs.every((j) => j.status === 'done' || j.status === 'failed'),
    };
  }, [jobs]);

  const selected = jobs.find((j) => j.id === selectedId) ?? null;

  return {
    jobs, selected, selectedId, setSelectedId,
    params, setParams, totals, caps, autoCapped,
    add, remove, clear, retry,
    poolSize,
  };
}
