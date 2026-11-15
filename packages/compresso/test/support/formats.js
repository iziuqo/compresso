/**
 * Image formats as tests see them: canonical names, MIME types, extensions,
 * and the format a file really is from its leading bytes. Pure, so both the
 * Node unit tests and the browser tests use it.
 */

/** Canonical format name → MIME type and the extension a correctly named file carries. */
export const FORMATS = {
  jpeg: { mime: 'image/jpeg', extension: 'jpg' },
  png: { mime: 'image/png', extension: 'png' },
  gif: { mime: 'image/gif', extension: 'gif' },
  webp: { mime: 'image/webp', extension: 'webp' },
  avif: { mime: 'image/avif', extension: 'avif' },
  heic: { mime: 'image/heic', extension: 'heic' },
  svg: { mime: 'image/svg+xml', extension: 'svg' },
};

/** Equivalent spellings, folded to one before comparing. */
const ALIASES = { 'image/heif': 'image/heic', jpeg: 'jpg', heif: 'heic' };
export const normal = (value) => ALIASES[value] ?? value;

const ascii = (bytes, start, end) => String.fromCharCode(...bytes.subarray(start, end));

/** ISOBMFF brands: AVIF's, then HEIF's (HEVC or the generic image brands). */
const AVIF_BRANDS = /^avi[fos]$/;
const HEIC_BRANDS = /^(hei[cxms]|hev[cxms]|mif1|msf1)$/;

/** The `ftyp` box's major brand and compatible brands, or `null` if there is none. */
function brands(bytes) {
  if (ascii(bytes, 4, 8) !== 'ftyp') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Box size 0 runs to the end of the data; 1 means a 64-bit size follows the type.
  const size = view.getUint32(0);
  const header = size === 1 ? 16 : 8;
  const end = size === 0 ? bytes.length : size === 1 ? Number(view.getBigUint64(8)) : size;
  const list = [ascii(bytes, header, header + 4)];
  for (let i = header + 8; i + 4 <= Math.min(end, bytes.length); i += 4) list.push(ascii(bytes, i, i + 4));
  return list;
}

/**
 * True when the text, past a BOM, XML declaration, comments and a DOCTYPE,
 * opens an `<svg>` element. The prologue is skipped one piece at a time: one
 * regex with a repeated group of those pieces can backtrack exponentially.
 */
function isSvg(bytes) {
  const prologue = /^(?:<\?xml[^>]*>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>)/i;
  let text = new TextDecoder().decode(bytes.subarray(0, 1024)).replace(/^\uFEFF/, '').trimStart();
  for (let piece; (piece = prologue.exec(text)); ) text = text.slice(piece[0].length).trimStart();
  return /^<svg[\s>]/i.test(text);
}

/** The canonical format the bytes really are, from their signature; `null` if unknown. */
export function sniffFormat(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (ascii(bytes, 0, 8) === '\x89PNG\r\n\x1a\n') return 'png';
  if (ascii(bytes, 0, 4) === 'GIF8') return 'gif';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'webp';
  const ftyp = brands(bytes);
  if (ftyp) {
    // The major brand decides; compatible brands only settle a generic one.
    const [major] = ftyp;
    if (AVIF_BRANDS.test(major)) return 'avif';
    if (HEIC_BRANDS.test(major) && major !== 'mif1' && major !== 'msf1') return 'heic';
    if (ftyp.some((b) => AVIF_BRANDS.test(b))) return 'avif';
    if (ftyp.some((b) => HEIC_BRANDS.test(b))) return 'heic';
    return null;
  }
  return isSvg(bytes) ? 'svg' : null;
}
