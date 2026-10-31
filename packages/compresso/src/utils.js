import { capabilities } from './platform.js';

const MIME_TYPES = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export function formatToMime(format) {
  return MIME_TYPES[format.toLowerCase()] || MIME_TYPES.jpeg;
}

export function mimeToExtension(mime) {
  return EXTENSIONS[mime] || 'jpg';
}

/** The format a URL or file name's extension names, if it is one we know. */
function formatFromName(name) {
  const ext = name.split('.').pop().toLowerCase();
  return MIME_TYPES[ext] ? ext : null;
}

/** Source format from a URL string, a Blob's MIME type, or a File's name, in that order. */
export function detectFormat(file) {
  if (typeof file === 'string') return formatFromName(file);
  if (file.type) return EXTENSIONS[file.type] || null;
  return file.name ? formatFromName(file.name) : null;
}

export function generateFileName(source, format) {
  const ext = mimeToExtension(formatToMime(format));
  const baseName = source?.name ? source.name.replace(/\.[^.]+$/, '') : 'image';
  return `${baseName}.${ext}`;
}

/** Can this browser *encode* the given output format? JPEG/PNG are always available. */
export function isFormatSupported(format) {
  const f = format.toLowerCase();
  if (f === 'jpeg' || f === 'jpg' || f === 'png') return true;
  return !!capabilities()[f];
}

/** Best output format the browser can encode: AVIF → WebP → JPEG. */
export function getBestFormat() {
  const caps = capabilities();
  return caps.avif ? 'avif' : caps.webp ? 'webp' : 'jpeg';
}
