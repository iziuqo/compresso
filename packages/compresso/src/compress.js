import { canonicalFormat, detectFormat, formatToMime, getBestFormat, isFormatSupported, resultFile } from './utils.js';
import { decode, encode, ensureCapabilities } from './platform.js';
import { calculateDimensions, renderToCanvas } from './resize.js';
import { isAnimated, probeDimensions, sniffFormat } from './probe.js';
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
export const DEFAULT_MAX_INPUT_PIXELS = 100_000_000;

// The defaults compress() reads from `opts`. `maxWidth` and `maxHeight` are
// read from the caller's own options, where unset differs from `Infinity`;
// `signal` and `onProgress` are optional.
const DEFAULTS = {
  quality: 0.8,
  format: 'auto',
  maxSizeMB: Infinity,
  maxInputPixels: DEFAULT_MAX_INPUT_PIXELS,
  backgroundColor: '#ffffff',
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

/**
 * The longest edge each format can hold (px). WebP stores 14-bit sizes, and
 * past 16,383 Chromium cuts the image while Firefox refuses it (COR-01).
 * Every other format stops at MAX_CANVAS_EDGE, the longest edge every
 * engine's canvas holds (Firefox's limit). Output past a limit is scaled to fit.
 */
const EDGE_LIMITS = { webp: 16383 };
const MAX_CANVAS_EDGE = 32767;
/** The smallest long edge the canvas step-down tries before giving up (px), the planner's own floor. */
const MIN_CANVAS_EDGE = 480;

export async function compress(source, options = {}) {
  // Fail clearly, once, up front — rather than deep inside the pipeline on a
  // confusing "X is not a function" — if called somewhere that is neither a
  // browser main thread nor a Web Worker (e.g. Node.js, or a framework's SSR
  // pass). Guard call sites with `typeof window !== 'undefined'` instead.
  if (typeof Image === 'undefined' && typeof OffscreenCanvas === 'undefined') {
    throw new Error('compresso.js requires a browser or Web Worker environment, not Node.js or server-side rendering');
  }

  const opts = { ...DEFAULTS, ...options };
  throwIfAborted(opts.signal);

  // Resolve encode capabilities before choosing a format. On the main thread this
  // is a memoized sync probe; in a worker it is an async one (OffscreenCanvas has
  // no `toDataURL`), which is why the pipeline awaits it here.
  await ensureCapabilities();
  // Not const: a kept source, or bytes that aren't what their label says,
  // retarget these below.
  let format = opts.format === 'auto' ? getBestFormat() : canonicalFormat(opts.format);
  // Why the result isn't exactly what was asked, if it isn't (RFC 0001).
  let reason = null;
  // A format this browser can't encode falls back to the best it can (O4).
  if (!isFormatSupported(format)) {
    format = getBestFormat();
    reason = 'unsupported-format';
  }
  let mimeType = formatToMime(format);
  // What the source really is: its bytes, else its type or name.
  const sourceFormat = (source instanceof Blob ? await sniffFormat(source) : null) ?? (source && detectFormat(source));
  // A conversion the caller asked for is honoured even when the file grows,
  // and the result shows it (O4). `auto`, a fallback, and a source already in
  // the asked format never grow.
  const converting = opts.format !== 'auto' && !reason && sourceFormat !== format;
  // Sources that come back untouched whatever was asked (COR-16), and why:
  // SVG, which a canvas can only flatten to pixels, and an animation, whose
  // re-encode would keep only its first frame.
  const keptAs = source instanceof Blob && (sourceFormat === 'svg' ? 'vector' : (await isAnimated(source, sourceFormat)) && 'animated');
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
  // A File or Blob's size; a URL source has no known size.
  const originalSize = source.size || 0;
  let canvas, width, height, encodes;
  const formats = [format];
  const host = {
    formats,
    async prepare(maxLongEdge = Infinity) {
      for (let edge = Math.min(maxLongEdge, EDGE_LIMITS[formats[0]] ?? MAX_CANVAS_EDGE); ; ) {
        ({ width, height } = calculateDimensions(
          originalWidth,
          originalHeight,
          Math.min(options.maxWidth ?? Infinity, edge),
          Math.min(options.maxHeight ?? Infinity, edge)
        ));
        canvas = renderToCanvas(image, originalWidth, originalHeight, width, height, bgColor);
        if (canvas) break;
        // The browser can't hold a canvas this big (CMP-03): halve the pixels.
        // `width` and `height` then report the size really encoded.
        edge = Math.floor(Math.max(width, height) * Math.SQRT1_2);
        // Too large for this browser at any size: it has no canvas memory left.
        if (edge < MIN_CANVAS_EDGE) throw tooLargeError();
      }
      encodes = new Map();
      return {
        width,
        height,
        // PNG ignores quality, and an asked conversion is honoured, so only a
        // size target caps these, not the source's size.
        originalSize: mimeType === 'image/png' || converting ? 0 : originalSize,
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
  const targetBytes = opts.maxSizeMB * 1024 * 1024;
  let { result: blob, kept, missedTarget } = keptAs
    ? { result: source, kept: true, missedTarget: targetBytes > 0 && source.size > targetBytes }
    : await planPhoto(
      host,
      { formats, quality: opts.quality, maxLongEdge: cap, targetBytes },
      { signal: opts.signal, onProgress: (step) => report(opts, 0.5 + step * 0.4, 'compressing') }
    );
  // Named by what the bytes are (COR-02, COR-06): a canvas may label bytes as
  // a format it can't encode, and a kept source is whatever it is, a format
  // this library doesn't know (BMP, say) included.
  if (kept) {
    reason = keptAs || 'not-smaller';
    format = sourceFormat ?? (source.type?.split('/')[1] || '');
    mimeType = sourceFormat ? formatToMime(sourceFormat) : source.type || '';
    width = originalWidth;
    height = originalHeight;
  } else {
    const real = await sniffFormat(blob);
    if (real && real !== format) {
      reason = 'unsupported-format';
      format = real;
      mimeType = formatToMime(real);
    }
  }
  // The blob is labelled as its bytes are, an untyped kept source included.
  if (blob.type !== mimeType) blob = new Blob([blob], { type: mimeType });
  throwIfAborted(opts.signal);

  report(opts, 1, 'done');
  const result = { kept, reason, missedTarget, format, mimeType };

  return {
    file: resultFile(source, blob, result),
    blob,
    url: URL.createObjectURL(blob),
    width,
    height,
    originalWidth,
    originalHeight,
    originalSize,
    compressedSize: blob.size,
    savings: originalSize > 0 ? Math.round((1 - blob.size / originalSize) * 1000) / 10 : 0,
    ...result,
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
