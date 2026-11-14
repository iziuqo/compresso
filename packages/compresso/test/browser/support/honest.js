/**
 * The honesty check: every field of a compress() result must describe the
 * bytes it carries. It re-reads the output from scratch (magic bytes, a fresh
 * decode, the object URL) and compares the result's claims with that in one
 * assertion, so a failure lists every field that lies, side by side.
 */
import { expect } from 'vitest';
import { decodeHeic } from '../../../src/heic.js';
import { FORMATS, normal, sniffFormat } from '../../support/formats.js';

const bytesOf = async (blob) => new Uint8Array(await blob.arrayBuffer());
const sameBytes = (a, b) => a.length === b.length && a.every((byte, i) => byte === b[i]);

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
 * A decoded `<img>` of an image Blob, EXIF orientation applied (an `<img>`
 * does that in every supported engine). HEIC goes through heic-to where the
 * engine can't decode it natively.
 */
export async function decodeImage(blob, format) {
  try {
    return await loadImage(blob);
  } catch (err) {
    if (format !== 'heic') throw err;
    return loadImage(await decodeHeic(blob));
  }
}

async function displayedSize(blob, format) {
  const img = await decodeImage(blob, format);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

/**
 * Asserts that `result` is honest about its bytes, and about `source` when
 * given: format, MIME types, file name, contents, sizes, dimensions, savings
 * and URL. Every browser test calls this on every result it inspects. The
 * result's object URL is revoked afterwards.
 */
export async function expectHonestResult(result, source) {
  const { blob, file } = result;
  expect(blob).toBeInstanceOf(Blob);
  expect(file).toBeInstanceOf(File);
  const bytes = await bytesOf(blob);
  const format = sniffFormat(bytes);
  const mime = FORMATS[format]?.mime ?? null;
  const urlBytes = await bytesOf(await (await fetch(result.url)).blob());
  URL.revokeObjectURL(result.url);
  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';

  const claimed = {
    format: result.format,
    mimeType: normal(result.mimeType),
    blobType: normal(blob.type),
    fileType: normal(file.type),
    extension: normal(extension),
    compressedSize: result.compressedSize,
    fileHasTheBytes: sameBytes(await bytesOf(file), bytes),
    urlHasTheBytes: sameBytes(urlBytes, bytes),
    width: result.width,
    height: result.height,
  };
  const actual = {
    format,
    mimeType: mime,
    blobType: mime,
    fileType: mime,
    extension: FORMATS[format]?.extension ?? null,
    compressedSize: bytes.length,
    fileHasTheBytes: true,
    urlHasTheBytes: true,
    ...(await displayedSize(blob, format)),
  };

  if (source instanceof Blob) {
    const original = await displayedSize(source, sniffFormat(await bytesOf(source)));
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
      // The documented definition: percent saved, one decimal.
      savings: source.size > 0 ? Math.round((1 - bytes.length / source.size) * 1000) / 10 : 0,
    });
  }
  expect(claimed, 'every result field must describe the bytes it carries').toEqual(actual);
}

/**
 * A `failsWith` predicate for `KNOWN_FAILURES`: true when `error` is the
 * honesty check failing on at least one of `fields`, so any other failure
 * (a timeout, a missing fixture, a codec that didn't load) is not mistaken
 * for the known bug.
 */
export const liesAbout = (...fields) => (error) =>
  fields.some((field) => error?.actual && error?.expected && !Object.is(error.actual[field], error.expected[field]));
