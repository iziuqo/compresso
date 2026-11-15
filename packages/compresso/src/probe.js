/**
 * Cheap, header-only dimension sniff for JPEG/PNG/WebP — reads a small byte prefix
 * and returns declared dimensions without decoding a single pixel, so a crafted
 * file with a huge declared resolution can be rejected before the expensive full
 * decode (`createImageBitmap` / `new Image()`) even starts. A post-decode check
 * still exists as defense-in-depth and as the only guard for HEIC/AVIF/URL
 * sources, where header-only probing is materially harder (HEIC/AVIF) or the
 * bytes aren't available cheaply (a remote URL) — see compress.js.
 */

const MAX_PROBE_BYTES = 65536;

export async function probeDimensions(blob) {
  const head = await bytes(blob, MAX_PROBE_BYTES);
  return { png: probePng, jpeg: probeJpeg, webp: probeWebp }[formatOf(head)]?.(head) ?? null;
}

/**
 * The canonical format a blob's bytes really are, from their signature, or
 * `null` when there is none to read (SVG is text). A canvas can label bytes
 * as a format it can't encode (COR-02, CMP-16), so results are named by this,
 * never by a label.
 */
export async function sniffFormat(blob) {
  return formatOf(await bytes(blob, 64));
}

/**
 * Whether a GIF, PNG or WebP holds more than one frame: animated GIF, APNG or
 * animated WebP. A re-encode would keep the first frame only (COR-16), so
 * these come back untouched. Read from headers, never decoded: an APNG
 * declares its frames before its first image data, so its chunk headers are
 * read up to there, however large the chunks before it; an animated WebP sets
 * a flag in its first chunk; a GIF is walked block by block to its second
 * frame, so it is read whole.
 */
export async function isAnimated(blob, format) {
  if (format === 'png') {
    // Chunks: length, type, data, CRC. https://www.w3.org/TR/png/#acTL-chunk
    for (let o = 8, c; (c = await bytes(blob.slice(o), 12)).length === 12; o += 12 + readUint32BE(c, 0)) {
      const type = fourCC(c, 4);
      if (type === 'acTL') return readUint32BE(c, 8) > 1;
      if (type === 'IDAT') break;
    }
  }
  const b = await bytes(blob, format === 'gif' ? blob.size : 32);
  if (format === 'webp') return fourCC(b, 12) === 'VP8X' && (b[20] & 2) > 0;
  if (format === 'gif') {
    // After the 13-byte header and the global colour table: extensions
    // (0x21) and frames (0x2C), each ending in data sub-blocks, until the
    // trailer (0x3B). https://www.w3.org/Graphics/GIF/spec-gif89a.txt
    // A colour table, when the flag (0x80) is set, of 2 ** (n + 1) RGB entries.
    const colours = (packed) => packed >> 7 && 6 << (packed & 7);
    for (let o = 13 + colours(b[10]), frames = 0; o < b.length && b[o] !== 0x3b; o++) {
      if (b[o] !== 0x2c) o += 2; // an extension: introducer, label
      else if (++frames > 1) return true;
      else o += 11 + colours(b[o + 9]); // a frame: descriptor, colour table, LZW code size
      while (b[o]) o += b[o] + 1;
    }
  }
  return false;
}

const bytes = async (blob, length) => new Uint8Array(await blob.slice(0, length).arrayBuffer());

// An ISOBMFF file (`ftyp`, as MP4 also is) is AVIF when an AVIF brand
// appears in its ftyp box, else HEIC when a HEIF one does.
function formatOf(b) {
  const tag = fourCC(b, 0);
  const brands = fourCC(b, 4) === 'ftyp' ? String.fromCharCode(...b.subarray(8, readUint32BE(b, 0))) : '';
  return b[0] === 0xff && b[1] === 0xd8 ? 'jpeg'
    : tag === '\x89PNG' ? 'png'
    : tag === 'GIF8' ? 'gif'
    : tag === 'RIFF' && fourCC(b, 8) === 'WEBP' ? 'webp'
    : /avi[fos]/.test(brands) ? 'avif'
    : /he[iv][cxms]|m[is]f1/.test(brands) ? 'heic'
    : null;
}

// Each probe below runs only on bytes that `formatOf` named its format.

// PNG: an 8-byte signature, then the IHDR chunk's width/height at a fixed
// offset (big-endian uint32 each). https://www.w3.org/TR/png/#11IHDR
function probePng(b) {
  if (b.length < 24 || fourCC(b, 12) !== 'IHDR') return null;
  return { width: readUint32BE(b, 16), height: readUint32BE(b, 20) };
}

// JPEG: walk marker segments from the SOI (0xFFD8) looking for a Start-Of-Frame
// marker (0xFFC0-0xFFCF, excluding the non-frame markers 0xC4/0xC8/0xCC), whose
// payload starts with 1 byte precision, then height/width as big-endian uint16.
function probeJpeg(b) {
  let offset = 2;
  while (offset + 4 <= b.length) {
    if (b[offset] !== 0xff) { offset++; continue; } // stray fill byte
    const marker = b[offset + 1];

    // Markers with no length field: SOI/EOI, restart markers, TEM, stuffed 0xFF00.
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || marker === 0x00 ||
        (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) {
      if (offset + 9 > b.length) return null; // truncated within our probe window
      return { height: readUint16BE(b, offset + 5), width: readUint16BE(b, offset + 7) };
    }

    if (marker === 0xda) return null; // Start of Scan — no SOF found before pixel data

    const segmentLength = readUint16BE(b, offset + 2); // includes these 2 length bytes
    offset += 2 + segmentLength;
  }
  return null;
}

// WebP: a RIFF/"WEBP" container, then one of three chunk layouts, each encoding
// dimensions differently. https://developers.google.com/speed/webp/docs/riff_container
function probeWebp(b) {
  if (b.length < 30) return null;

  switch (fourCC(b, 12)) {
    case 'VP8 ': // lossy: 14-bit width/height (+2-bit scale, ignored) at a fixed offset
      return { width: readUint16LE(b, 26) & 0x3fff, height: readUint16LE(b, 28) & 0x3fff };
    case 'VP8L': { // lossless: width-1/height-1 bit-packed into 4 little-endian bytes
      const bits = readUint32LE(b, 21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    case 'VP8X': // extended (alpha/animation/metadata): 24-bit width-1/height-1, little-endian
      return {
        width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
        height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
      };
    default:
      return null;
  }
}

function fourCC(b, offset) {
  return String.fromCharCode(b[offset], b[offset + 1], b[offset + 2], b[offset + 3]);
}
function readUint16BE(b, offset) { return (b[offset] << 8) | b[offset + 1]; }
function readUint16LE(b, offset) { return b[offset] | (b[offset + 1] << 8); }
function readUint32BE(b, offset) {
  return ((b[offset] << 24) | (b[offset + 1] << 16) | (b[offset + 2] << 8) | b[offset + 3]) >>> 0;
}
function readUint32LE(b, offset) {
  return (b[offset] | (b[offset + 1] << 8) | (b[offset + 2] << 16) | (b[offset + 3] << 24)) >>> 0;
}
