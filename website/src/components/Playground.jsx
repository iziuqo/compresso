'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
    if (source instanceof Blob) {
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
  const start = performance.now();
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
    blob, url: URL.createObjectURL(blob), width, height,
    originalWidth: img.naturalWidth, originalHeight: img.naturalHeight,
    originalSize: file.size, compressedSize: blob.size,
    savings: Math.round((1 - blob.size / file.size) * 1000) / 10,
    format, time: Math.round(performance.now() - start),
  };
}

const DEFAULT_QUALITY = 0.8;
const DEFAULT_FORMAT = 'auto';

export default function Playground({ t }) {
  const [file, setFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [format, setFormat] = useState(DEFAULT_FORMAT);
  const [maxWidth, setMaxWidth] = useState('');
  const [maxHeight, setMaxHeight] = useState('');
  const [maxSizeMB, setMaxSizeMB] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const inputRef = useRef(null);
  const sectionRef = useRef(null);
  const prevUrlRef = useRef(null);

  const getOpts = useCallback(() => ({
    quality, format,
    maxWidth: maxWidth ? parseInt(maxWidth) : undefined,
    maxHeight: maxHeight ? parseInt(maxHeight) : undefined,
    maxSizeMB: maxSizeMB ? parseFloat(maxSizeMB) : undefined,
  }), [quality, format, maxWidth, maxHeight, maxSizeMB]);

  const handleFile = useCallback(async (imageFile) => {
    if (!imageFile || !imageFile.type.startsWith('image/')) return;
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(imageFile);
    setOriginalUrl(URL.createObjectURL(imageFile));
    setResult(null);
    setInitialLoading(true);
    try {
      const r = await compressImage(imageFile, getOpts());
      setResult(r);
    } catch (err) { console.error(err); }
    setInitialLoading(false);
  }, [getOpts, originalUrl, result?.url]);

  useEffect(() => {
    if (!file) return;
    const timer = setTimeout(async () => {
      setReprocessing(true);
      try {
        const r = await compressImage(file, getOpts());
        prevUrlRef.current = result?.url;
        setResult(r);
        if (prevUrlRef.current) {
          setTimeout(() => URL.revokeObjectURL(prevUrlRef.current), 100);
        }
      } catch (err) { console.error(err); }
      setReprocessing(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [quality, format, maxWidth, maxHeight, maxSizeMB]);

  const resetParams = () => {
    setQuality(DEFAULT_QUALITY);
    setFormat(DEFAULT_FORMAT);
    setMaxWidth('');
    setMaxHeight('');
    setMaxSizeMB('');
  };

  const clearUpload = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setOriginalUrl(null);
    setResult(null);
    setQuality(DEFAULT_QUALITY);
    setFormat(DEFAULT_FORMAT);
    setMaxWidth('');
    setMaxHeight('');
    setMaxSizeMB('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const download = () => {
    if (!result) return;
    const ext = result.format === 'jpeg' ? 'jpg' : result.format;
    const baseName = file?.name ? file.name.replace(/\.[^.]+$/, '') : 'image';
    const a = document.createElement('a');
    a.href = result.url;
    a.download = `${baseName}-optimized.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const loadExample = async (name) => {
    try {
      const res = await fetch(`/samples/${name}`);
      const blob = await res.blob();
      const f = new File([blob], name, { type: blob.type });
      handleFile(f);
    } catch (err) { console.error(err); }
  };

  const examples = [
    { name: 'landscape.jpg', label: t.playground.exLandscape || 'Landscape (2.1 MB)' },
    { name: 'document.jpg', label: t.playground.exDocument || 'Document (150 KB)' },
    { name: 'portrait.jpg', label: t.playground.exPortrait || 'Portrait (100 KB)' },
  ];

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      sectionRef.current?.requestFullscreen?.() || sectionRef.current?.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement || !!document.webkitFullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => { document.removeEventListener('fullscreenchange', handler); document.removeEventListener('webkitfullscreenchange', handler); };
  }, []);

  return (
    <section
      id="playground"
      ref={sectionRef}
      className={`py-20 sm:py-28 bg-gray-50 ${isFullscreen ? '!py-6 overflow-auto' : ''}`}
    >
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isFullscreen ? 'max-w-full' : 'max-w-6xl'}`}>
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.playground.title}</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">{t.playground.subtitle}</p>
        </div>

        {!file ? (
          <>
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

          <div className="max-w-2xl mx-auto mt-6 text-center">
            <p className="text-sm text-gray-400 mb-3">{t.playground.examples || 'Or try an example:'}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {examples.map((ex) => (
                <button
                  key={ex.name}
                  onClick={() => loadExample(ex.name)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-brand-300 hover:text-brand-700 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
          </>
        ) : (
          <div className="space-y-8">
            <div className={`grid grid-cols-1 gap-8 ${isFullscreen ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {/* Controls */}
              <div className="lg:col-span-1 space-y-5 bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 h-fit">
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>{t.playground.quality}</span>
                    <span className="text-brand-600 font-bold tabular-nums">{Math.round(quality * 100)}%</span>
                  </label>
                  <input
                    type="range" min="0.05" max="1" step="0.05" value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full accent-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.playground.format}</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
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
                    <input type="number" placeholder={t.playground.unlimited} value={maxWidth} onChange={(e) => setMaxWidth(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.playground.maxHeight}</label>
                    <input type="number" placeholder={t.playground.unlimited} value={maxHeight} onChange={(e) => setMaxHeight(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.playground.maxSize} (MB)</label>
                  <input type="number" step="0.5" min="0.1" placeholder={t.playground.unlimited} value={maxSizeMB} onChange={(e) => setMaxSizeMB(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>

                <div className="space-y-2 pt-1">
                  <button onClick={download} disabled={!result || initialLoading} className="w-full gradient-bg text-white font-medium py-2.5 rounded-lg disabled:opacity-50 transition-opacity text-sm">
                    {t.playground.download}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={resetParams} className="py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">{t.playground.reset}</button>
                    <button onClick={clearUpload} className="py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">{t.playground.newImage || 'New image'}</button>
                  </div>
                  <button onClick={toggleFullscreen} className="w-full py-2 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5" aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                    {isFullscreen ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" /></svg>
                    )}
                    {isFullscreen ? (t.playground.exitFullscreen || 'Exit fullscreen') : (t.playground.fullscreen || 'Fullscreen')}
                  </button>
                </div>
              </div>

              {/* Preview — always mounted, never unmounted during reprocess */}
              <div className={`relative ${isFullscreen ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
                {initialLoading && !result && (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-600">{t.playground.processing}</span>
                    </div>
                  </div>
                )}

                {result && (
                  <div className="space-y-6">
                    {/* Reprocessing indicator — subtle overlay, no unmount */}
                    {reprocessing && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-2">
                        <div className="w-3 h-3 border-1.5 border-white border-t-transparent rounded-full animate-spin" />
                        {t.playground.processing}
                      </div>
                    )}

                    <BeforeAfter
                      originalUrl={originalUrl}
                      optimizedUrl={result.url}
                      originalLabel={t.playground.original}
                      optimizedLabel={t.playground.optimized}
                      dragLabel={t.playground.dragToCompare}
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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
    <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 text-center">
      <div className={`text-base sm:text-xl font-bold tabular-nums ${highlight ? 'text-brand-600' : 'text-gray-900'}`}>
        {value}
      </div>
      <div className="text-[0.65rem] sm:text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
