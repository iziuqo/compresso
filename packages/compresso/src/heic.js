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
    // heic-to's WASM decoder needs 'wasm-unsafe-eval' (or 'unsafe-eval') under a
    // strict script-src CSP; without it, WebAssembly compilation rejects with an
    // opaque, hard-to-diagnose error. Surface the likely cause instead of it.
    if (/wasm|webassembly/i.test(err?.message)) {
      throw new Error("HEIC decoding needs 'wasm-unsafe-eval' in the page's script-src", { cause: err });
    }
    throw err;
  }
}

/**
 * Decode a HEIC/HEIF source to a displayable, lossless PNG Blob, for example
 * to preview a HEIC file in a browser that can't render it.
 */
export async function decodeHeic(source) {
  // As compress() does: in Node the codec throws "Worker is not defined", and in Bun it never settles (PKG-12).
  assertBrowserEnvironment();
  return heicTo(source, 'image/png');
}

/**
 * Decode a HEIC/HEIF source straight to an `ImageBitmap`, as the pipeline
 * does: no PNG round trip (PERF-07). The pool's workers never import the
 * codec: they ask the page to run this and hand them the bitmap, so an app
 * that bundles the pool still carries one codec copy.
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
