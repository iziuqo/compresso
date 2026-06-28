import { loadImage, canvasToBlob, formatToMime, generateFileName, getBestFormat } from './utils.js';
import { calculateDimensions, drawToCanvas } from './resize.js';

const DEFAULTS = {
  quality: 0.8,
  maxWidth: Infinity,
  maxHeight: Infinity,
  format: 'auto',
  maxSizeMB: Infinity,
  backgroundColor: '#ffffff',
  preserveAspectRatio: true,
  signal: null,
  onProgress: null,
};

export async function compress(source, options = {}) {
  const opts = { ...DEFAULTS, ...options };

  if (opts.signal?.aborted) {
    throw new DOMException('Compression aborted', 'AbortError');
  }

  const format = opts.format === 'auto' ? getBestFormat() : opts.format;
  const mimeType = formatToMime(format);
  const needsBackground = mimeType === 'image/jpeg' && !opts.backgroundColor;
  const bgColor = mimeType === 'image/jpeg' ? (opts.backgroundColor || '#ffffff') : null;

  report(opts, 0.1, 'loading');

  const img = await loadImage(source);
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  if (opts.signal?.aborted) {
    throw new DOMException('Compression aborted', 'AbortError');
  }

  report(opts, 0.3, 'resizing');

  const { width, height } = calculateDimensions(
    originalWidth,
    originalHeight,
    opts.maxWidth,
    opts.maxHeight
  );

  const canvas = drawToCanvas(img, width, height, bgColor);

  report(opts, 0.5, 'compressing');

  let blob;
  let quality = opts.quality;

  if (opts.maxSizeMB < Infinity) {
    blob = await compressToTargetSize(canvas, mimeType, quality, opts.maxSizeMB, opts);
  } else {
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  if (opts.signal?.aborted) {
    throw new DOMException('Compression aborted', 'AbortError');
  }

  report(opts, 1, 'done');

  const originalSize = getSourceSize(source);
  const fileName = generateFileName(source, format);
  const file = new File([blob], fileName, { type: mimeType });

  return {
    file,
    blob,
    url: URL.createObjectURL(blob),
    width,
    height,
    originalWidth,
    originalHeight,
    originalSize,
    compressedSize: blob.size,
    savings: originalSize > 0
      ? Math.round((1 - blob.size / originalSize) * 1000) / 10
      : 0,
    format,
    mimeType,
  };
}

async function compressToTargetSize(canvas, mimeType, initialQuality, maxSizeMB, opts) {
  const maxBytes = maxSizeMB * 1024 * 1024;

  let blob = await canvasToBlob(canvas, mimeType, initialQuality);
  if (blob.size <= maxBytes) return blob;

  let low = 0;
  let high = initialQuality;
  let bestBlob = blob;
  const maxIterations = 10;

  for (let i = 0; i < maxIterations; i++) {
    if (opts.signal?.aborted) {
      throw new DOMException('Compression aborted', 'AbortError');
    }

    const mid = (low + high) / 2;
    blob = await canvasToBlob(canvas, mimeType, mid);

    if (blob.size <= maxBytes) {
      bestBlob = blob;
      low = mid;
    } else {
      high = mid;
    }

    if (Math.abs(high - low) < 0.01) break;

    report(opts, 0.5 + (i / maxIterations) * 0.4, 'compressing');
  }

  if (bestBlob.size > maxBytes) {
    bestBlob = await canvasToBlob(canvas, mimeType, 0.1);
  }

  return bestBlob;
}

function getSourceSize(source) {
  if (source instanceof File) return source.size;
  if (source instanceof Blob) return source.size;
  return 0;
}

function report(opts, progress, stage) {
  if (opts.onProgress) {
    opts.onProgress({ progress, stage });
  }
}
