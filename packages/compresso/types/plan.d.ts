/**
 * compresso.js/plan — the photo and video decisions without the pixels. A host
 * (canvas, iOS ImageIO or AVFoundation, Android Bitmap or Media3, a test fake)
 * implements `PhotoHost` or `VideoHost`; the planner decides format, quality
 * and size the same way on every host.
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

/** The first `preferred` format in `writable`; `fallback` ('jpeg' by default) when none is. */
export function resolveFormat<F extends string>(preferred: readonly F[], writable: readonly F[], fallback?: F): F;

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
 * Split one byte budget across photos or videos, in proportion to their size,
 * never giving one more than it weighs. Sizes of 0 (unknown) count as average.
 * Returns each file's `targetBytes`, in the same order, with 3% left for
 * container overhead.
 */
export function allocateBudget(totalBytes: number, sizes: readonly number[]): number[];

/** A video codec the host can write. H.264 is the one every host writes. */
export type VideoCodec = 'h264' | 'hevc' | 'av1' | 'vp9' | (string & {});

/** The source video, as the host reads it. */
export interface VideoSource {
  /** Displayed width, in pixels (after rotation). */
  width: number;
  /** Displayed height, in pixels (after rotation). */
  height: number;
  /** Frames per second. */
  fps: number;
  /** Length in milliseconds; must be more than 0. */
  durationMs: number;
  /** Whether the source has a sound track. */
  hasAudio: boolean;
  /** Size of the source in bytes, 0 when unknown (then only `targetBytes` caps the output). */
  originalSize: number;
}

/** What to make of one video. */
export interface VideoRecipe {
  /** Preferred codecs, best first; the first the host can write wins, H.264 otherwise. */
  codecs: VideoCodec[];
  /** Picture quality, 0–1, used when no target binds. Default: 0.8 */
  quality?: number;
  /** Cap on the long edge, in pixels. Default: none */
  maxLongEdge?: number | null;
  /** Cap on the frame rate. Default: none (a size target caps it at 30) */
  maxFps?: number | null;
  /** Output must be at or under this many bytes. Default: none (the source's own size still caps it) */
  targetBytes?: number | null;
  /** Keep the sound track. Default: true */
  audio?: boolean;
}

/** The settings to encode at: what a native encoder (Media3, AVAssetWriter, WebCodecs) takes. */
export interface VideoSettings {
  /** Codec to write. */
  codec: VideoCodec;
  /** Output width, in even pixels. */
  width: number;
  /** Output height, in even pixels. */
  height: number;
  /** Output frames per second. */
  fps: number;
  /** Video bitrate, in bits per second. */
  videoBitrate: number;
  /** AAC audio bitrate, in bits per second; 0 for no sound track. */
  audioBitrate: number;
  /** Expected output size in bytes. Above the target only when the target is out of reach. */
  bytes: number;
}

/**
 * One video, as the host sees it. The planner calls `encode` once, or twice
 * when the first output misses its ceiling (`discard` frees the miss), or
 * `keep` instead when nothing smaller is possible. `R` is whatever the host
 * returns for a finished file; the planner passes it through.
 */
export interface VideoHost<R> {
  /** The source to plan for. */
  readonly source: VideoSource;
  /** Codecs this host can write, best first. */
  readonly codecs: readonly VideoCodec[];
  /** Encode at `settings` and report the real size. */
  encode(settings: VideoSettings, options: PlanOptions): Promise<{ result: R; bytes: number }>;
  /** Return the source unchanged, because nothing smaller was possible. */
  keep(): Promise<R>;
  /** Free an encode the planner won't use. */
  discard?(result: R): void | Promise<void>;
}

/** What the planner decided, plus the host's result. */
export interface VideoDecision<R> {
  /** The host's `encode` or `keep` result. */
  result: R;
  /** Settings the result was encoded at; null when the source was kept. */
  settings: VideoSettings | null;
  /** The source came back unchanged: nothing smaller was possible. */
  kept: boolean;
  /** `targetBytes` could not be met. */
  missedTarget: boolean;
}

/** Plan and encode one video through `host`: at most two encodes. */
export function planVideo<R>(host: VideoHost<R>, recipe: VideoRecipe, options?: PlanOptions): Promise<VideoDecision<R>>;

/**
 * The settings for `source` with the first of `recipe.codecs`, or null when
 * the source should be kept. Pure. `overshoot` is how much bigger than
 * estimated the last encode came out (default 1).
 */
export function fitVideo(source: VideoSource, recipe: VideoRecipe, overshoot?: number): VideoSettings | null;
