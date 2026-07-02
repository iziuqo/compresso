'use client';

import { formatBytes } from '../../lib/compress';
import { getFormatOptions } from '../../lib/compress';
import ControlPanel from './ControlPanel';
import SegmentedControl from './SegmentedControl';
import { ViewTabs } from './PreviewWorkspace';

export default function ToolMobileSheet({
  t,
  c,
  panelProps,
  viewMode,
  setViewMode,
  expanded,
  onToggleExpand,
  showFullscreen = false,
  onFullscreen,
  isFullscreen = false,
  variant = 'tool',
}) {
  const formats = getFormatOptions().map((opt) => ({
    value: opt.value,
    label: opt.value === 'auto' ? 'Auto' : opt.label,
  }));

  const isEmbed = variant === 'embed';

  return (
    <div className={`tool-mobile-sheet ${isEmbed ? 'tool-mobile-sheet-embed' : ''} ${expanded ? 'is-expanded' : ''}`}>
      <button
        type="button"
        className="tool-mobile-sheet-handle"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse controls' : 'Expand controls'}
      >
        <span className="tool-mobile-sheet-grab" aria-hidden="true" />
      </button>

      {/* Collapsed: compact stats + download */}
      {!expanded && c.result && (
        <div className="tool-mobile-collapsed">
          <div className="tool-mobile-stats-compact">
            <span className="tool-mobile-stat-inline">
              <span className="tool-mobile-stat-val">{formatBytes(c.result.originalSize)}</span>
              <span className="tool-mobile-stat-arrow">→</span>
              <span className="tool-mobile-stat-val tool-mobile-stat-accent">−{c.result.savings}%</span>
              <span className="tool-mobile-stat-val tool-mobile-stat-accent">{formatBytes(c.result.compressedSize)}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={c.download}
            disabled={!c.result || c.initialLoading}
            className="tool-mobile-download"
          >
            {t.playground.download}
          </button>
        </div>
      )}

      {/* Expanded: full controls */}
      {expanded && (
        <div className="tool-mobile-expanded-body tool-mobile-expanded animate-pro-fade-in">
          {c.result && (
            <div className="tool-mobile-stats">
              <div className="tool-mobile-stat">
                <span className="tool-mobile-stat-val">{formatBytes(c.result.originalSize)}</span>
                <span className="tool-mobile-stat-label">{t.playground.original}</span>
              </div>
              <div className="tool-mobile-stat tool-mobile-stat-accent">
                <span className="tool-mobile-stat-val">−{c.result.savings}%</span>
                <span className="tool-mobile-stat-label">{t.playground.reduction}</span>
              </div>
              <div className="tool-mobile-stat tool-mobile-stat-accent">
                <span className="tool-mobile-stat-val">{formatBytes(c.result.compressedSize)}</span>
                <span className="tool-mobile-stat-label">{t.playground.optimized}</span>
              </div>
            </div>
          )}

          {c.result && setViewMode && (
            <div className="tool-mobile-quick">
              <ViewTabs viewMode={viewMode} setViewMode={setViewMode} t={t} />
            </div>
          )}

          <div className="tool-mobile-quick">
            <label className="tool-mobile-label">{t.playground.quality}</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={c.quality}
                onChange={(e) => c.setQuality(parseFloat(e.target.value))}
                className="range-apple flex-1"
              />
              <span className="tool-mobile-pill">{Math.round(c.quality * 100)}%</span>
            </div>
          </div>

          <div className="tool-mobile-quick mb-3">
            <label className="tool-mobile-label">{t.playground.format}</label>
            <SegmentedControl
              options={formats}
              value={c.format}
              onChange={c.setFormat}
              variant="dark"
            />
          </div>

          <ControlPanel {...panelProps} sections="dimensions" />

          <div className="tool-mobile-actions">
            <button
              type="button"
              onClick={c.download}
              disabled={!c.result || c.initialLoading}
              className="tool-mobile-download"
            >
              {t.playground.download}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={c.resetParams} className="tool-mobile-secondary">
                {t.playground.reset}
              </button>
              <button type="button" onClick={c.clearUpload} className="tool-mobile-secondary">
                {t.playground.newImage || 'New'}
              </button>
            </div>
            {showFullscreen && onFullscreen && (
              <button type="button" onClick={onFullscreen} className="tool-mobile-secondary w-full">
                {isFullscreen ? (t.playground.exitFullscreen || 'Exit fullscreen') : (t.playground.fullscreen || 'Fullscreen')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
