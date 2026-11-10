import { detectFormat, formatToMime, generateFileName, getBestFormat } from './utils.js';
import { decode, encode, ensureCapabilities } from './platform.js';
import { calculateDimensions, renderToCanvas } from './resize.js';
import { probeDimensions } from './probe.js';
import { findQuality } from './quality.js';

/**
 * Ceiling on decodable input resolution (width × height). A crafted file can
 * declare pixel dimensions that make the browser attempt an enormous allocation
 * from a tiny number of bytes — a "pixel flood," the image analogue of a
 * decompression bomb. Checked both before and after decode (see `compress()`):
 * before, cheaply, for JPEG/PNG/WebP; after, for every format, as the only guard
 * for HEIC/AVIF/URL sources and as defense-in-depth otherwise. 100 MP is roughly
 * 4× a 45 MP full-frame camera photo — generous enough that no real photo trips
 * it, bounded enough to cap worst-case decode memory. Pass `maxInputPixels:
 * Infinity` to disable.
 */
const DEFAULT_MAX_INPUT_PIXELS = 100_000_000;

const DEFAULTS = {
  quality: 0.8,
  maxWidth: Infinity,
  maxHeight: Infinity,
  format: 'auto',
  maxSizeMB: Infinity,
  maxInputPixels: DEFAULT_MAX_INPUT_PIXELS,
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

export async function compress(source, options = {}) {
  // Fail clearly, once, up front — rather than deep inside the pipeline on a
  // confusing "X is not a function" — if called somewhere that is neither a
  // browser main thread nor a Web Worker (e.g. Node.js, or a framework's SSR
  // pass). Guard call sites with `typeof window !== 'undefined'` instead.
  if (typeof Image === 'undefined' && typeof OffscreenCanvas === 'undefined') {
    throw new Error(
      'compresso.js requires a browser or Web Worker environment; it cannot run ' +
      'in Node.js or during server-side rendering. Guard calls with `typeof ' +
      "window !== 'undefined'` or a dynamic import."
    );
  }

  const opts = { ...DEFAULTS, ...options };
  throwIfAborted(opts.signal);

  // Resolve encode capabilities before choosing a format. On the main thread this
  // is a memoized sync probe; in a worker it is an async one (OffscreenCanvas has
  // no `toDataURL`), which is why the pipeline awaits it here.
  await ensureCapabilities();
  // Not const: the never-bigger fallback below can retarget these to the
  // source's own format when nothing achievable in the requested one fits.
  let format = opts.format === 'auto' ? getBestFormat() : opts.format;
  let mimeType = formatToMime(format);
  const bgColor = mimeType === 'image/jpeg' ? opts.backgroundColor : null;

  report(opts, 0.1, 'loading');
  if (source instanceof Blob) {
    // Pre-decode: rejects a grossly oversized JPEG/PNG/WebP before the expensive
    // decode call allocates anything. Scoped to Blob/File sources — probing a
    // remote URL cheaply would need a ranged fetch not every server honors, so
    // URL sources rely on the post-decode check below instead. A probe failure
    // (unrecognized/truncated header) must never block an otherwise-valid file,
    // so it falls through to the post-decode check rather than rejecting here.
    const probed = await probeDimensions(source).catch(() => null);
    if (probed && probed.width * probed.height > opts.maxInputPixels) {
      throw tooLargeError();
    }
  }
  const { image, width: originalWidth, height: originalHeight } = await decode(source);
  throwIfAborted(opts.signal);

  // Post-decode: defense-in-depth, and the only guard for HEIC/AVIF/URL sources,
  // where the pre-decode probe above doesn't apply.
  if (originalWidth * originalHeight > opts.maxInputPixels) {
    throw tooLargeError();
  }

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

  let blob = await shrinkToFit(canvas, mimeType, opts.quality, ceilingBytes, opts);

  // shrinkToFit only searches quality within the target format — it can't help
  // when that format's own encoding overhead can't beat a source that was
  // already stored in a materially more efficient one (e.g. WebKit forced to
  // JPEG because it can't encode AVIF/WebP, re-encoding an AVIF source). When
  // nothing achievable in the target format fits, the source itself is the
  // only way to keep the never-bigger guarantee unconditional — return it,
  // honestly relabeled as its own format rather than mislabeled as the target.
  if (mimeType !== 'image/png' && source instanceof Blob && blob.size > originalSize) {
    blob = source;
    format = detectFormat(source) ?? format;
    mimeType = source.type || mimeType;
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

/**
 * Encode at the highest quality that fits `maxBytes` (see `findQuality`), or
 * at a 0.1 floor when none does — the never-bigger check in `compress()` then
 * decides between that and the source.
 */
async function shrinkToFit(canvas, mimeType, quality, maxBytes, opts) {
  // The last encode that fit is the best one: the search only moves up after a fit.
  let fit = null;
  const size = async (q) => {
    throwIfAborted(opts.signal);
    const blob = await encode(canvas, mimeType, q);
    if (blob.size <= maxBytes) fit = blob;
    return blob.size;
  };
  const onStep = (step) => report(opts, 0.5 + step * 0.4, 'compressing');
  const found = await findQuality(size, quality, maxBytes, onStep);
  return found === null ? encode(canvas, mimeType, 0.1) : fit;
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('Compression aborted', 'AbortError');
}

function tooLargeError() {
  return Object.assign(new Error('Image exceeds the maximum decodable size'), { kind: 'too-large' });
}

function report(opts, progress, stage) {
  opts.onProgress?.({ progress, stage });
}

// File extends Blob, so this covers both; URL/string sources have no known size.
function sourceSize(source) {
  return source instanceof Blob ? source.size : 0;
}
