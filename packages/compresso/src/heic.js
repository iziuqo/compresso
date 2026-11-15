import { assertBrowserEnvironment } from './environment.js';
import { sniffFormat } from './probe.js';

const HEIC_MIME = /^image\/hei[cf]$/;
const HEIC_EXT = /\.(heic|heif)$/i;

/**
 * Heuristic guess (no bytes read) for whether a source is HEIC/HEIF. Used only to
 * gate the expensive decode path. iPhone files frequently arrive with an empty
 * MIME type, so the extension is also checked; a typeless, nameless blob counts as
 * a candidate so it can still fall back to HEIC after native decoding has failed.
 */
export function isHeicSource(source) {
  if (source instanceof Blob) {
    if (source.type && HEIC_MIME.test(source.type)) return true;
    if (source.name && HEIC_EXT.test(source.name)) return true;
    return !source.type && !source.name;
  }
  if (typeof source === 'string') return HEIC_EXT.test(source.split('?')[0]);
  return false;
}

/**
 * The app's own `heic-to`, loaded on the first HEIC image that native
 * decoding can't read, so the core stays codec-free until then. It is an
 * optional dependency, LGPL-3.0, installed beside this package and never
 * bundled into it (SEC-01). One bare import, so every bundler emits one codec
 * chunk from the app's own copy (PKG-05). It decodes inside its own worker.
 */
async function heicTo(source, type) {
  let codec;
  try {
    codec = await import('heic-to');
  } catch (cause) {
    // Names the real cause, a blocked or failed chunk load included, not only a missing package.
    throw new Error(`HEIC input needs the optional 'heic-to' package (npm i heic-to): ${cause}`, { cause });
  }
  const blob = source instanceof Blob ? source : await (await fetch(source)).blob();
  try {
    return await codec.heicTo({ blob, type });
  } catch (err) {
    // heic-to rejects with its decoder's message as a string, or with
    // undefined when its own worker fails, a CSP that blocks it say: always
    // an Error here, naming what heic-to said. A page CSP that blocks its
    // WebAssembly shows as the browser's own CompileError message.
    throw new Error(`HEIC decoding failed: ${err?.message ?? err}`, { cause: err });
  }
}

/**
 * Decode a HEIC/HEIF source to a displayable, lossless PNG Blob, for example
 * to preview a HEIC file in a browser that can't render it.
 */
export async function decodeHeic(source) {
  // As compress() does: in Node the codec throws "Worker is not defined", and in Bun it never settles (PKG-12).
  assertBrowserEnvironment();
  if (typeof document !== 'undefined') return heicTo(source, 'image/png');
  // In a worker: heic-to's own PNG output draws on a `document` canvas.
  const image = await heicTo(source, 'bitmap');
  const canvas = new OffscreenCanvas(image.width, image.height);
  canvas.getContext('2d').drawImage(image, 0, 0);
  image.close();
  return canvas.convertToBlob({ type: 'image/png' });
}

/**
 * Decode a HEIC/HEIF source straight to an `ImageBitmap`, as the pipeline
 * does: no PNG round trip (PERF-07). The pool's workers never import the
 * codec: they ask the page to run this and hand them the bitmap, so an app
 * that bundles the pool still carries one codec copy. heic-to decodes in one
 * worker of its own, so the page's decodes run one at a time.
 */
export const decodeHeicToBitmap = (source) => heicTo(source, 'bitmap');

/**
 * Confirms a blob is actually HEIC/HEIF-shaped by its ISOBMFF `ftyp` box, rather
 * than trusting a MIME-type/filename heuristic alone. `isHeicSource()` above is
 * deliberately permissive for one case — an untyped, unnamed blob — so a typeless
 * iPhone file still falls back to HEIC decoding correctly; that same permissiveness
 * would let *any* untyped, unnamed blob reach the WASM decoder unconfirmed. This is
 * the confirmation gate for that one case — see platform.js's `decode()`, its sole
 * caller.
 */
export async function sniffHeicMagic(blob) {
  return (await sniffFormat(blob)) === 'heic';
}
