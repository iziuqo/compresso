import { detectFormat, formatToMime, generateFileName, getBestFormat } from './utils.js';
import { decode, encode, ensureCapabilities } from './platform.js';
import { calculateDimensions, renderToCanvas } from './resize.js';
import { probeDimensions } from './probe.js';
import { planPhoto } from './plan.js';

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
/**
 * ...but the cap never takes the short edge below this (px), so a long
 * screenshot or a panorama stays readable instead of becoming a sliver
 * (COR-18). Shapes up to 2048 / 720, about 2.8 to 1, are unaffected.
 */
const DEFAULT_MIN_SHORT_EDGE = 720;
/**
 * ...and the floor never lifts the long edge past this (px): 32 × 720, so
 * 720 × 23040 is 16.6 MP, inside iOS Safari's 16.7 MP canvas limit and every
 * engine's canvas and JPEG edge limits. Only shapes past 32 to 1 go below 720 px.
 */
const DEFAULT_MAX_FLOORED_EDGE = 23040;

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
  // `options` so an unset axis differs from an explicit `Infinity`. The limit is
  // the larger of the default cap and the long edge that keeps the short edge at
  // DEFAULT_MIN_SHORT_EDGE, at most DEFAULT_MAX_FLOORED_EDGE (`|| 0`: a 0 × 0
  // decode gives NaN). It reaches the planner as its long-edge limit.
  const noExplicitCaps = options.maxWidth == null && options.maxHeight == null;
  const flooredEdge = (DEFAULT_MIN_SHORT_EDGE * Math.max(originalWidth, originalHeight)) / Math.min(originalWidth, originalHeight);
  const cap = noExplicitCaps && opts.format === 'auto' && format === 'jpeg'
    ? Math.max(DEFAULT_MAX_DIMENSION, Math.min(DEFAULT_MAX_FLOORED_EDGE, flooredEdge) || 0)
    : undefined;

  // The shared planner decides quality, size and never-bigger, the same way
  // the apps do; this canvas host draws and encodes for it.
  const originalSize = sourceSize(source);
  let canvas, width, height, encodes;
  // Lower-cased for the planner, which tells PNG apart by name.
  const formats = [format.toLowerCase()];
  const host = {
    formats,
    async prepare(maxLongEdge = Infinity) {
      ({ width, height } = calculateDimensions(
        originalWidth,
        originalHeight,
        Math.min(options.maxWidth ?? Infinity, maxLongEdge),
        Math.min(options.maxHeight ?? Infinity, maxLongEdge)
      ));
      canvas = renderToCanvas(image, originalWidth, originalHeight, width, height, bgColor);
      encodes = new Map();
      return {
        width,
        height,
        // PNG ignores quality, so only a size target caps it, not the source's size.
        originalSize: mimeType === 'image/png' ? 0 : originalSize,
        // Resized or converted: the source isn't what was asked for.
        transformed: width < originalWidth || height < originalHeight || source.type !== mimeType,
      };
    },
    async measure(_, quality) {
      const blob = await encode(canvas, mimeType, quality);
      encodes.set(quality, blob);
      return blob.size;
    },
    write: async (_, quality) => encodes.get(quality) ?? encode(canvas, mimeType, quality),
    keep: async () => source,
    release() {
      // Frees the canvas's pixels now: Safari caps canvas memory per page.
      canvas.width = canvas.height = 0;
    },
  };
  report(opts, 0.5, 'compressing');
  const decision = await planPhoto(
    host,
    { formats, quality: opts.quality, maxLongEdge: cap, targetBytes: opts.maxSizeMB * 1024 * 1024 },
    { signal: opts.signal, onProgress: (step) => report(opts, 0.5 + step * 0.4, 'compressing') }
  );
  const blob = decision.result;
  // Kept: the source is the only way to keep the never-bigger guarantee, so
  // it comes back honestly labelled as its own format, not as the target.
  if (decision.kept) {
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
    missedTarget: decision.missedTarget,
  };
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
