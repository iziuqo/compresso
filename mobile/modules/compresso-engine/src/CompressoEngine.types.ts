/**
 * The native half of the compresso adapter contract: decode once, encode many
 * times in memory to measure, write once. The search for the right quality
 * (never-bigger, target size) lives in JS (`src/engine/plan.ts`) so it is the
 * same logic on every host — this module only knows how to turn pixels into
 * bytes on its platform.
 */

export type EncodeFormat = 'jpeg' | 'heic' | 'png' | 'webp';

/**
 * What happens to the source's metadata. `strip-location` keeps capture date,
 * camera and colour info but drops GPS — the safe default for anything shared.
 */
export type MetadataPolicy = 'keep' | 'strip-location' | 'strip';

export type PrepareOptions = {
  /** Long edge of the decoded image, in px. Omitted = full resolution. */
  maxLongEdge?: number;
  /** Reject sources above this many pixels before decoding (pixel-flood guard). */
  maxInputPixels?: number;
};

export type Prepared = {
  handle: string;
  /** Decoded (possibly downsampled) dimensions, orientation already applied. */
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  /** Source file size in bytes. */
  originalSize: number;
  /** Source format as detected from its bytes, e.g. 'jpeg', 'heic', 'png'. */
  sourceFormat: string;
  /** Capture time from EXIF, ms since epoch, when the source has one. */
  takenAt?: number;
};

export type EncodeOptions = {
  format: EncodeFormat;
  /** 0–1. Ignored for PNG. */
  quality: number;
  metadata: MetadataPolicy;
};

export type WriteOptions = EncodeOptions & {
  /** File name without extension; the engine adds the right one. */
  name: string;
};

export type Written = {
  uri: string;
  size: number;
  width: number;
  height: number;
  format: EncodeFormat;
};
