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
  if (file.type) {
    return EXTENSIONS[file.type] || null;
  }
  if (file.name) {
    const ext = file.name.split('.').pop().toLowerCase();
    return MIME_TYPES[ext] ? ext : null;
  }
  return null;
}

export function generateFileName(source, format) {
  const ext = mimeToExtension(formatToMime(format));
  let baseName = 'image';

  if (source && source.name) {
    baseName = source.name.replace(/\.[^.]+$/, '');
  }

  return `${baseName}.${ext}`;
}

export function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Failed to encode image as ${mimeType}`));
      },
      mimeType,
      quality
    );
  });
}

export function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    if (typeof source === 'string') {
      img.crossOrigin = 'anonymous';
      img.src = source;
    } else if (source instanceof Blob) {
      const url = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image from Blob'));
      };
      img.src = url;
    } else {
      reject(new Error('Invalid source: expected File, Blob, or URL string'));
    }
  });
}

export function isFormatSupported(format) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL(formatToMime(format));
    return dataUrl.startsWith(`data:${formatToMime(format)}`);
  } catch {
    return false;
  }
}

export function getBestFormat() {
  if (isFormatSupported('avif')) return 'avif';
  if (isFormatSupported('webp')) return 'webp';
  return 'jpeg';
}
