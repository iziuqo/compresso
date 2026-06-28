export interface CompressOptions {
  /** Output quality from 0 to 1. Default: 0.8 */
  quality?: number;
  /** Maximum output width in pixels. Default: Infinity */
  maxWidth?: number;
  /** Maximum output height in pixels. Default: Infinity */
  maxHeight?: number;
  /** Output format. Default: 'auto' (best supported) */
  format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'auto';
  /** Maximum output file size in MB. Default: Infinity */
  maxSizeMB?: number;
  /** Background color for JPEG conversion. Default: '#ffffff' */
  backgroundColor?: string;
  /** Preserve aspect ratio when resizing. Default: true */
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
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
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
  /** Output format */
  format: string;
  /** Output MIME type */
  mimeType: string;
}

/**
 * Compress a single image file, blob, or URL.
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
 * Detect the format of a file from its MIME type or extension.
 */
export function detectFormat(file: File | Blob | string): string | null;

/**
 * Format bytes into a human-readable string.
 */
export function formatBytes(bytes: number): string;
