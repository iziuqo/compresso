import { isHeicSource, decodeHeic, sniffHeicMagic } from './heic.js';

/**
 * Platform seam — the ONLY module that touches host I/O. The pipeline
 * (compress/resize/utils) depends on these primitives, never on `document`,
 * `Image`, or `canvas.toBlob` directly.
 *
 * Two backends, chosen by environment:
 *   • main thread — `new Image()` + `<canvas>` + `toBlob`
 *   • worker      — `createImageBitmap` + `OffscreenCanvas` + `convertToBlob`
 *
 * The worker backend is what lets a host run many compressions in parallel, off
 * the main thread. Nothing else in the library knows which backend is active.
 */

/** True inside a Web Worker (no DOM), false on the main thread. */
const isWorker = typeof document === 'undefined';

/* ------------------------------------------------------------------ decode */

function loadElement(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (typeof source === 'string') {
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = source;
    } else if (source instanceof Blob) {
      const url = URL.createObjectURL(source);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image from Blob')); };
      img.src = url;
    } else {
      reject(new Error('Invalid source: expected File, Blob, or URL string'));
    }
  });
}

/**
 * Decode to an `ImageBitmap`. `imageOrientation: 'from-image'` is what keeps EXIF
 * rotation applied — `new Image()` does that for free, raw `createImageBitmap` on
 * older engines does not. Re-tried without the options bag on engines that reject
 * unknown members, where the default is already equivalent.
 */
async function loadBitmap(blob) {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch (err) {
    if (err instanceof TypeError) return createImageBitmap(blob);
    throw err;
  }
}

/**
 * `isHeicSource()` is deliberately permissive for one case — a Blob with neither a
 * MIME type nor a filename — so a typeless iPhone file still falls back to HEIC
 * decoding correctly. That same permissiveness would otherwise route ANY untyped,
 * unnamed blob into the WASM HEIC decoder on native-decode failure, not just
 * actually-HEIC-shaped ones. This adds a cheap magic-byte confirmation for exactly
 * that ambiguous case; a source with a real type or name that already matched
 * `isHeicSource()`'s stricter checks is trusted as before.
 */
async function shouldDecodeHeic(source) {
  if (!isHeicSource(source)) return false;
  const ambiguous = source instanceof Blob && !source.type && !source.name;
  return ambiguous ? sniffHeicMagic(source) : true;
}

/**
 * Decode a source to a drawable and its intrinsic pixel size. Native decode first
 * (free on Safari/iOS, the common path everywhere); only HEIC/HEIF sources fall
 * back to the lazy WASM decoder. Dimensions are returned explicitly so the rest of
 * the pipeline never reads `.naturalWidth` — an `ImageBitmap` exposes only
 * `.width`/`.height`.
 */
export async function decode(source) {
  if (isWorker) {
    const blob = source instanceof Blob ? source : await (await fetch(source)).blob();
    let image;
    try {
      image = await loadBitmap(blob);
    } catch (err) {
      if (!(await shouldDecodeHeic(blob))) throw err;
      image = await loadBitmap(await decodeHeic(blob));
    }
    return { image, width: image.width, height: image.height };
  }

  let image;
  try {
    image = await loadElement(source);
  } catch (err) {
    if (!(await shouldDecodeHeic(source))) throw err;
    image = await loadElement(await decodeHeic(source));
  }
  return { image, width: image.naturalWidth, height: image.naturalHeight };
}

/* ------------------------------------------------------------------ canvas */

/** A target canvas + its high-quality 2D context. */
export function createCanvas(width, height) {
  const canvas = isWorker
    ? new OffscreenCanvas(width, height)
    : Object.assign(document.createElement('canvas'), { width, height });
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

/** Encode a canvas to a Blob. Handles both `HTMLCanvasElement` and `OffscreenCanvas`. */
export function encode(canvas, mimeType, quality) {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type: mimeType, quality });
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`Failed to encode image as ${mimeType}`))),
      mimeType,
      quality
    );
  });
}

/* ------------------------------------------------------------ capabilities */

let caps;

function canEncodeSync(mimeType) {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    return c.toDataURL(mimeType).startsWith(`data:${mimeType}`);
  } catch {
    return false;
  }
}

/**
 * Worker probe. `OffscreenCanvas` has no `toDataURL`, so the only way to ask "can
 * you encode this?" is to encode a 1×1 and look at what comes back — engines
 * silently fall back to PNG for formats they don't support.
 */
async function canEncodeAsync(mimeType) {
  try {
    const c = new OffscreenCanvas(1, 1);
    c.getContext('2d').fillRect(0, 0, 1, 1);
    const blob = await c.convertToBlob({ type: mimeType });
    return blob.type === mimeType;
  } catch {
    return false;
  }
}

/** Which modern output formats this environment can *encode* (memoized per session). */
export function capabilities() {
  if (caps) return caps;
  // In a worker with nothing probed yet, assume nothing modern rather than guess
  // wrong — `ensureCapabilities()` (awaited by the pipeline) fills this in, and a
  // host can skip probing entirely with `__setCapabilities`.
  if (isWorker) return { avif: false, webp: false };
  return (caps = { avif: canEncodeSync('image/avif'), webp: canEncodeSync('image/webp') });
}

/**
 * Resolve capabilities, probing asynchronously where that is the only option
 * (worker). Awaited once by the pipeline before format selection.
 */
export async function ensureCapabilities() {
  if (caps) return caps;
  if (!isWorker) return capabilities();
  return (caps = {
    avif: await canEncodeAsync('image/avif'),
    webp: await canEncodeAsync('image/webp'),
  });
}

/** Inject a known capability set (worker mode / tests) instead of probing. */
export function __setCapabilities(value) { caps = value; }
/** Clear injected/memoized capabilities so the next call re-probes. */
export function __resetCapabilities() { caps = undefined; }
