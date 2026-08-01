import { formatToMime, generateFileName, getBestFormat } from './utils.js';
import { decode, encode, ensureCapabilities } from './platform.js';
import { calculateDimensions, renderToCanvas } from './resize.js';

const DEFAULTS = {
  quality: 0.8,
  maxWidth: Infinity,
  maxHeight: Infinity,
  format: 'auto',
  maxSizeMB: Infinity,
  backgroundColor: '#ffffff',
  signal: null,
  onProgress: null,
};

/**
 * Default long-edge cap (px), applied only when auto-format selection falls back to
 * JPEG because the browser can't encode WebP/AVIF (notably Safari). There, a
 * full-resolution JPEG re-encode of a ~12 MP photo can end up larger than the
 * original, so capping keeps output small. Browsers with a modern format — and any
 * call that sets an explicit dimension or format — keep the original resolution.
 * Opt out on the fallback path too with `maxWidth: Infinity`.
 */
const DEFAULT_MAX_DIMENSION = 2048;

const MAX_QUALITY_STEPS = 10;

export async function compress(source, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  throwIfAborted(opts.signal);

  // Resolve encode capabilities before choosing a format. On the main thread this
  // is a memoized sync probe; in a worker it is an async one (OffscreenCanvas has
  // no `toDataURL`), which is why the pipeline awaits it here.
  await ensureCapabilities();
  const format = opts.format === 'auto' ? getBestFormat() : opts.format;
  const mimeType = formatToMime(format);
  const bgColor = mimeType === 'image/jpeg' ? opts.backgroundColor : null;

  report(opts, 0.1, 'loading');
  const { image, width: originalWidth, height: originalHeight } = await decode(source);
  throwIfAborted(opts.signal);

  report(opts, 0.3, 'resizing');
  // Cap only when auto-format had to fall back to JPEG (the browser can't encode
  // WebP/AVIF — Safari) and the caller constrained neither axis. Read from raw
  // `options` so an unset axis differs from an explicit `Infinity`.
  const noExplicitCaps = options.maxWidth == null && options.maxHeight == null;
  const cap = noExplicitCaps && opts.format === 'auto' && format === 'jpeg' ? DEFAULT_MAX_DIMENSION : Infinity;
  const { width, height } = calculateDimensions(
    originalWidth,
    originalHeight,
    options.maxWidth ?? cap,
    options.maxHeight ?? cap
  );
  const canvas = renderToCanvas(image, originalWidth, originalHeight, width, height, bgColor);

  report(opts, 0.5, 'compressing');
  const originalSize = sourceSize(source);
  // A compressor must never return a file larger than its input. For lossy formats,
  // cap output at the smaller of any explicit `maxSizeMB` and the source's own size.
  // PNG is exempt: it ignores quality, so a size search can't help.
  const ceilingBytes =
    mimeType === 'image/png' ? Infinity : Math.min(opts.maxSizeMB * 1024 * 1024, originalSize || Infinity);

  let blob = await encode(canvas, mimeType, opts.quality);
  if (blob.size > ceilingBytes) {
    blob = await shrinkToFit(canvas, mimeType, opts.quality, ceilingBytes, opts, blob);
  }
  throwIfAborted(opts.signal);

  report(opts, 1, 'done');
  const file = new File([blob], generateFileName(source, format), { type: mimeType });

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
    savings: originalSize > 0 ? Math.round((1 - blob.size / originalSize) * 1000) / 10 : 0,
    format,
    mimeType,
  };
}

/** Binary-search the highest quality whose encode fits within `maxBytes`. */
async function shrinkToFit(canvas, mimeType, initialQuality, maxBytes, opts, firstBlob) {
  let blob = firstBlob ?? (await encode(canvas, mimeType, initialQuality));
  if (blob.size <= maxBytes) return blob;

  let low = 0;
  let high = initialQuality;
  let best = blob;

  for (let i = 0; i < MAX_QUALITY_STEPS; i++) {
    throwIfAborted(opts.signal);
    const mid = (low + high) / 2;
    blob = await encode(canvas, mimeType, mid);
    if (blob.size <= maxBytes) {
      best = blob;
      low = mid;
    } else {
      high = mid;
    }
    if (high - low < 0.01) break;
    report(opts, 0.5 + (i / MAX_QUALITY_STEPS) * 0.4, 'compressing');
  }

  if (best.size > maxBytes) best = await encode(canvas, mimeType, 0.1);
  return best;
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('Compression aborted', 'AbortError');
}

function report(opts, progress, stage) {
  opts.onProgress?.({ progress, stage });
}

// File extends Blob, so this covers both; URL/string sources have no known size.
function sourceSize(source) {
  return source instanceof Blob ? source.size : 0;
}
