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
  return heicTo({ blob, type: 'image/png' });
}
