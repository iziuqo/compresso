import { compress, decodeHeic, formatBytes, isFormatSupported, isHeicSource } from 'compresso.js';

// The website is a thin UI layer over the published library — all decode/resize/
// encode logic (including HEIC input) lives in `compresso.js`, not here.

export { formatBytes };

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
  const result = await compress(file, opts);
  return { ...result, time: Math.round(performance.now() - start) };
}

/**
 * A browser-displayable object URL for the ORIGINAL file. Most browsers can't
 * render HEIC, so it's decoded for the preview; Safari/iOS, which can, use it as-is.
 */
export async function toPreviewUrl(file) {
  const url = URL.createObjectURL(file);
  if (!isHeicSource(file)) return url;
  const displayable = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
  if (displayable) return url;
  URL.revokeObjectURL(url);
  return URL.createObjectURL(await decodeHeic(file));
}

export function isImageFile(file) {
  if (!file) return false;
  return file.type?.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i.test(file.name);
}
