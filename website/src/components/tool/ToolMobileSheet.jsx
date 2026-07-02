'use client';

import { formatBytes } from '../../lib/compress';
import { getFormatOptions } from '../../lib/compress';
import ControlPanel from './ControlPanel';
import { ViewTabs } from './PreviewWorkspace';
import SegmentedControl from './SegmentedControl';

export default function ToolMobileSheet({
  t,
  c,
  panelProps,
  viewMode,
  setViewMode,
  expanded,
  onToggleExpand,
}) {
  const formats = getFormatOptions().map((opt) => ({
    value: opt.value,
    label: opt.value === 'auto' ? 'Auto' : opt.label,
  }));

  return (
    <div className={`tool-mobile-sheet ${expanded ? 'is-expanded' : ''}`}>
      <button
        type="button"
        className="tool-mobile-sheet-handle"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse controls' : 'Expand controls'}
      >
        <span className="tool-mobile-sheet-grab" aria-hidden="true" />
      </button>

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

      {c.result && (
        <div className="mb-4">
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

      <div className="tool-mobile-quick mb-4">
        <label className="tool-mobile-label">{t.playground.format}</label>
        <SegmentedControl
          options={formats}
          value={c.format}
          onChange={c.setFormat}
          variant="dark"
        />
      </div>

      {expanded && (
        <div className="tool-mobile-expanded animate-pro-fade-in">
          <ControlPanel {...panelProps} sections="dimensions" />
        </div>
      )}

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
      </div>
    </div>
  );
}
