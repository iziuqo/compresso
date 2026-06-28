'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export default function BeforeAfter({ originalUrl, optimizedUrl, originalLabel, optimizedLabel, dragLabel }) {
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

    const onMove = (e) => {
      e.preventDefault();
      updatePosition(e.clientX);
    };
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
      className="relative w-full rounded-2xl overflow-hidden bg-gray-100 select-none"
      style={{ aspectRatio: '16 / 10', cursor: 'ew-resize', touchAction: 'pan-y' }}
      onPointerDown={handlePointerDown}
      role="slider"
      aria-label={dragLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Optimized — full background */}
      <img
        src={optimizedUrl}
        alt={optimizedLabel}
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />

      {/* Original — clipped to left side */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={originalUrl}
          alt={originalLabel}
          className="absolute inset-0 h-full object-contain"
          style={{ width: containerWidth > 0 ? `${containerWidth}px` : '100%', maxWidth: 'none' }}
          draggable={false}
        />
      </div>

      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 pointer-events-none"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M6 10L2 10M14 10L18 10" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 6L2 10L6 14" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 6L18 10L14 14" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-lg backdrop-blur-sm z-10">
        {originalLabel}
      </div>
      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-lg backdrop-blur-sm z-10">
        {optimizedLabel}
      </div>
    </div>
  );
}
