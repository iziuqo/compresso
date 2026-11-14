/**
 * The honesty check: every field of a compress() result must describe the
 * bytes it carries. It re-reads the output from scratch (magic bytes, a fresh
 * decode, the object URL) and compares the result's claims with that in one
 * assertion, so a failure lists every field that lies, side by side.
 */
import { expect } from 'vitest';
import { decodeHeic } from '../../../src/heic.js';

/** Canonical format names, their MIME type and the file extensions that may carry them. */
const FORMATS = {
  jpeg: { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
  png: { mime: 'image/png', extensions: ['png'] },
  gif: { mime: 'image/gif', extensions: ['gif'] },
  webp: { mime: 'image/webp', extensions: ['webp'] },
  avif: { mime: 'image/avif', extensions: ['avif'] },
  heic: { mime: 'image/heic', extensions: ['heic', 'heif'] },
  svg: { mime: 'image/svg+xml', extensions: ['svg'] },
};
const ALIASES = { 'image/heif': 'image/heic', jpeg: 'jpg', heif: 'heic' };
const normal = (value) => ALIASES[value] ?? value;
const ascii = (bytes, start, end) => String.fromCharCode(...bytes.subarray(start, end));

/** The format the bytes really are, from their signature; `null` if unknown. */
export function sniffFormat(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (ascii(bytes, 0, 8) === '\x89PNG\r\n\x1a\n') return 'png';
  if (ascii(bytes, 0, 4) === 'GIF8') return 'gif';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'webp';
  if (ascii(bytes, 4, 8) === 'ftyp') {
    // Major brand, then the compatible brands up to the end of the ftyp box.
    const end = Math.min(new DataView(bytes.buffer, bytes.byteOffset).getUint32(0), bytes.length);
    const brands = [ascii(bytes, 8, 12)];
    for (let i = 16; i + 4 <= end; i += 4) brands.push(ascii(bytes, i, i + 4));
    if (brands.some((b) => b === 'avif' || b === 'avis')) return 'avif';
    if (brands.some((b) => /^(hei[cxms]|hev[cxms]|mif1|msf1)$/.test(b))) return 'heic';
  }
  if (/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/.test(ascii(bytes, 0, 256))) return 'svg';
  return null;
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('undecodable')); };
    img.src = url;
  });
}

/**
 * Displayed size of an image Blob, EXIF orientation applied (an `<img>` does
 * that in every supported engine). HEIC goes through heic-to where the engine
 * can't decode it natively.
 */
export async function displayedSize(blob, format) {
  let img;
  try {
    img = await loadImage(blob);
  } catch (err) {
    if (format !== 'heic') throw err;
    img = await loadImage(await decodeHeic(blob));
  }
  return { width: img.naturalWidth, height: img.naturalHeight };
}

/**
 * Asserts that `result` is honest about its bytes, and about `source` when
 * given: format, MIME types, file name, sizes, dimensions, savings and URL.
 * Every browser test calls this on every result it gets.
 */
export async function expectHonestResult(result, source) {
  const { blob, file } = result;
  expect(blob).toBeInstanceOf(Blob);
  expect(file).toBeInstanceOf(File);
  const format = sniffFormat(new Uint8Array(await blob.arrayBuffer()));
  const mime = FORMATS[format]?.mime ?? null;
  const size = await displayedSize(blob, format);
  const urlBytes = (await (await fetch(result.url)).blob()).size;
  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';

  const claimed = {
    format: result.format,
    mimeType: normal(result.mimeType),
    blobType: normal(blob.type),
    fileType: normal(file.type),
    extension: normal(extension),
    compressedSize: result.compressedSize,
    fileSize: file.size,
    urlBytes,
    width: result.width,
    height: result.height,
  };
  const actual = {
    format,
    mimeType: mime,
    blobType: mime,
    fileType: mime,
    extension: normal(FORMATS[format]?.extensions[0] ?? null),
    compressedSize: blob.size,
    fileSize: blob.size,
    urlBytes: blob.size,
    ...size,
  };

  if (source instanceof Blob) {
    const original = await displayedSize(source, sniffFormat(new Uint8Array(await source.arrayBuffer())));
    Object.assign(claimed, {
      originalSize: result.originalSize,
      originalWidth: result.originalWidth,
      originalHeight: result.originalHeight,
      savings: result.savings,
    });
    Object.assign(actual, {
      originalSize: source.size,
      originalWidth: original.width,
      originalHeight: original.height,
      savings: source.size > 0 ? Math.round((1 - blob.size / source.size) * 1000) / 10 : 0,
    });
  }
  expect(claimed, 'every result field must describe the bytes it carries').toEqual(actual);
}
