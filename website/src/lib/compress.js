export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatToMime(format) {
  const map = { jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };
  return map[format] || map.jpeg;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (source instanceof Blob) {
      const url = URL.createObjectURL(source);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
      img.src = url;
    } else {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = source;
    }
  });
}

function calculateDimensions(w, h, maxW, maxH) {
  let width = w;
  let height = h;
  if (width <= maxW && height <= maxH) return { width, height };
  const ratio = width / height;
  if (width > maxW) { width = maxW; height = Math.round(width / ratio); }
  if (height > maxH) { height = maxH; width = Math.round(height * ratio); }
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

export function isFormatSupported(format) {
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const mime = formatToMime(format);
    return c.toDataURL(mime).startsWith(`data:${mime}`);
  } catch {
    return false;
  }
}

export function getBestFormat() {
  if (isFormatSupported('avif')) return 'avif';
  if (isFormatSupported('webp')) return 'webp';
  return 'jpeg';
}

export const DEFAULT_QUALITY = 0.8;
export const DEFAULT_FORMAT = 'auto';

export function getFormatOptions() {
  const options = [
    { value: 'auto', label: 'Auto' },
    { value: 'webp', label: 'WebP' },
    { value: 'jpeg', label: 'JPEG' },
    { value: 'png', label: 'PNG' },
  ];
  if (isFormatSupported('avif')) options.push({ value: 'avif', label: 'AVIF' });
  return options;
}

export async function compressImage(file, opts) {
  const start = performance.now();
  const img = await loadImage(file);
  const format = opts.format === 'auto' ? getBestFormat() : opts.format;
  const mime = formatToMime(format);
  const bgColor = mime === 'image/jpeg' ? '#ffffff' : null;

  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth || Infinity,
    opts.maxHeight || Infinity,
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (bgColor) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, width, height); }
  ctx.drawImage(img, 0, 0, width, height);

  let quality = opts.quality;
  const maxBytes = (opts.maxSizeMB || Infinity) * 1024 * 1024;
  const toBlob = (q) => new Promise((res) => canvas.toBlob((b) => res(b), mime, q));

  let blob = await toBlob(quality);

  if (blob.size > maxBytes) {
    let low = 0;
    let high = quality;
    for (let i = 0; i < 10; i++) {
      const mid = (low + high) / 2;
      blob = await toBlob(mid);
      if (blob.size <= maxBytes) low = mid;
      else high = mid;
      if (Math.abs(high - low) < 0.01) break;
    }
    if (blob.size > maxBytes) blob = await toBlob(0.1);
  }

  return {
    blob,
    url: URL.createObjectURL(blob),
    width,
    height,
    originalWidth: img.naturalWidth,
    originalHeight: img.naturalHeight,
    originalSize: file.size,
    compressedSize: blob.size,
    savings: Math.round((1 - blob.size / file.size) * 1000) / 10,
    format,
    time: Math.round(performance.now() - start),
  };
}

export function isImageFile(file) {
  if (!file) return false;
  return file.type?.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i.test(file.name);
}
