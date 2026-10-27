import type { EncodeFormat, Engine, Prepared, Written } from './types';

/**
 * Canvas backend, used by the web build (design reviews, screenshots, and the
 * same tests the phones run). It mirrors compresso.js's platform.js; once
 * compresso.js 1.1 exposes its adapter, this file becomes an import.
 */

type Entry = { canvas: HTMLCanvasElement; source: Blob; last?: { key: string; blob: Blob } };
const store = new Map<string, Entry>();

const MIME: Record<EncodeFormat, string> = {
  jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic',
};

function canEncode(mime: string): boolean {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  return c.toDataURL(mime).startsWith(`data:${mime}`);
}

let writable: EncodeFormat[] | null = null;

function toBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encode failed'))), mime, quality));
}

async function sourceBlob(source: { uri: string; file?: Blob }): Promise<Blob> {
  return source.file ?? (await fetch(source.uri)).blob();
}

export const engine: Engine = {
  formats() {
    writable ??= (['webp', 'jpeg', 'png'] as EncodeFormat[]).filter((f) => f !== 'webp' || canEncode(MIME.webp));
    return writable;
  },

  async prepare(source, { maxLongEdge, maxInputPixels }) {
    const blob = await sourceBlob(source);
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    if (maxInputPixels && bitmap.width * bitmap.height > maxInputPixels) {
      bitmap.close();
      throw new Error('Image exceeds the maximum decodable size');
    }
    const longEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, (maxLongEdge ?? longEdge) / longEdge);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const prepared: Prepared = {
      handle: crypto.randomUUID(),
      width: canvas.width,
      height: canvas.height,
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
      originalSize: blob.size,
      sourceFormat: blob.type.replace('image/', '') || 'image',
    };
    bitmap.close();
    store.set(prepared.handle, { canvas, source: blob });
    return prepared;
  },

  async encode(handle, { format, quality }) {
    return (await encodeBlob(handle, format, quality)).size;
  },

  async write(handle, { format, quality, name }) {
    const entry = get(handle);
    const blob = await encodeBlob(handle, format, quality);
    return written(blob, `${name}.${format === 'jpeg' ? 'jpg' : format}`, entry.canvas.width, entry.canvas.height, format);
  },

  async copyOriginal(handle, name) {
    const entry = get(handle);
    const format = (entry.source.type.replace('image/', '') || 'jpeg') as EncodeFormat;
    return written(entry.source, name, entry.canvas.width, entry.canvas.height, format);
  },

  release(handle) {
    const entry = store.get(handle);
    if (entry) entry.canvas.width = entry.canvas.height = 0;
    store.delete(handle);
  },
};

function get(handle: string): Entry {
  const entry = store.get(handle);
  if (!entry) throw new Error('This image was already released');
  return entry;
}

async function encodeBlob(handle: string, format: EncodeFormat, quality: number): Promise<Blob> {
  const entry = get(handle);
  const key = `${format}|${quality}`;
  if (entry.last?.key === key) return entry.last.blob;
  let canvas = entry.canvas;
  if (format === 'jpeg') {
    // No alpha in JPEG: composite onto white, as compresso.js does.
    canvas = document.createElement('canvas');
    canvas.width = entry.canvas.width;
    canvas.height = entry.canvas.height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(entry.canvas, 0, 0);
  }
  const blob = await toBlob(canvas, MIME[format], format === 'png' ? undefined : quality);
  entry.last = { key, blob };
  return blob;
}

function written(blob: Blob, name: string, width: number, height: number, format: EncodeFormat): Written {
  const uri = URL.createObjectURL(blob instanceof File ? blob : new File([blob], name, { type: blob.type }));
  return { uri, size: blob.size, width, height, format };
}

export const concurrency = 1;
