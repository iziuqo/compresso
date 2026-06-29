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
  if (w > mw || h > mh) { const r = w / h; if (w > mw) { w = mw; h = Math.round(w / r); } if (h > mh) { h = mh; w = Math.round(h * r); } }
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
    for (let i = 0; i < 10; i++) { const mid = (lo + hi) / 2; blob = await toBlob(mid); if (blob.size <= maxBytes) lo = mid; else hi = mid; if (Math.abs(hi - lo) < 0.01) break; }
    if (blob.size > maxBytes) blob = await toBlob(0.1);
  }
  return { blob, url: URL.createObjectURL(blob), width: w, height: h, originalWidth: img.naturalWidth, originalHeight: img.naturalHeight, originalSize: file.size, compressedSize: blob.size, savings: Math.round((1 - blob.size / file.size) * 1000) / 10, format, time: Math.round(performance.now() - start) };
}

export default function ToolPage() {
  const [locale, setLocale] = useState(defaultLocale);
  const [file, setFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [quality, setQuality] = useState(0.8);
  const [format, setFormat] = useState('auto');
  const [maxWidth, setMaxWidth] = useState('');
  const [maxHeight, setMaxHeight] = useState('');
  const [maxSizeMB, setMaxSizeMB] = useState('');
  const [viewMode, setViewMode] = useState('compare');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef(null);
  const prevUrlRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('compresso-locale');
    if (saved && locales.includes(saved)) setLocale(saved);
    else { const b = navigator.language?.toLowerCase() || ''; if (b.startsWith('pt')) setLocale('pt-br'); else if (b.startsWith('es')) setLocale('es'); }
  }, []);

  const t = getTranslations(locale);

  const getOpts = useCallback(() => ({
    quality, format,
    maxWidth: maxWidth ? parseInt(maxWidth) : undefined,
    maxHeight: maxHeight ? parseInt(maxHeight) : undefined,
    maxSizeMB: maxSizeMB ? parseFloat(maxSizeMB) : undefined,
  }), [quality, format, maxWidth, maxHeight, maxSizeMB]);

  const [error, setError] = useState(null);

  const handleFile = useCallback(async (imageFile) => {
    if (!imageFile) return;
    const isImage = imageFile.type?.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i.test(imageFile.name);
    if (!isImage) return;
    setError(null);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(imageFile); setOriginalUrl(URL.createObjectURL(imageFile)); setResult(null); setInitialLoading(true);
    try { setResult(await compressImage(imageFile, getOpts())); } catch (err) { console.error(err); setError(err.message || 'Failed to process image'); }
    setInitialLoading(false);
  }, [getOpts, originalUrl, result?.url]);

  useEffect(() => {
    if (!file) return;
    const timer = setTimeout(async () => {
      try {
        const r = await compressImage(file, getOpts());
        prevUrlRef.current = result?.url;
        setResult(r);
        if (prevUrlRef.current) setTimeout(() => URL.revokeObjectURL(prevUrlRef.current), 100);
      } catch (err) { console.error(err); }
    }, 200);
    return () => clearTimeout(timer);
  }, [quality, format, maxWidth, maxHeight, maxSizeMB]);

  const download = () => {
    if (!result) return;
    const ext = result.format === 'jpeg' ? 'jpg' : result.format;
    const name = file?.name ? file.name.replace(/\.[^.]+$/, '') : 'image';
    const a = document.createElement('a'); a.href = result.url; a.download = `${name}-optimized.${ext}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const clearUpload = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null); setOriginalUrl(null); setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };

  /* ── Upload screen ── */
  if (!file) {
    return (
      <div className="h-[100dvh] bg-gray-50 flex flex-col">
        <ToolHeader locale={locale} setLocale={setLocale} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div
            className={`w-full max-w-lg border-2 border-dashed rounded-2xl p-10 sm:p-16 text-center cursor-pointer transition-colors ${dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400'}`}
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            role="button" tabIndex={0}
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
      </div>
    );
  }

  /* ── Tool interface ── */
  return (
    <div className="h-[100dvh] bg-gray-100 flex flex-col overflow-hidden">
      {/* ── Desktop: side panel layout ── */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 xl:w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          <ToolHeader locale={locale} setLocale={setLocale} />
          <div className="p-4 flex-1 flex flex-col">
            <FileInfo file={file} originalUrl={originalUrl} result={result} onClear={clearUpload} />
            <DesktopControls t={t} quality={quality} setQuality={setQuality} format={format} setFormat={setFormat} maxWidth={maxWidth} setMaxWidth={setMaxWidth} maxHeight={maxHeight} setMaxHeight={setMaxHeight} maxSizeMB={maxSizeMB} setMaxSizeMB={setMaxSizeMB} />
            {result && <DesktopStats t={t} result={result} />}
            <div className="mt-auto pt-4 space-y-2">
              <button onClick={download} disabled={!result || initialLoading} className="w-full gradient-bg text-white font-medium py-2.5 rounded-lg disabled:opacity-50 text-sm">{t.playground.download}</button>
              <button onClick={clearUpload} className="w-full py-2 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50">{t.playground.newImage || 'New image'}</button>
            </div>
          </div>
        </div>

        {/* Desktop preview */}
        <div className="flex-1 flex flex-col min-h-0">
          <ViewTabs viewMode={viewMode} setViewMode={setViewMode} t={t} />
          <PreviewArea viewMode={viewMode} setViewMode={setViewMode} initialLoading={initialLoading} result={result} error={error} originalUrl={originalUrl} optimizedUrl={result?.url} t={t} onClear={clearUpload} />
        </div>
      </div>

      {/* ── Mobile: stacked layout ── */}
      <div className="flex lg:hidden flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none" className="flex-shrink-0" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#22c55e" />
              <path d="M8 16C8 11.58 11.58 8 16 8V12C13.79 12 12 13.79 12 16H8Z" fill="white" />
              <path d="M16 8C20.42 8 24 11.58 24 16H20C20 13.79 18.21 12 16 12V8Z" fill="white" />
              <path d="M24 16C24 20.42 20.42 24 16 24V20C18.21 20 20 18.21 20 16H24Z" fill="white" />
              <path d="M16 24C11.58 24 8 20.42 8 16H12C12 18.21 13.79 20 16 20V24Z" fill="white" />
            </svg>
            <span className="text-xs font-medium text-gray-800 truncate">{file.name}</span>
            {result && <span className="text-[10px] text-brand-600 font-bold tabular-nums flex-shrink-0">{result.savings}%</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={clearUpload} className="p-1.5 text-gray-400 hover:text-gray-600" aria-label="New image">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Mobile preview — fills remaining space, tabs overlaid */}
        <PreviewArea viewMode={viewMode} setViewMode={setViewMode} initialLoading={initialLoading} result={result} error={error} originalUrl={originalUrl} optimizedUrl={result?.url} t={t} onClear={clearUpload} mobile />

        {/* Mobile bottom bar */}
        <div className="bg-white border-t border-gray-200 flex-shrink-0 safe-bottom">
          {/* Stats strip */}
          {result && (
            <div className="flex items-center justify-around px-3 py-1.5 border-b border-gray-100 text-[10px]">
              <span className="text-gray-400">{formatBytes(result.originalSize)}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              <span className="text-brand-600 font-bold">{formatBytes(result.compressedSize)}</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400">{result.width}×{result.height}</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400">{result.format.toUpperCase()}</span>
            </div>
          )}

          {/* Quality + format row */}
          <div className="px-3 pt-2 pb-1 flex items-center gap-3">
            <div className="flex-1">
              <input type="range" min="0.05" max="1" step="0.05" value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))} className="w-full accent-brand-500 h-1" />
            </div>
            <span className="text-xs font-bold text-brand-600 tabular-nums w-9 text-right">{Math.round(quality * 100)}%</span>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="bg-gray-100 border-0 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500">
              <option value="auto">Auto</option>
              <option value="webp">WebP</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              {isFormatSupported('avif') && <option value="avif">AVIF</option>}
            </select>
          </div>

          {/* Advanced toggle + actions */}
          <div className="px-3 pb-3 pt-1 flex items-center gap-2">
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-[10px] text-gray-400 hover:text-gray-600 px-1">
              {showAdvanced ? '▾' : '▸'} {t.playground.maxSize || 'More'}
            </button>
            <div className="flex-1" />
            <button onClick={download} disabled={!result || initialLoading} className="gradient-bg text-white text-xs font-medium px-5 py-2 rounded-lg disabled:opacity-50">
              {t.playground.download}
            </button>
          </div>

          {/* Advanced fields */}
          {showAdvanced && (
            <div className="px-3 pb-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-2">
              <div>
                <label className="block text-[9px] text-gray-400 mb-0.5">{t.playground.maxWidth}</label>
                <input type="number" placeholder="—" value={maxWidth} onChange={(e) => setMaxWidth(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-[9px] text-gray-400 mb-0.5">{t.playground.maxHeight}</label>
                <input type="number" placeholder="—" value={maxHeight} onChange={(e) => setMaxHeight(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-[9px] text-gray-400 mb-0.5">Max MB</label>
                <input type="number" step="0.5" min="0.1" placeholder="—" value={maxSizeMB} onChange={(e) => setMaxSizeMB(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Shared sub-components ── */

function ToolHeader({ locale, setLocale }) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#22c55e" />
          <path d="M8 16C8 11.58 11.58 8 16 8V12C13.79 12 12 13.79 12 16H8Z" fill="white" />
          <path d="M16 8C20.42 8 24 11.58 24 16H20C20 13.79 18.21 12 16 12V8Z" fill="white" />
          <path d="M24 16C24 20.42 20.42 24 16 24V20C18.21 20 20 18.21 20 16H24Z" fill="white" />
          <path d="M16 24C11.58 24 8 20.42 8 16H12C12 18.21 13.79 20 16 20V24Z" fill="white" />
        </svg>
        <span className="font-bold text-sm">Compresso</span>
      </div>
      <select value={locale} onChange={(e) => { setLocale(e.target.value); localStorage.setItem('compresso-locale', e.target.value); }} className="bg-gray-100 text-xs rounded-lg px-2 py-1.5 focus:outline-none" aria-label="Language">
        {locales.map((l) => <option key={l} value={l}>{getLocaleLabel(l)}</option>)}
      </select>
    </div>
  );
}

function FileInfo({ file, originalUrl, result, onClear }) {
  return (
    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
        <img src={originalUrl} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-800 truncate">{file.name}</p>
        <p className="text-[10px] text-gray-400">{formatBytes(file.size)}{result ? ` · ${result.originalWidth}×${result.originalHeight}` : ''}</p>
      </div>
      <button onClick={onClear} className="text-gray-300 hover:text-gray-500 p-1" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

function DesktopControls({ t, quality, setQuality, format, setFormat, maxWidth, setMaxWidth, maxHeight, setMaxHeight, maxSizeMB, setMaxSizeMB }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1.5">
          <span>{t.playground.quality}</span>
          <span className="text-brand-600 font-bold tabular-nums">{Math.round(quality * 100)}%</span>
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
  );
}

function DesktopStats({ t, result }) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label={t.playground.newSize} value={formatBytes(result.compressedSize)} accent />
        <MiniStat label={t.playground.reduction} value={`${result.savings}%`} accent />
        <MiniStat label={t.playground.dimensions} value={`${result.width}×${result.height}`} />
        <MiniStat label={t.playground.formatLabel || 'Format'} value={result.format.toUpperCase()} />
      </div>
      <p className="text-[10px] text-gray-400 text-center tabular-nums">{result.time}ms</p>
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <div className={`text-sm font-bold tabular-nums ${accent ? 'text-brand-600' : 'text-gray-800'}`}>{value}</div>
      <div className="text-[9px] text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

function ViewTabs({ viewMode, setViewMode, t, overlay }) {
  return (
    <div className={`flex items-center gap-0.5 flex-shrink-0 ${overlay ? 'absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-black/40 backdrop-blur-md rounded-lg p-0.5' : 'px-3 py-1.5 bg-white border-b border-gray-200'}`}>
      {['compare', 'original', 'optimized'].map((mode) => (
        <button key={mode} onClick={() => setViewMode(mode)} className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
          overlay
            ? viewMode === mode ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/90'
            : viewMode === mode ? 'bg-brand-50 text-brand-700' : 'text-gray-400 hover:text-gray-600'
        }`}>
          {mode === 'compare' ? (t.playground.dragToCompare || 'Compare') : mode === 'original' ? t.playground.original : t.playground.optimized}
        </button>
      ))}
    </div>
  );
}

function PreviewArea({ viewMode, setViewMode, initialLoading, result, error, originalUrl, optimizedUrl, t, mobile, onClear }) {
  return (
    <div className={`flex-1 min-h-0 overflow-hidden flex items-center justify-center relative ${mobile ? 'bg-gray-900' : 'bg-gray-100 p-2'}`}>
      {mobile && result && <ViewTabs viewMode={viewMode} setViewMode={setViewMode} t={t} overlay />}
      {error && !result ? (
        <div className="flex flex-col items-center justify-center text-center p-6">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <button onClick={onClear} className="text-xs text-gray-400 underline">{t.playground.newImage || 'Try another image'}</button>
        </div>
      ) : initialLoading && !result ? (
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">{t.playground.processing}</span>
        </div>
      ) : result ? (
        viewMode === 'compare' ? (
          <div className="w-full h-full">
            <BeforeAfter originalUrl={originalUrl} optimizedUrl={optimizedUrl} originalLabel={t.playground.original} optimizedLabel={t.playground.optimized} dragLabel={t.playground.dragToCompare} fill />
          </div>
        ) : (
          <img src={viewMode === 'original' ? originalUrl : optimizedUrl} alt={viewMode === 'original' ? t.playground.original : t.playground.optimized} className="max-w-full max-h-full object-contain" draggable={false} />
        )
      ) : null}
    </div>
  );
}
