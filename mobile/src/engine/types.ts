import type {
  EncodeFormat, EncodeOptions, MetadataPolicy, Prepared, PrepareOptions, WriteOptions, Written,
} from '../../modules/compresso-engine';

export type { EncodeFormat, MetadataPolicy, Prepared, Written };

/**
 * The adapter contract between the decision logic (plan.ts) and a host's
 * pixels. Native implements it with ImageIO / ImageDecoder; the web build with
 * canvas. This is the shape compresso.js 1.1 will publish as its adapter API,
 * so plan.ts can move into the library unchanged.
 */
export interface Engine {
  /** Formats this host can write, best first. */
  formats(): EncodeFormat[];
  prepare(source: Source, options: PrepareOptions): Promise<Prepared>;
  encode(handle: string, options: EncodeOptions): Promise<number>;
  write(handle: string, options: WriteOptions): Promise<Written>;
  copyOriginal(handle: string, name: string): Promise<Written>;
  release(handle: string): void;
}

/** A picked photo. `size` and dimensions come from the picker and may be 0. */
export type Source = {
  uri: string;
  name: string;
  size: number;
  width: number;
  height: number;
  mimeType?: string;
  /** Web only: the picked File, which has no file:// URI to reopen. */
  file?: Blob;
};

export type Recipe = {
  /** Preferred output formats, best first; the first one the host can write wins. */
  formats: EncodeFormat[];
  /** Starting (and highest) quality, 0–1. */
  quality: number;
  maxLongEdge: number | null;
  /** Output must be at or under this many bytes. */
  targetBytes: number | null;
  metadata: MetadataPolicy;
};

export type Outcome = Written & {
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  /** The source was returned unchanged because nothing smaller was possible. */
  kept: boolean;
  /** Quality the file was written at; null when kept or PNG. */
  quality: number | null;
  /** The target could not be met even at the smallest size tried. */
  missedTarget: boolean;
  /** Capture time of the source, so a saved copy sorts beside the original. */
  takenAt: number | null;
};
