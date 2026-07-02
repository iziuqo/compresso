'use client';

import { useEffect, useRef, useState } from 'react';
import { formatBytes } from '../../lib/compress';

export default function StatsBar({ t, result, layout = 'hud', reprocessing = false }) {
  const prevSizesRef = useRef({ compressed: null, savings: null });
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!result || reprocessing) return;
    const changed =
      prevSizesRef.current.compressed !== result.compressedSize ||
      prevSizesRef.current.savings !== result.savings;
    if (changed && prevSizesRef.current.compressed !== null) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 360);
      prevSizesRef.current = { compressed: result.compressedSize, savings: result.savings };
      return () => clearTimeout(timer);
    }
    prevSizesRef.current = { compressed: result.compressedSize, savings: result.savings };
  }, [result, reprocessing]);

  if (!result) return null;

  const items = [
    { label: t.playground.originalSize, value: formatBytes(result.originalSize), highlight: false },
    { label: t.playground.newSize, value: formatBytes(result.compressedSize), highlight: true, flash: true },
    { label: t.playground.reduction, value: `−${result.savings}%`, highlight: true, flash: true },
    { label: t.playground.dimensions, value: `${result.width}×${result.height}`, highlight: false },
  ];

  if (layout === 'compact') {
    return (
      <div className="flex items-center justify-around px-3 py-2 text-[10px] border-b border-line/60">
        <span className="text-ink-faint tabular-nums">{formatBytes(result.originalSize)}</span>
        <span className="text-ink-faint/50">→</span>
        <span className="text-brand font-semibold tabular-nums">{formatBytes(result.compressedSize)}</span>
        <span className="text-ink-faint/30">|</span>
        <span className="text-brand font-semibold tabular-nums">−{result.savings}%</span>
      </div>
    );
  }

  if (layout === 'strip') {
    return (
      <dl className="stat-strip">
        {items.map(({ label, value, highlight }) => (
          <div key={label} className="stat-strip-item">
            <dt className={`font-display text-base font-semibold tabular-nums tracking-tight ${highlight ? 'text-brand' : 'text-ink'}`}>
              {value}
            </dt>
            <dd className="text-[0.625rem] text-ink-faint mt-0.5 font-medium">{label}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div className="pro-hud animate-pro-hud-in" role="status">
      {items.map(({ label, value, highlight, flash: canFlash }, i) => (
        <div key={label} className={`pro-hud-item ${i > 0 ? 'pro-hud-divider' : ''}`}>
          <span className={`pro-hud-value tabular-nums ${highlight ? 'text-brand' : ''} ${flash && canFlash ? 'pro-hud-value-flash' : ''}`}>
            {value}
          </span>
          <span className="pro-hud-label">{label}</span>
        </div>
      ))}
      <div className="pro-hud-item pro-hud-divider">
        <span className="pro-hud-value tabular-nums text-ink-faint">{result.time}ms</span>
        <span className="pro-hud-label">Time</span>
      </div>
    </div>
  );
}
