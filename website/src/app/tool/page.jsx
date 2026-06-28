'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getTranslations, locales, defaultLocale, getLocaleLabel } from '../../i18n';
import BeforeAfter from '../../components/BeforeAfter';

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
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed')); };
      img.src = url;
    }
  });
}

function formatToMime(f) {
  return { jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }[f] || 'image/jpeg';
}

function isFormatSupported(format) {
  try { const c = document.createElement('canvas'); c.width=1; c.height=1; const m=formatToMime(format); return c.toDataURL(m).startsWith(`data:${m}`); } catch { return false; }
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
  const bg = mime === 'image/jpeg' ? '#ffffff' : null;

  let w = img.naturalWidth, h = img.naturalHeight;
  const mw = opts.maxWidth || Infinity, mh = opts.maxHeight || Infinity;
  if (w > mw || h > mh) {
    const r = w / h;
    if (w > mw) { w = mw; h = Math.round(w / r); }
    if (h > mh) { h = mh; w = Math.round(h * r); }
  }
  w = Math.max(1, w); h = Math.max(1, h);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(img, 0, 0, w, h);

  const toBlob = (q) => new Promise((res) => canvas.toBlob((b) => res(b), mime, q));
  let blob = await toBlob(opts.quality);
  const maxBytes = (opts.maxSizeMB || Infinity) * 1024 * 1024;

  if (blob.size > maxBytes) {
    let lo = 0, hi = opts.quality;
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      blob = await toBlob(mid);
      if (blob.size <= maxBytes) lo = mid; else hi = mid;
      if (Math.abs(hi - lo) < 0.01) break;
    }
    if (blob.size > maxBytes) blob = await toBlob(0.1);
  }

  return {
    blob, url: URL.createObjectURL(blob), width: w, height: h,
    originalWidth: img.naturalWidth, originalHeight: img.naturalHeight,
    originalSize: file.size, compressedSize: blob.size,
    savings: Math.round((1 - blob.size / file.size) * 1000) / 10,
    format, time: Math.round(performance.now() - start),
  };
}

