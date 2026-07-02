'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export default function BeforeAfter({
  originalUrl,
  optimizedUrl,
  originalLabel,
  optimizedLabel,
  dragLabel,
  fill,
  dark = false,
}) {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const updatePosition = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    updatePosition(e.clientX);
  }, [updatePosition]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => { e.preventDefault(); updatePosition(e.clientX); };
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, updatePosition]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') setPosition((p) => Math.max(0, p - 2));
    else if (e.key === 'ArrowRight') setPosition((p) => Math.min(100, p + 2));
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none comparison-slider ${fill ? '' : 'aspect-[16/10]'}`}
      onPointerDown={handlePointerDown}
      role="slider"
      aria-label={dragLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <img
        src={optimizedUrl}
        alt={optimizedLabel}
        className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl"
        draggable={false}
      />

      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img
          src={originalUrl}
          alt={originalLabel}
          className="absolute inset-0 h-full object-contain drop-shadow-2xl"
          style={{ width: containerWidth > 0 ? `${containerWidth}px` : '100%', maxWidth: 'none' }}
          draggable={false}
        />
      </div>

      <div
        className={`absolute top-0 bottom-0 z-10 pointer-events-none comparison-divider ${dragging ? 'is-dragging' : ''}`}
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        <div className={`w-px h-full ${dragging ? 'bg-white' : 'bg-white/80'} shadow-[0_0_12px_rgba(0,0,0,0.5)]`} />
        <div
          className={`absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
            dragging
              ? 'scale-110 bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.25),0_4px_16px_rgba(0,0,0,0.4)]'
              : 'bg-white/95 shadow-[0_2px_12px_rgba(0,0,0,0.35)] ring-1 ring-black/10'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M7 10H3M13 10H17" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 7L3 10L7 13" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 7L17 10L13 13" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="absolute top-4 left-4 z-10 pro-badge animate-pro-badge-in">{originalLabel}</div>
      <div className="absolute top-4 right-4 z-10 pro-badge animate-pro-badge-in">{optimizedLabel}</div>
    </div>
  );
}
