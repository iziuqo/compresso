'use client';

import { formatBytes } from '../../lib/compress';
import PreviewWorkspace from './PreviewWorkspace';
import EmbedMobileShell from './EmbedMobileShell';

export default function EmbedMobileLayout({ t, c, previewProps, fullscreen = false }) {
  return (
    <EmbedMobileShell
      t={t}
      fullscreen={fullscreen}
      stage={(
        <div className="demo-widget-preview">
          {!c.result && c.file ? (
            <div className="demo-widget-loading">
              <div className="pro-spinner" />
            </div>
          ) : (
            <>
              <PreviewWorkspace
                {...previewProps}
                fill={false}
                hideStats
                hideViewTabs
                mobile
              />
              <button
                type="button"
                onClick={c.clearUpload}
                className="demo-widget-clear"
                aria-label={t.playground.newImage || 'New image'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
      bar={c.result && (
        <div className="demo-widget-result">
          <p className="demo-widget-stats">
            <span>{formatBytes(c.result.originalSize)}</span>
            <span className="demo-widget-stats-arrow">→</span>
            <span className="demo-widget-stats-accent">{formatBytes(c.result.compressedSize)}</span>
            <span className="demo-widget-stats-badge">−{c.result.savings}%</span>
          </p>
          <button
            type="button"
            onClick={c.download}
            disabled={c.initialLoading}
            className="demo-widget-download"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" d="M12 4v10m0 0l3-3m-3 3l-3-3M4 18h16" />
            </svg>
            {t.playground.downloadShort || 'Save'}
          </button>
        </div>
      )}
    />
  );
}
