'use client';

import { useState, useRef, useCallback } from 'react';
import BeforeAfter from './BeforeAfter';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    if (typeof source === 'string') {
      img.crossOrigin = 'anonymous';
      img.src = source;
    } else if (source instanceof Blob) {
      const url = URL.createObjectURL(source);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load')); };
      img.src = url;
    }
  });
}

function formatToMime(format) {
  const map = { jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };
  return map[format] || map.jpeg;
}

function calculateDimensions(w, h, maxW, maxH) {
  let width = w, height = h;
  if (width <= maxW && height <= maxH) return { width, height };
  const ratio = width / height;
  if (width > maxW) { width = maxW; height = Math.round(width / ratio); }
  if (height > maxH) { height = maxH; width = Math.round(height * ratio); }
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

function isFormatSupported(format) {
  try {
    const c = document.createElement('canvas');
    c.width = 1; c.height = 1;
    const mime = formatToMime(format);
    return c.toDataURL(mime).startsWith(`data:${mime}`);
  } catch { return false; }
}

function getBestFormat() {
  if (isFormatSupported('avif')) return 'avif';
  if (isFormatSupported('webp')) return 'webp';
  return 'jpeg';
}

async function compressImage(file, opts) {
  const img = await loadImage(file);
  const format = opts.format === 'auto' ? getBestFormat() : opts.format;
  const mime = formatToMime(format);
  const bgColor = mime === 'image/jpeg' ? '#ffffff' : null;

  const { width, height } = calculateDimensions(
    img.naturalWidth, img.naturalHeight,
    opts.maxWidth || Infinity, opts.maxHeight || Infinity
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
    let low = 0, high = quality;
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
    width, height,
    originalWidth: img.naturalWidth,
    originalHeight: img.naturalHeight,
    originalSize: file.size,
    compressedSize: blob.size,
    savings: Math.round((1 - blob.size / file.size) * 1000) / 10,
    format,
  };
}

export default function Playground({ t }) {
  const [file, setFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [quality, setQuality] = useState(0.8);
  const [format, setFormat] = useState('auto');
  const [maxWidth, setMaxWidth] = useState('');
  const [maxHeight, setMaxHeight] = useState('');
  const [maxSizeMB, setMaxSizeMB] = useState('');
  const inputRef = useRef(null);

  const processImage = useCallback(async (imageFile, opts) => {
    setProcessing(true);
    try {
      const r = await compressImage(imageFile, opts);
      setResult(r);
    } catch (err) {
      console.error('Compression failed:', err);
    }
    setProcessing(false);
  }, []);

  const handleFile = useCallback(async (imageFile) => {
    if (!imageFile || !imageFile.type.startsWith('image/')) return;
    setFile(imageFile);
    setOriginalUrl(URL.createObjectURL(imageFile));
    await processImage(imageFile, {
      quality, format,
      maxWidth: maxWidth ? parseInt(maxWidth) : undefined,
      maxHeight: maxHeight ? parseInt(maxHeight) : undefined,
      maxSizeMB: maxSizeMB ? parseFloat(maxSizeMB) : undefined,
    });
  }, [quality, format, maxWidth, maxHeight, maxSizeMB, processImage]);

  const reprocess = useCallback(async () => {
    if (!file) return;
    await processImage(file, {
      quality, format,
      maxWidth: maxWidth ? parseInt(maxWidth) : undefined,
      maxHeight: maxHeight ? parseInt(maxHeight) : undefined,
      maxSizeMB: maxSizeMB ? parseFloat(maxSizeMB) : undefined,
    });
  }, [file, quality, format, maxWidth, maxHeight, maxSizeMB, processImage]);

  const reset = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setOriginalUrl(null);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = `optimized.${result.format === 'jpeg' ? 'jpg' : result.format}`;
    a.click();
  };

  return (
    <section id="playground" className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.playground.title}</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">{t.playground.subtitle}</p>
        </div>

        {!file ? (
          <div
            className={`max-w-2xl mx-auto border-2 border-dashed rounded-2xl p-12 sm:p-16 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
            }`}
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
            aria-label={t.playground.dropzone}
          >
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium text-gray-700 mb-2">{t.playground.dropzone}</p>
            <p className="text-sm text-gray-500">{t.playground.dropzoneHint}</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Controls */}
              <div className="lg:col-span-1 space-y-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.playground.quality}: {Math.round(quality * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    onMouseUp={reprocess}
                    onTouchEnd={reprocess}
                    className="w-full accent-brand-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>10%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.playground.format}</label>
                  <select
                    value={format}
                    onChange={(e) => { setFormat(e.target.value); setTimeout(reprocess, 0); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="auto">{t.playground.auto}</option>
                    <option value="webp">WebP</option>
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    {isFormatSupported('avif') && <option value="avif">AVIF</option>}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.playground.maxWidth}</label>
                    <input
                      type="number"
                      placeholder={t.playground.unlimited}
                      value={maxWidth}
                      onChange={(e) => setMaxWidth(e.target.value)}
                      onBlur={reprocess}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.playground.maxHeight}</label>
                    <input
                      type="number"
                      placeholder={t.playground.unlimited}
                      value={maxHeight}
                      onChange={(e) => setMaxHeight(e.target.value)}
                      onBlur={reprocess}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.playground.maxSize} (MB)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    placeholder={t.playground.unlimited}
                    value={maxSizeMB}
                    onChange={(e) => setMaxSizeMB(e.target.value)}
                    onBlur={reprocess}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={download}
                    disabled={!result || processing}
                    className="flex-1 gradient-bg text-white font-medium py-2.5 rounded-lg disabled:opacity-50 transition-opacity text-sm"
                  >
                    {t.playground.download}
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {t.playground.reset}
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="lg:col-span-2">
                {processing && (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-600">{t.playground.processing}</span>
                    </div>
                  </div>
                )}

                {result && !processing && (
                  <div className="space-y-6">
                    <BeforeAfter
                      originalUrl={originalUrl}
                      optimizedUrl={result.url}
                      originalLabel={t.playground.original}
                      optimizedLabel={t.playground.optimized}
                      dragLabel={t.playground.dragToCompare}
                    />

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Stat label={t.playground.originalSize} value={formatBytes(result.originalSize)} />
                      <Stat label={t.playground.newSize} value={formatBytes(result.compressedSize)} highlight />
                      <Stat label={t.playground.reduction} value={`${result.savings}%`} highlight />
                      <Stat label={t.playground.dimensions} value={`${result.width} × ${result.height}`} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
      <div className={`text-lg sm:text-xl font-bold ${highlight ? 'text-brand-600' : 'text-gray-900'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
