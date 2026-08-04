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
 * Decode a HEIC/HEIF source to a displayable, lossless PNG Blob via a lazily-loaded
 * codec, so the tiny core stays codec-free until a HEIC image is actually
 * encountered. PNG keeps the intermediate lossless before the pipeline re-encodes,
 * and is directly usable as an `<img>` preview in browsers that can't render HEIC.
 */
export async function decodeHeic(source) {
  let heicTo;
  try {
    ({ heicTo } = await import('heic-to'));
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