export default function ToolPage() {
  const [locale, setLocale] = useState(defaultLocale);
  const [mounted, setMounted] = useState(false);
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
  const [viewMode, setViewMode] = useState('compare');
  const inputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('compresso-locale');
    if (saved && locales.includes(saved)) setLocale(saved);
    else {
      const b = navigator.language?.toLowerCase() || '';
      if (b.startsWith('pt')) setLocale('pt-br');
      else if (b.startsWith('es')) setLocale('es');
    }
    setMounted(true);
  }, []);

  const t = getTranslations(locale);

  const getOpts = useCallback(() => ({
    quality, format,
    maxWidth: maxWidth ? parseInt(maxWidth) : undefined,
    maxHeight: maxHeight ? parseInt(maxHeight) : undefined,
    maxSizeMB: maxSizeMB ? parseFloat(maxSizeMB) : undefined,
  }), [quality, format, maxWidth, maxHeight, maxSizeMB]);

  const processImage = useCallback(async (imageFile, opts) => {
    setProcessing(true);
    try {
      if (result?.url) URL.revokeObjectURL(result.url);
      setResult(await compressImage(imageFile, opts));
    } catch (err) { console.error(err); }
    setProcessing(false);
  }, [result?.url]);

  const handleFile = useCallback(async (imageFile) => {
    if (!imageFile?.type?.startsWith('image/')) return;
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(imageFile);
    setOriginalUrl(URL.createObjectURL(imageFile));
    setResult(null);
    await processImage(imageFile, getOpts());
  }, [getOpts, processImage, originalUrl, result?.url]);

  useEffect(() => {
    if (!file) return;
    const timer = setTimeout(() => processImage(file, getOpts()), 200);
    return () => clearTimeout(timer);
  }, [quality, format, maxWidth, maxHeight, maxSizeMB]);

  const download = () => {
    if (!result) return;
    const ext = result.format === 'jpeg' ? 'jpg' : result.format;
    const name = file?.name ? file.name.replace(/\.[^.]+$/, '') : 'image';
    const a = document.createElement('a');
    a.href = result.url;
    a.download = `${name}-optimized.${ext}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const clearUpload = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null); setOriginalUrl(null); setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };

  if (!mounted) return null;

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* Compact header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#22c55e" />
            <path d="M8 16C8 11.58 11.58 8 16 8V12C13.79 12 12 13.79 12 16H8Z" fill="white" opacity="0.7" />
            <path d="M16 8C20.42 8 24 11.58 24 16H20C20 13.79 18.21 12 16 12V8Z" fill="white" />
            <path d="M24 16C24 20.42 20.42 24 16 24V20C18.21 20 20 18.21 20 16H24Z" fill="white" opacity="0.7" />
            <path d="M16 24C11.58 24 8 20.42 8 16H12C12 18.21 13.79 20 16 20V24Z" fill="white" />
          </svg>
          <span className="font-bold text-sm">Compresso</span>
        </div>
        <select
          value={locale}
          onChange={(e) => { setLocale(e.target.value); localStorage.setItem('compresso-locale', e.target.value); }}
          className="bg-gray-100 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
          aria-label="Language"
        >
          {locales.map((l) => <option key={l} value={l}>{getLocaleLabel(l)}</option>)}
        </select>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-auto">
        {!file ? (
          /* Upload screen */
          <div className="flex-1 flex items-center justify-center p-6">
            <div
              className={`w-full max-w-lg border-2 border-dashed rounded-2xl p-10 sm:p-16 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400'
              }`}
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
            >
              <svg className="w-14 h-14 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-base font-medium text-gray-700 mb-1">{t.playground.dropzone}</p>
              <p className="text-xs text-gray-400">{t.playground.dropzoneHint}</p>
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
            </div>
          </div>
        ) : (
          /* Tool interface */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Controls sidebar */}
            <div className="lg:w-72 xl:w-80 flex-shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-4 overflow-y-auto">
              {/* File info */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img src={originalUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-[10px] text-gray-400">{formatBytes(file.size)} · {result ? `${result.originalWidth}×${result.originalHeight}` : '...'}</p>
                </div>
                <button onClick={clearUpload} className="text-gray-300 hover:text-gray-500 p-1" aria-label="Close">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1.5">
                    <span>{t.playground.quality}</span>
                    <span className="text-brand-600 font-bold">{Math.round(quality * 100)}%</span>
                  </label>
                  <input type="range" min="0.05" max="1" step="0.05" value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))} className="w-full accent-brand-500 h-1.5" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{t.playground.format}</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="auto">{t.playground.auto}</option>
                    <option value="webp">WebP</option>
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    {isFormatSupported('avif') && <option value="avif">AVIF</option>}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{t.playground.maxWidth}</label>
                    <input type="number" placeholder="—" value={maxWidth} onChange={(e) => setMaxWidth(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{t.playground.maxHeight}</label>
                    <input type="number" placeholder="—" value={maxHeight} onChange={(e) => setMaxHeight(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{t.playground.maxSize} (MB)</label>
                  <input type="number" step="0.5" min="0.1" placeholder="—" value={maxSizeMB} onChange={(e) => setMaxSizeMB(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {/* Results */}
              {result && !processing && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat label={t.playground.newSize} value={formatBytes(result.compressedSize)} accent />
                    <MiniStat label={t.playground.reduction} value={`${result.savings}%`} accent />
                    <MiniStat label={t.playground.dimensions} value={`${result.width}×${result.height}`} />
                    <MiniStat label={t.playground.formatLabel || 'Format'} value={result.format.toUpperCase()} />
                  </div>
                  <p className="text-[10px] text-gray-400 text-center">{result.time}ms</p>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <button onClick={download} disabled={!result || processing} className="w-full gradient-bg text-white font-medium py-2.5 rounded-lg disabled:opacity-50 text-sm">
                  {t.playground.download}
                </button>
                <button onClick={clearUpload} className="w-full py-2 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50">
                  {t.playground.newImage || 'New image'}
                </button>
              </div>
            </div>

            {/* Preview area */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-100">
              {/* View mode tabs */}
              <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0">
                {['compare', 'original', 'optimized'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === mode ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {mode === 'compare' ? (t.playground.dragToCompare || 'Compare') :
                     mode === 'original' ? t.playground.original :
                     t.playground.optimized}
                  </button>
                ))}
              </div>

              {/* Image display */}
              <div className="flex-1 overflow-auto p-3 sm:p-4">
                {processing ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-gray-500">{t.playground.processing}</span>
                    </div>
                  </div>
                ) : result ? (
                  viewMode === 'compare' ? (
                    <BeforeAfter
                      originalUrl={originalUrl}
                      optimizedUrl={result.url}
                      originalLabel={t.playground.original}
                      optimizedLabel={t.playground.optimized}
                      dragLabel={t.playground.dragToCompare}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <img
                        src={viewMode === 'original' ? originalUrl : result.url}
                        alt={viewMode === 'original' ? t.playground.original : t.playground.optimized}
                        className="max-w-full max-h-full object-contain rounded-lg"
                        draggable={false}
                      />
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <div className={`text-sm font-bold ${accent ? 'text-brand-600' : 'text-gray-800'}`}>{value}</div>
      <div className="text-[9px] text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}
