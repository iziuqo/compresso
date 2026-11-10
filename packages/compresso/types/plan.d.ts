/**
 * compresso.js/plan — the photo decisions without the pixels. A host (canvas,
 * iOS ImageIO, Android Bitmap, a test fake) implements `PhotoHost`; the planner
 * decides format, quality and size the same way on every host.
 */

/** A format the host can write. Hosts may add their own, such as 'heic'. */
export type PhotoFormat = 'jpeg' | 'png' | 'webp' | 'avif' | (string & {});

/** What to make of one photo. */
export interface PhotoRecipe {
  /** Preferred output formats, best first; the first the host can write wins, JPEG otherwise. */
  formats: PhotoFormat[];
  /** Starting (and highest) quality, 0–1. Default: 0.8 */
  quality?: number;
  /** Cap on the long edge, in pixels. Default: none */
  maxLongEdge?: number | null;
  /** Output must be at or under this many bytes. Default: none (the source's own size still caps it) */
  targetBytes?: number | null;
}

/** The size of a photo once prepared at a given long-edge cap. */
export interface PreparedPhoto {
  /** Width after the cap, in pixels. */
  width: number;
  /** Height after the cap, in pixels. */
  height: number;
  /** Size of the source in bytes, 0 when unknown (then only `targetBytes` caps the output). */
  originalSize: number;
}

/**
 * One photo, as the host sees it. The planner calls `prepare` once per
 * attempt, `measure` while searching, then exactly one of `write` or `keep`,
 * and `release` after each attempt. `R` is whatever the host returns for a
 * finished file (a Blob, a file URI, …); the planner passes it through.
 */
export interface PhotoHost<R> {
  /** Formats this host can write, best first. */
  readonly formats: readonly PhotoFormat[];
  /** Decode (or reuse) the source, scaled so its long edge is at most `maxLongEdge`. */
  prepare(maxLongEdge: number | undefined): Promise<PreparedPhoto>;
  /** Encoded size in bytes at this format and quality, in memory; nothing is written. */
  measure(format: PhotoFormat, quality: number): Promise<number>;
  /** Encode and keep the result. */
  write(format: PhotoFormat, quality: number): Promise<R>;
  /** Return the source unchanged, because nothing smaller was possible. */
  keep(): Promise<R>;
  /** Free what the last `prepare` holds. */
  release?(): void;
}

/** What the planner decided, plus the host's result. */
export interface PhotoDecision<R> {
  /** The host's `write` or `keep` result. */
  result: R;
  /** Format written; null when the source was kept. */
  format: PhotoFormat | null;
  /** Quality written at; null when kept or PNG. */
  quality: number | null;
  /** The source came back unchanged: nothing smaller was possible. */
  kept: boolean;
  /** `targetBytes` could not be met even at the smallest size tried. */
  missedTarget: boolean;
}

export interface PlanOptions {
  /** Cancels between encodes; rejects with an error named 'AbortError'. */
  signal?: AbortSignal;
  /** Progress from 0 to 1. */
  onProgress?: (fraction: number) => void;
}

/** Plan and write one photo through `host`. */
export function planPhoto<R>(host: PhotoHost<R>, recipe: PhotoRecipe, options?: PlanOptions): Promise<PhotoDecision<R>>;

/** The first `preferred` format in `writable`; 'jpeg' when none is. */
export function resolveFormat(preferred: readonly PhotoFormat[], writable: readonly PhotoFormat[]): PhotoFormat;

/**
 * Highest quality, at or below `quality`, whose encode fits in `ceiling`
 * bytes; null when none does. Tries `quality` first, then binary-searches
 * down. To cancel, throw from `encode`.
 */
export function findQuality(
  encode: (quality: number) => Promise<number>,
  quality: number,
  ceiling: number,
  onStep?: (fraction: number) => void,
): Promise<number | null>;

/**
 * Split one byte budget across photos, in proportion to their size, never
 * giving one more than it weighs. Sizes of 0 (unknown) count as average.
 * Returns each photo's `targetBytes`, in the same order, with 3% left for
 * container overhead.
 */
export function allocateBudget(totalBytes: number, sizes: readonly number[]): number[];
