'use client';

import { useEffect, useState } from 'react';
import { formatBytes } from '../../lib/compress';
import { useCompressor } from '../../hooks/useCompressor';
import ControlPanel from './ControlPanel';
import Dropzone from './Dropzone';
import PreviewWorkspace from './PreviewWorkspace';
import ToolWindow from './ToolWindow';
import ToolShell from './ToolShell';
import ToolMobileSheet from './ToolMobileSheet';
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
            <span className="text-brand font-semibold"> · −{result.savings}%</span>
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

function FullscreenIcon({ exit }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      {exit ? (
        <path strokeLinecap="round" d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
      ) : (
        <path strokeLinecap="round" d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
      )}
    </svg>
  );
}

function InspectorFooter({ t, c, onFullscreen, showFullscreen, isFullscreen }) {
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
      {showFullscreen && (
        <button type="button" onClick={onFullscreen} className="pro-btn-ghost">
          <FullscreenIcon exit={isFullscreen} />
          {isFullscreen ? (t.playground.exitFullscreen || 'Exit fullscreen') : (t.playground.fullscreen || 'Fullscreen')}
        </button>
      )}
    </div>
  );
}

export default function CompressorApp({
  t,
  variant = 'embed',
  locale,
  onLocaleChange,
  fullscreenTargetRef,
  isFullscreen = false,
}) {
  const c = useCompressor();
  const isTool = variant === 'tool';
  const showFullscreen = !!fullscreenTargetRef && !isTool;
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const toggleFullscreen = async () => {
    const el = fullscreenTargetRef?.current;
    if (!el) return;

    try {
      const active = document.fullscreenElement || document.webkitFullscreenElement;
      if (active) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
    } catch {
      /* user denied or unsupported */
    }
  };

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
    fill: isFullscreen || isTool,
  };

  const titleActions = isTool && locale && onLocaleChange
    ? <LocaleSelect locale={locale} onLocaleChange={onLocaleChange} />
    : showFullscreen ? (
      <button
        type="button"
        onClick={toggleFullscreen}
        className="pro-titlebar-btn"
        aria-label={isFullscreen ? t.playground.exitFullscreen : t.playground.fullscreen}
      >
        <FullscreenIcon exit={isFullscreen} />
      </button>
    ) : null;

  const fsFooterProps = {
    t,
    c,
    onFullscreen: toggleFullscreen,
    showFullscreen,
    isFullscreen,
  };

  if (isTool) {
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
      ? `${formatBytes(c.file.size)} → ${formatBytes(c.result.compressedSize)} · −${c.result.savings}%`
      : formatBytes(c.file.size);

    const mobilePreviewProps = { ...previewProps, hideViewTabs: true, hideStats: true };

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

          <div className="tool-mobile-layout lg:hidden">
            <div className="tool-mobile-preview">
              <PreviewWorkspace {...mobilePreviewProps} fill />
            </div>
            <ToolMobileSheet
              t={t}
              c={c}
              panelProps={panelProps}
              viewMode={c.viewMode}
              setViewMode={c.setViewMode}
              expanded={mobileExpanded}
              onToggleExpand={() => setMobileExpanded((v) => !v)}
            />
          </div>
        </div>
      </ToolShell>
    );
  }

  if (!c.file) {
    const emptyBody = (
      <ToolWindow title="Compresso" actions={titleActions} flush={isFullscreen || isTool} className={isFullscreen || isTool ? 'h-full min-h-0 flex-1' : ''}>
        <div className={isFullscreen || isTool ? 'pro-dropzone-shell flex-1 min-h-0' : 'flex items-center justify-center py-12 sm:py-16 px-6'}>
          <Dropzone {...dropzoneProps} />
        </div>
      </ToolWindow>
    );

    if (isFullscreen && !isTool) {
      return <div className="demo-app-root flex-1 min-h-0 h-full w-full">{emptyBody}</div>;
    }
    return emptyBody;
  }

  /* Embed — live demo */
  const layoutClass = isFullscreen
    ? 'pro-layout pro-layout-full pro-layout-fs'
    : 'pro-layout';

  const embed = (
    <ToolWindow title="Compresso" flush={isFullscreen} className={isFullscreen ? 'h-full min-h-0 flex-1' : ''}>
      <div className={`${layoutClass} animate-pro-layout-in`}>
        <aside className="pro-inspector animate-pro-inspector-in min-h-0 h-full">
          <div className="pro-inspector-scroll">
            <FileChip file={c.file} originalUrl={c.originalUrl} result={c.result} onClear={c.clearUpload} />
            <div className="mt-4">
              <ControlPanel {...panelProps} />
            </div>
          </div>
          <InspectorFooter {...fsFooterProps} />
        </aside>
        <div className="pro-preview-col">
          <PreviewWorkspace {...previewProps} fill={isFullscreen} />
        </div>
      </div>
    </ToolWindow>
  );

  if (isFullscreen) {
    return <div className="demo-app-root flex-1 min-h-0 h-full w-full">{embed}</div>;
  }
  return embed;
}
