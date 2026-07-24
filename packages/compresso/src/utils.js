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

export function detectFormat(file) {
  if (typeof file === 'string') {
    const ext = file.split('.').pop().toLowerCase();
    return MIME_TYPES[ext] ? ext : null;
  }
  if (file.type) return EXTENSIONS[file.type] || null;
  if (file.name) {
    const ext = file.name.split('.').pop().toLowerCase();
    return MIME_TYPES[ext] ? ext : null;
  }
  return null;
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
