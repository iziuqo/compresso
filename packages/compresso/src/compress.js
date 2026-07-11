import { loadImage, canvasToBlob, formatToMime, generateFileName, getBestFormat } from './utils.js';
import { calculateDimensions, drawToCanvas } from './resize.js';

const DEFAULTS = {
  quality: 0.8,
  maxWidth: Infinity,
  maxHeight: Infinity,
  format: 'auto',
  maxSizeMB: Infinity,
  backgroundColor: '#ffffff',
  preserveAspectRatio: true,
  signal: null,
  onProgress: null,
};

/**
 * Default long-edge cap (px), applied only when auto-format selection falls back
 * to JPEG because the browser can't encode WebP/AVIF (notably Safari). There, a
 * full-resolution JPEG re-encode of a ~12 MP photo can end up larger than the
 * original, so capping keeps output small. Browsers with a modern format — and any
 * call that sets an explicit dimension or format — keep the original resolution.
 * Opt out on the fallback path too with `maxWidth: Infinity`.
 */
const DEFAULT_MAX_DIMENSION = 2048;

export async function compress(source, options = {}) {
  const opts = { ...DEFAULTS, ...options };

  if (opts.signal?.aborted) {
    throw new DOMException('Compression aborted', 'AbortError');
  }

  const format = opts.format === 'auto' ? getBestFormat() : opts.format;
  const mimeType = formatToMime(format);
  const needsBackground = mimeType === 'image/jpeg' && !opts.backgroundColor;
  const bgColor = mimeType === 'image/jpeg' ? (opts.backgroundColor || '#ffffff') : null;

  report(opts, 0.1, 'loading');

  const img = await loadImage(source);
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  if (opts.signal?.aborted) {
    throw new DOMException('Compression aborted', 'AbortError');
  }

  report(opts, 0.3, 'resizing');

  // Default cap only when auto-format had to fall back to JPEG — i.e. the browser
  // can't encode WebP/AVIF (Safari), where a full-resolution JPEG re-encode would
  // otherwise bloat the file. Browsers with a modern format keep the original
  // dimensions. Any explicit dimension is always honored (the other axis stays
  // unbounded); read from raw `options` so an unset axis differs from an explicit
  // Infinity.
  const noExplicitCaps = options.maxWidth == null && options.maxHeight == null;
  const capToDefault = noExplicitCaps && opts.format === 'auto' && format === 'jpeg';
  const maxWidth = options.maxWidth ?? (capToDefault ? DEFAULT_MAX_DIMENSION : Infinity);
  const maxHeight = options.maxHeight ?? (capToDefault ? DEFAULT_MAX_DIMENSION : Infinity);

  const { width, height } = calculateDimensions(
    originalWidth,
    originalHeight,
    maxWidth,
    maxHeight
  );

  const canvas = drawToCanvas(img, width, height, bgColor);

  report(opts, 0.5, 'compressing');

  const quality = opts.quality;
  const originalSize = getSourceSize(source);

  // A compressor must never hand back a file larger than its input. For lossy
  // formats, cap output at the smaller of any explicit `maxSizeMB` budget and the
  // source's own size, lowering quality only if the first encode overshoots. PNG
  // is exempt: it ignores the quality knob, so a size search cannot help and would
  // only repeat the same full-canvas encode.
  const isLossy = mimeType !== 'image/png';
  const ceilingBytes = isLossy
    ? Math.min(opts.maxSizeMB * 1024 * 1024, originalSize || Infinity)
    : Infinity;

  let blob = await canvasToBlob(canvas, mimeType, quality);
  if (blob.size > ceilingBytes) {
    blob = await compressToTargetSize(canvas, mimeType, quality, ceilingBytes, opts, blob);
  }

  if (opts.signal?.aborted) {
    throw new DOMException('Compression aborted', 'AbortError');
  }

  report(opts, 1, 'done');

  const fileName = generateFileName(source, format);
  const file = new File([blob], fileName, { type: mimeType });

  return {
    file,
    blob,
    url: URL.createObjectURL(blob),
    width,
    height,
    originalWidth,
    originalHeight,
    originalSize,
    compressedSize: blob.size,
    savings: originalSize > 0
      ? Math.round((1 - blob.size / originalSize) * 1000) / 10
      : 0,
    format,
    mimeType,
  };
}

async function compressToTargetSize(canvas, mimeType, initialQuality, maxBytes, opts, firstBlob) {
  let blob = firstBlob ?? (await canvasToBlob(canvas, mimeType, initialQuality));
  if (blob.size <= maxBytes) return blob;

  let low = 0;
  let high = initialQuality;
  let bestBlob = blob;
  const maxIterations = 10;

  for (let i = 0; i < maxIterations; i++) {
    if (opts.signal?.aborted) {
      throw new DOMException('Compression aborted', 'AbortError');
    }

    const mid = (low + high) / 2;
    blob = await canvasToBlob(canvas, mimeType, mid);

    if (blob.size <= maxBytes) {
      bestBlob = blob;
      low = mid;
    } else {
      high = mid;
    }

    if (Math.abs(high - low) < 0.01) break;

    report(opts, 0.5 + (i / maxIterations) * 0.4, 'compressing');
  }

  if (bestBlob.size > maxBytes) {
    bestBlob = await canvasToBlob(canvas, mimeType, 0.1);
  }

  return bestBlob;
}

function getSourceSize(source) {
  if (source instanceof File) return source.size;
  if (source instanceof Blob) return source.size;
  return 0;
}

function report(opts, progress, stage) {
  if (opts.onProgress) {
    opts.onProgress({ progress, stage });
  }
}
