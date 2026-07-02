'use client';

import { useEffect, useState } from 'react';
import { getFormatOptions } from '../../lib/compress';
import SegmentedControl from './SegmentedControl';

function ProGroup({ label, children, delay = 0 }) {
  return (
    <div
      className="mb-4 last:mb-0"
      style={{ animation: `pro-fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both` }}
    >
      {label && <p className="pro-group-label">{label}</p>}
      <div className="pro-group">{children}</div>
    </div>
  );
}

function ProRow({ label, value, valuePop, children, last }) {
  return (
    <div className={`pro-row ${last ? 'pro-row-last' : ''}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="pro-row-label">{label}</span>
        {value != null && (
          <span className={`pro-value-pill ${valuePop ? 'animate-pro-value-pop' : ''}`}>{value}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function usePopOnChange(value) {
  const [pop, setPop] = useState(false);
  useEffect(() => {
    setPop(true);
    const t = setTimeout(() => setPop(false), 320);
    return () => clearTimeout(t);
  }, [value]);
  return pop;
}

export default function ControlPanel({
  t,
  quality,
  setQuality,
  format,
  setFormat,
  maxWidth,
  setMaxWidth,
  maxHeight,
  setMaxHeight,
  maxSizeMB,
  setMaxSizeMB,
  sections = 'all',
}) {
  const formats = getFormatOptions();
  const qualityPop = usePopOnChange(Math.round(quality * 100));

  const formatOptions = formats.map((opt) => ({
    value: opt.value,
    label: opt.value === 'auto' ? 'Auto' : opt.label,
  }));

  return (
    <div>
      {sections !== 'dimensions' && (
        <ProGroup label="Output" delay={80}>
          <ProRow label={t.playground.quality} value={`${Math.round(quality * 100)}%`} valuePop={qualityPop}>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="range-apple"
            />
          </ProRow>
          <ProRow label={t.playground.format} last>
            <SegmentedControl
              options={formatOptions}
              value={format}
              onChange={setFormat}
            />
          </ProRow>
        </ProGroup>
      )}

      {sections !== 'output' && (
      <ProGroup label="Dimensions" delay={140}>
        <div className="grid grid-cols-2 gap-px bg-black/[0.04]">
          <div className="pro-cell">
            <label className="pro-cell-label">{t.playground.maxWidth}</label>
            <input
              type="number"
              placeholder="∞"
              value={maxWidth}
              onChange={(e) => setMaxWidth(e.target.value)}
              className="pro-cell-input"
            />
          </div>
          <div className="pro-cell border-l border-black/[0.04]">
            <label className="pro-cell-label">{t.playground.maxHeight}</label>
            <input
              type="number"
              placeholder="∞"
              value={maxHeight}
              onChange={(e) => setMaxHeight(e.target.value)}
              className="pro-cell-input"
            />
          </div>
        </div>
        <ProRow label={`${t.playground.maxSize} (MB)`} last>
          <input
            type="number"
            step="0.5"
            min="0.1"
            placeholder="∞"
            value={maxSizeMB}
            onChange={(e) => setMaxSizeMB(e.target.value)}
            className="pro-cell-input w-full"
          />
        </ProRow>
      </ProGroup>
      )}
    </div>
  );
}
