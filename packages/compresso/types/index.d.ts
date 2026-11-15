export interface CompressOptions {
  /** Output quality from 0 to 1. Default: 0.8 */
  quality?: number;
  /**
   * Maximum output width in pixels. Default: unbounded, except when neither
   * `maxWidth` nor `maxHeight` is set AND the browser can't encode WebP/AVIF (so
   * auto-format falls back to JPEG, e.g. Safari) — then output is capped to a
   * 2048px long edge to avoid a bloated re-encode, though never below a 720px
   * short edge for shapes up to 32:1, so a long screenshot stays readable. Pass
   * `Infinity` to never cap.
   */
  maxWidth?: number;
  /**
   * Maximum output height in pixels. Default: unbounded, except when neither
   * `maxWidth` nor `maxHeight` is set AND the browser can't encode WebP/AVIF (so
   * auto-format falls back to JPEG, e.g. Safari) — then output is capped to a
   * 2048px long edge to avoid a bloated re-encode, though never below a 720px
   * short edge for shapes up to 32:1, so a long screenshot stays readable. Pass
   * `Infinity` to never cap.
   */
  maxHeight?: number;
  /**
   * Output format. Default: 'auto', the best this browser can encode, which
   * never returns a bigger file. An explicit format is always honoured, even
   * when the file grows (`savings` is then negative), except that a source
   * already in that format is kept when re-encoding can't shrink it (PNG
   * aside, which is lossless and capped only by `maxSizeMB`). A format
   * the browser can't encode falls back to the best one it can, with
   * `reason: 'unsupported-format'`.
   */
  format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'auto';
  /**
   * Target output file size in MB. Quality is lowered to meet it (four
   * encodes at most per size), then, if quality alone can't, the long edge
   * steps down, to 480 px at the least. When even that misses, the result is
   * the smallest file made and `missedTarget` is `true`. Lossy output is
   * additionally never larger than the source. Default: source size.
   */
  maxSizeMB?: number;
  /**
   * Maximum decodable input resolution, in total pixels (width × height). Guards
   * against a crafted file declaring an enormous resolution from a tiny number of
   * bytes. Default: 100,000,000 (100 MP — well above any real camera photo). Pass
   * `Infinity` to disable.
   */
  maxInputPixels?: number;
  /** Background color for JPEG conversion. Default: '#ffffff' */
  backgroundColor?: string;
  /** @deprecated No-op — aspect ratio is always preserved when resizing. */
  preserveAspectRatio?: boolean;
  /** AbortSignal to cancel compression */
  signal?: AbortSignal;
  /** Progress callback */
  onProgress?: (event: ProgressEvent) => void;
}

export interface ProgressEvent {
  /** Progress from 0 to 1 */
  progress: number;
  /** Current stage */
  stage: 'loading' | 'resizing' | 'compressing' | 'done';
}

export interface MultiProgressEvent extends ProgressEvent {
  /** Index of the current file */
  fileIndex: number;
  /** Total number of files */
  totalFiles: number;
  /** Overall progress from 0 to 1 across all files */
  overallProgress: number;
}

export interface CompressResult {
  /** Optimized File object */
  file: File;
  /** Optimized Blob */
  blob: Blob;
  /** Object URL for preview (revoke with URL.revokeObjectURL when done) */
  url: string;
  /**
   * Output width in pixels, as encoded. Output stays inside the format's edge
   * limit (WebP: 16,383) and the canvas the browser really gives, so it can
   * be smaller than asked.
   */
  width: number;
  /** Output height in pixels, as encoded (see `width`). */
  height: number;
  /** Original width in pixels */
  originalWidth: number;
  /** Original height in pixels */
  originalHeight: number;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Size reduction percentage (e.g. 85.3 means 85.3% smaller) */
  savings: number;
  /**
   * The format the output's bytes really are, in canonical names: `'jpeg'`
   * (never `'jpg'`), `'png'`, `'webp'`, `'avif'`, or for a kept source its own
   * format, such as `'gif'` or `'heic'`.
   */
  format: string;
  /** The output's MIME type, matching its bytes (`blob.type` and `file.type` are the same) */
  mimeType: string;
  /**
   * `true` when the source itself came back, byte for byte, with its own name,
   * type and dimensions: no encode was smaller (`reason` says why).
   */
  kept: boolean;
  /**
   * Why the result isn't exactly what was asked, or `null` when it is:
   * `'not-smaller'` when the source was kept because no encode beat it, and
   * `'unsupported-format'` when this browser can't encode the asked format,
   * so the result is in the best one it can. More reasons may be added; treat
   * an unknown one as "not what was asked".
   */
  reason: CompressReason | null;
  /**
   * `true` when `maxSizeMB` could not be met even at the smallest size the
   * search tried; the result is then the smallest file it made (or the
   * source, when that is smaller). `false` with no `maxSizeMB`.
   */
  missedTarget: boolean;
}

/** Why a result isn't exactly what was asked (see `CompressResult.reason`). */
export type CompressReason = 'not-smaller' | 'unsupported-format';

/**
 * Compress a single image file, blob, or URL.
 *
 * HEIC/HEIF input is accepted: Safari/iOS decode it natively, while other
 * browsers lazily load an optional codec (`heic-to`) on the first HEIC image.
 * Output is always one of the web formats above — HEIC is input-only.
 */
export function compress(
  source: File | Blob | string,
  options?: CompressOptions
): Promise<CompressResult>;

/**
 * Alias for compress().
 */
export function compressFile(
  file: File | Blob | string,
  options?: CompressOptions
): Promise<CompressResult>;

/**
 * Compress multiple image files sequentially.
 */
export function compressMultiple(
  files: (File | Blob | string)[],
  options?: CompressOptions & {
    onProgress?: (event: MultiProgressEvent) => void;
  }
): Promise<CompressResult[]>;

/**
 * Create a reusable compressor with preset defaults.
 */
export function createCompressor(defaults?: CompressOptions): {
  compress: (
    source: File | Blob | string,
    options?: CompressOptions
  ) => Promise<CompressResult>;
  compressMultiple: (
    files: (File | Blob | string)[],
    options?: CompressOptions
  ) => Promise<CompressResult[]>;
};

/**
 * Check if a format is supported by the current browser.
 */
export function isFormatSupported(format: string): boolean;

/**
 * Get the best supported format for the current browser.
 */
export function getBestFormat(): string;

/**
 * Detect the format of a file from its MIME type or extension, in canonical
 * names (`'jpeg'`, never `'jpg'`), or `null` when neither names a known one.
 */
export function detectFormat(file: File | Blob | string): string | null;

/**
 * Heuristic check for whether a source is HEIC/HEIF (by MIME type or extension).
 * Useful for showing a "converting…" hint before the lazy codec loads.
 */
export function isHeicSource(source: File | Blob | string): boolean;

/**
 * Decode a HEIC/HEIF source to a displayable PNG Blob using a lazily-loaded codec.
 * Handy for previewing a HEIC file in browsers that can't render it natively.
 */
export function decodeHeic(source: File | Blob | string): Promise<Blob>;

/**
 * Format bytes into a human-readable string.
 */
export function formatBytes(bytes: number): string;
