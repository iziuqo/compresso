/**
 * The committed test corpus (`test/fixtures/`, described by its manifest.json)
 * and generated large images, for every browser test. One loader, so no test
 * keeps its own copy of fetch-and-wrap.
 */
import manifest from '../../fixtures/manifest.json';

const urls = import.meta.glob('../../fixtures/*.{jpg,png,webp,avif,heic,gif,svg}', {
  query: '?url',
  import: 'default',
  eager: true,
});

/** Manifest entries by file name: type, bytes, displayed width and height, what it stresses. */
export const FIXTURES = Object.fromEntries(manifest.files.map((entry) => [entry.file, entry]));

/**
 * A fixture as a `File`, the way an upload arrives. `type: ''` mimics an
 * untyped upload (iPhone HEIC files often have none); `name` renames it.
 */
export function fixture(file, { type = FIXTURES[file].type, name = file } = {}) {
  return fileFrom(urls[`../../fixtures/${file}`], name, type);
}

/** Any served URL as a `File`, for corpora outside `test/fixtures/`. */
export async function fileFrom(url, name, type) {
  const response = await fetch(url);
  return new File([await response.arrayBuffer()], name, { type });
}

/**
 * A photo-like image of any size, drawn on the device so large cases (12, 24,
 * 48 MP, 800 x 20000) cost no repository bytes. Gradients plus seeded noise
 * blocks give encoders realistic work; the same seed draws the same picture.
 */
export async function generatedImage(width, height, { type = 'image/jpeg', quality = 0.9, seed = 1 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#2b5876');
  gradient.addColorStop(0.5, '#e0c3a0');
  gradient.addColorStop(1, '#4e4376');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  let state = seed;
  const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const block = Math.max(4, Math.round(Math.sqrt(width * height) / 200));
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `hsla(${random() * 360}, 60%, ${30 + random() * 40}%, 0.6)`;
    ctx.fillRect(random() * width, random() * height, block * (1 + random() * 4), block * (1 + random() * 4));
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  canvas.width = canvas.height = 0; // release the backing store before the test allocates more
  const extension = type.split('/')[1].replace('jpeg', 'jpg');
  return new File([blob], `generated-${width}x${height}.${extension}`, { type });
}
