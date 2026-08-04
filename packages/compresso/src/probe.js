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
  const head = new Uint8Array(await blob.slice(0, MAX_PROBE_BYTES).arrayBuffer());
  return probePng(head) ?? probeJpeg(head) ?? probeWebp(head) ?? null;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// PNG: an 8-byte signature, then the IHDR chunk's width/height at a fixed
// offset (big-endian uint32 each). https://www.w3.org/TR/png/#11IHDR
function probePng(b) {
  if (b.length < 24) return null;
  for (let i = 0; i < PNG_SIGNATURE.length; i++) if (b[i] !== PNG_SIGNATURE[i]) return null;
  if (fourCC(b, 12) !== 'IHDR') return null;
  return { width: readUint32BE(b, 16), height: readUint32BE(b, 20) };
}

// JPEG: walk marker segments from the SOI (0xFFD8) looking for a Start-Of-Frame
// marker (0xFFC0-0xFFCF, excluding the non-frame markers 0xC4/0xC8/0xCC), whose
// payload starts with 1 byte precision, then height/width as big-endian uint16.
function probeJpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;

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
  if (fourCC(b, 0) !== 'RIFF' || fourCC(b, 8) !== 'WEBP') return null;

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
