'use client';

import { useEffect, useState } from 'react';
import { formatBytes, formatSavings } from '../../lib/compress';
import { useCompressor } from '../../hooks/useCompressor';
import ControlPanel from './ControlPanel';
import Dropzone from './Dropzone';
import PreviewWorkspace from './PreviewWorkspace';
import ToolShell from './ToolShell';
import ProMobileLayout from './ProMobileLayout';
import { locales, getLocaleLabel } from '../../i18n';

function FileChip({ file, originalUrl, result, onClear }) {
  return (
    <div className="pro-file animate-pro-fade-up" style={{ animation: 'pro-fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
      <div className="pro-file-thumb">
        <img src={originalUrl} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ink truncate">{file.name}</p>
        <p className="text-[0.6875rem] text-ink-faint tabular-nums mt-0.5">
          {formatBytes(file.size)}
          {result && (
            <span className={`font-semibold ${result.savings < 0 ? 'text-ink-faint' : 'text-brand'}`}> · {formatSavings(result.savings)}</span>
          )}
        </p>
      </div>
      <button type="button" onClick={onClear} className="p-1 text-ink-faint hover:text-ink rounded-md transition-colors" aria-label="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

function LocaleSelect({ locale, onLocaleChange }) {
  return (
    <select
      value={locale}
      onChange={(e) => onLocaleChange(e.target.value)}
      className="tool-locale-select"
      aria-label="Language"
    >
      {locales.map((l) => <option key={l} value={l}>{getLocaleLabel(l)}</option>)}
    </select>
  );
}

function InspectorFooter({ t, c }) {
  return (
    <div className="pro-inspector-footer">
      <button
        type="button"
        onClick={c.download}
        disabled={!c.result || c.initialLoading}
        className="pro-btn-primary"
      >
        {t.playground.download}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={c.resetParams} className="pro-btn-secondary">
          {t.playground.reset}
        </button>
        <button type="button" onClick={c.clearUpload} className="pro-btn-secondary">
          {t.playground.newImage || 'New'}
        </button>
      </div>
    </div>
  );
}

export default function CompressorApp({ t, locale, onLocaleChange }) {
  const c = useCompressor();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  useEffect(() => {
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
      if (!item) return;
      const blob = item.getAsFile();
      if (blob) { e.preventDefault(); c.handleFile(blob); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [c.handleFile]);

  const dropzoneProps = {
    t,
    dragOver: c.dragOver,
    onDragOver: (e) => { e.preventDefault(); c.setDragOver(true); },
    onDragLeave: () => c.setDragOver(false),
    onDrop: c.handleDrop,
    onClick: () => c.inputRef.current?.click(),
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') c.inputRef.current?.click(); },
    inputRef: c.inputRef,
    onFileChange: (e) => { if (e.target.files[0]) c.handleFile(e.target.files[0]); },
    onExample: c.loadExample,
  };

  const panelProps = {
    t,
    quality: c.quality,
    setQuality: c.setQuality,
    format: c.format,
    setFormat: c.setFormat,
    maxWidth: c.maxWidth,
    setMaxWidth: c.setMaxWidth,
    maxHeight: c.maxHeight,
    setMaxHeight: c.setMaxHeight,
    maxSizeMB: c.maxSizeMB,
    setMaxSizeMB: c.setMaxSizeMB,
    result: c.result,
    onAuto: () => c.setFormat('auto'),
  };

  const previewProps = {
    t,
    viewMode: c.viewMode,
    setViewMode: c.setViewMode,
    originalUrl: c.originalUrl,
    optimizedUrl: c.result?.url,
    result: c.result,
    initialLoading: c.initialLoading,
    reprocessing: c.reprocessing,
    error: c.error,
    onClear: c.clearUpload,
    fill: true,
  };

  const headerActions = locale && onLocaleChange ? (
    <LocaleSelect locale={locale} onLocaleChange={onLocaleChange} />
  ) : null;

  if (!c.file) {
    return (
      <ToolShell title={t.playground.dropzone} actions={headerActions}>
        <div className="tool-empty">
          <Dropzone {...dropzoneProps} />
        </div>
      </ToolShell>
    );
  }

  const headerSubtitle = c.result
    ? `${formatBytes(c.file.size)} → ${formatBytes(c.result.compressedSize)} · ${formatSavings(c.result.savings)}`
    : formatBytes(c.file.size);

  const mobileSheetProps = {
    t,
    c,
    panelProps,
    viewMode: c.viewMode,
    setViewMode: c.setViewMode,
    expanded: mobileExpanded,
    onToggleExpand: () => setMobileExpanded((v) => !v),
  };

  return (
    <ToolShell title={c.file.name} subtitle={headerSubtitle} actions={headerActions}>
      <div className="tool-workspace">
        <aside className="tool-sidebar hidden lg:flex">
          <div className="tool-sidebar-scroll">
            <FileChip file={c.file} originalUrl={c.originalUrl} result={c.result} onClear={c.clearUpload} />
            <div className="mt-5">
              <ControlPanel {...panelProps} />
            </div>
          </div>
          <InspectorFooter t={t} c={c} />
        </aside>

        <div className="tool-preview-col hidden lg:flex">
          <PreviewWorkspace {...previewProps} fill />
        </div>

        <div className="lg:hidden flex-1 min-h-0 h-full">
          <ProMobileLayout previewProps={previewProps} {...mobileSheetProps} />
        </div>
      </div>
    </ToolShell>
  );
}
