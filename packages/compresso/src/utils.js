import { capabilities } from './platform.js';

/**
 * Canonical format name → its MIME type and the extension a file of it
 * carries. Results always use these names: `jpeg`, never `jpg` (API-02).
 */
const FORMATS = {
  jpeg: ['image/jpeg', 'jpg'],
  png: ['image/png', 'png'],
  webp: ['image/webp', 'webp'],
  avif: ['image/avif', 'avif'],
  gif: ['image/gif', 'gif'],
  heic: ['image/heic', 'heic'],
  svg: ['image/svg+xml', 'svg'],
};
/** Other spellings of a format, as options, extensions or MIME subtypes. */
const ALIASES = { jpg: 'jpeg', heif: 'heic', 'svg+xml': 'svg' };

/** The canonical name for `format` in any case or spelling (`'JPG'` → `'jpeg'`). */
export function canonicalFormat(format) {
  const name = format.toLowerCase();
  return ALIASES[name] ?? name;
}

/** `name`'s canonical format, if it names one we know. */
function known(name) {
  const format = canonicalFormat(name || '');
  return FORMATS[format] ? format : null;
}

/** The format a MIME type, or a URL or file name's extension, names. */
const formatOfMime = (mime) => known(mime.split('/')[1]);
const formatFromName = (name) => known(name.split('.').pop());

export function formatToMime(format) {
  return FORMATS[known(format) ?? 'jpeg'][0];
}

export function mimeToExtension(mime) {
  return FORMATS[formatOfMime(mime) ?? 'jpeg'][1];
}

/** Source format from a URL string, a Blob's MIME type, or a File's name, in that order. */
export function detectFormat(file) {
  if (typeof file === 'string') return formatFromName(file);
  if (file.type) return formatOfMime(file.type);
  return file.name ? formatFromName(file.name) : null;
}

export function generateFileName(source, format) {
  const ext = FORMATS[known(format) ?? 'jpeg'][1];
  const baseName = source?.name ? source.name.replace(/\.[^.]+$/, '') : 'image';
  return `${baseName}.${ext}`;
}

/**
 * The result's file: a new name for new bytes, and the source's own name
 * when the source itself came back (COR-06), unless that name's extension
 * says another format than its bytes are.
 */
export function resultFile(source, blob, { kept, format, mimeType }) {
  const own = kept && source?.name && formatFromName(source.name) === known(format);
  return new File([blob], own ? source.name : generateFileName(source, format), { type: mimeType });
}

/** Can this browser *encode* the given output format? JPEG/PNG are always available. */
export function isFormatSupported(format) {
  const f = canonicalFormat(format);
  return f === 'jpeg' || f === 'png' || !!capabilities()[f];
}

/** Best output format the browser can encode: AVIF → WebP → JPEG. */
export function getBestFormat() {
  const caps = capabilities();
  return caps.avif ? 'avif' : caps.webp ? 'webp' : 'jpeg';
}
