import { isHeicSource, decodeHeic } from './heic.js';

/**
 * Platform seam — the ONLY module that touches host I/O. The pipeline
 * (compress/resize/utils) depends on these four primitives, never on `document`,
 * `Image`, or `canvas.toBlob` directly. A future worker backend swaps this file to
 * use `createImageBitmap` + `OffscreenCanvas` + `convertToBlob` with zero changes
 * to the pipeline. `encode` already accepts an `OffscreenCanvas`, and capabilities
 * can be injected (see `__setCapabilities`) so a worker can be told what the main
 * thread detected instead of re-probing.
 */

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
 * Decode a source to a drawable and its intrinsic pixel size. Native decode first
 * (free on Safari/iOS, the common path everywhere); only HEIC/HEIF sources fall
 * back to the lazy WASM decoder. Dimensions are returned explicitly so the rest of
 * the pipeline never reads `.naturalWidth` — an `ImageBitmap` (worker) exposes only
 * `.width`/`.height`.
 */
export async function decode(source) {
  let image;
  try {
    image = await loadElement(source);
  } catch (err) {
    if (!isHeicSource(source)) throw err;
    image = await loadElement(await decodeHeic(source));
  }
  return { image, width: image.naturalWidth, height: image.naturalHeight };
}

/** A target canvas + its high-quality 2D context. */
export function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
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

let caps;

function canEncode(mimeType) {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    return c.toDataURL(mimeType).startsWith(`data:${mimeType}`);
  } catch {
    return false;
  }
}

/** Which modern output formats this environment can *encode* (memoized per session). */
export function capabilities() {
  return (caps ??= { avif: canEncode('image/avif'), webp: canEncode('image/webp') });
}

/** Inject a known capability set (worker mode / tests) instead of probing. */
export function __setCapabilities(value) { caps = value; }
/** Clear injected/memoized capabilities so the next call re-probes. */
export function __resetCapabilities() { caps = undefined; }
