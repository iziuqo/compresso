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

// heic-to's default export touches `document` internally (Emscripten glue
// code that resolves its own script URL) and throws ReferenceError inside a
// worker, where `document` doesn't exist. The package ships a dedicated
// worker-safe variant for exactly this — see its README's "Call heic-to in
// web worker" section: `import { heicTo } from 'heic-to/next'`.
const isWorker = typeof document === 'undefined';

let heicToUrl = null;

/**
 * Worker-only escape hatch: overrides where decodeHeic() imports the lazy
 * 'heic-to/next' codec from. Not part of the public surface (undocumented in
 * the README, same as __setCapabilities) — pool.js calls this, no host ever
 * needs to.
 *
 * Why this exists: a bare `import('heic-to/next')` resolves fine from a
 * worker built as first-party source (any bundler processes it as part of
 * the normal module graph), but not reliably from *inside* worker.js once it
 * ships as a pre-built file in a consumer's node_modules — bundlers that
 * special-case `new Worker(new URL(...))` (Vite confirmed, likely others)
 * generally don't also recurse into that worker file looking for further
 * imports to bundle/copy, so a bare specifier left inside it can 404 or fail
 * to resolve at runtime after a real production build. pool.js resolves the
 * codec chunk's URL itself — a file bundlers *do* process normally, the same
 * way it already resolves worker.js's own URL — and hands the concrete,
 * already-absolute URL to the worker, which imports it directly with no
 * bundler cooperation needed at runtime. Pass `null` to clear the override
 * back to the default specifier.
 */
export function __setHeicToUrl(url) {
  heicToUrl = url;
}

async function importHeicTo() {
  // Both branches are kept as their own literal `import('heic-to' | 'heic-
  // to/next')` calls so bundlers can statically find and chunk whichever one
  // actually applies to a given build — worker.js's own module graph only
  // ever reaches the /next branch (isWorker is always true there), the main
  // entry's only ever reaches the default one.
  if (isWorker) {
    if (heicToUrl) {
      try {
        return await import(/* @vite-ignore */ /* webpackIgnore: true */ heicToUrl);
      } catch {
        // The override points at a production build artifact (the code-
        // split dist/heic-to.js sibling) that doesn't exist yet in dev/test
        // — pool.js still resolves *a* URL there (relative to src/pool.js),
        // it just doesn't point at a real file until a build runs. Fall
        // through to the bare specifier below, which Vite's dev server (or
        // any bundler processing this file directly rather than as a worker
        // asset) resolves correctly on its own. A genuinely broken override
        // in a real production deployment ends up here too, tries the bare
        // specifier, and — since that's the exact case this override exists
        // to work around — fails the same way decodeHeic()'s own catch
        // already reports, not silently.
      }
    }
    return import('heic-to/next');
  }
  return import('heic-to');
}

/**
 * Decode a HEIC/HEIF source to a displayable, lossless PNG Blob via a lazily-loaded
 * codec, so the tiny core stays codec-free until a HEIC image is actually
 * encountered. PNG keeps the intermediate lossless before the pipeline re-encodes,
 * and is directly usable as an `<img>` preview in browsers that can't render HEIC.
 */
export async function decodeHeic(source) {
  let heicTo;
  try {
    ({ heicTo } = await importHeicTo());
  } catch {
    throw new Error(
      "HEIC support requires the optional 'heic-to' package. Install it with: npm i heic-to"
    );
  }
  const blob = source instanceof Blob ? source : await (await fetch(source)).blob();
  try {
    return await heicTo({ blob, type: 'image/png' });
  } catch (err) {
    // heic-to's WASM decoder needs 'wasm-unsafe-eval' (or 'unsafe-eval') under a
    // strict script-src CSP; without it, WebAssembly compilation rejects with an
    // opaque, hard-to-diagnose error. Surface the likely cause instead of it.
    if (err instanceof Error && /wasm|webassembly/i.test(err.message)) {
      throw new Error(
        'HEIC decoding failed to initialize its WASM decoder. If this page sets a ' +
        "Content-Security-Policy, add 'wasm-unsafe-eval' (or 'unsafe-eval') to script-src."
      );
    }
    throw err;
  }
}

const HEIC_BRANDS = new Set([
  'heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1',
]);

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
  const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (head.length < 12) return false;
  if (String.fromCharCode(head[4], head[5], head[6], head[7]) !== 'ftyp') return false;
  return HEIC_BRANDS.has(String.fromCharCode(head[8], head[9], head[10], head[11]));
}
