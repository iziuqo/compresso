'use client';

const FORMAT_LABELS = { webp: 'WebP', avif: 'AVIF', jpeg: 'JPEG', png: 'PNG' };

function formatLabel(format) {
  return FORMAT_LABELS[format] || (format ? format.toUpperCase() : '');
}

/**
 * Compact readout of what the "Auto" format actually resolved to — format,
 * dimensions, and quality — so the automatic choice isn't a black box. A "resized
 * from" note appears when Auto had to downscale (e.g. the JPEG fallback on Safari).
 * Only shown while Format is set to Auto and a result exists.
 */
export function AutoSummary({ result, quality, format }) {
  if (format !== 'auto' || !result) return null;
  const resized =
    result.width < result.originalWidth || result.height < result.originalHeight;
  return (
    <div className="pro-auto" aria-live="polite">
      <span className="pro-auto-arrow" aria-hidden="true">→</span>
      <b>{formatLabel(result.format)}</b>
      <span className="pro-auto-sep" aria-hidden="true">·</span>
      <span className="tabular-nums">{result.width}×{result.height}</span>
      <span className="pro-auto-sep" aria-hidden="true">·</span>
      <span className="tabular-nums">{Math.round(quality * 100)}%</span>
      {resized && (
        <span className="pro-auto-note">
          resized from {result.originalWidth}×{result.originalHeight}
        </span>
      )}
    </div>
  );
}

/**
 * Alerts when the optimized file is actually larger than the original. This can
 * only happen for lossless PNG output — every other format is capped at the
 * source size — so it offers a one-tap switch back to Auto, which always shrinks.
 */
export function OptimizedWarning({ result, format, onAuto }) {
  if (!result || result.savings >= 0) return null;
  return (
    <div className="pro-warn" role="alert">
      <svg
        className="pro-warn-icon"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
        />
      </svg>
      <span className="pro-warn-text">
        Optimized is <b>{-result.savings}% larger</b> than the original.
      </span>
      {format !== 'auto' && (
        <button type="button" className="pro-warn-btn" onClick={onAuto}>
          Switch to Auto
        </button>
      )}
    </div>
  );
}
