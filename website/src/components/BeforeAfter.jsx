'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export default function BeforeAfter({ originalUrl, optimizedUrl, originalLabel, optimizedLabel, dragLabel }) {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
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
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (zoom > 1) {
      setPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
    e.preventDefault();
    setDragging(true);
    updatePosition(e.clientX);
  }, [updatePosition, zoom, pan]);

  useEffect(() => {
    if (!dragging && !panning) return;

    const handleMove = (e) => {
      e.preventDefault();
      if (panning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      } else {
        updatePosition(e.clientX || e.touches?.[0]?.clientX);
      }
    };
    const handleUp = () => { setDragging(false); setPanning(false); };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, panning, updatePosition, panStart]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => {
      const next = Math.max(1, Math.min(5, z + (e.deltaY > 0 ? -0.3 : 0.3)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(5, z + 0.5));
  const zoomOut = () => {
    setZoom((z) => {
      const next = Math.max(1, z - 0.5);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') setPosition((p) => Math.max(0, p - 2));
    else if (e.key === 'ArrowRight') setPosition((p) => Math.min(100, p + 2));
    else if (e.key === '+' || e.key === '=') zoomIn();
    else if (e.key === '-') zoomOut();
    else if (e.key === '0') resetView();
  };

  const transform = `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden bg-gray-100 select-none comparison-slider"
        style={{ aspectRatio: '16 / 10', cursor: zoom > 1 ? 'grab' : 'ew-resize' }}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        role="slider"
        aria-label={dragLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="absolute inset-0" style={{ transform, transformOrigin: 'center center' }}>
          {/* Optimized (right / full background) */}
          <img
            src={optimizedUrl}
            alt={optimizedLabel}
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />

          {/* Original (left / clipped) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${position}%` }}
          >
            <img
              src={originalUrl}
              alt={originalLabel}
              className="absolute inset-0 h-full object-contain"
              style={{ width: containerWidth ? `${containerWidth}px` : '100%', maxWidth: 'none' }}
              draggable={false}
            />
          </div>
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 pointer-events-none"
          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center pointer-events-none">
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

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-lg p-1">
        <button onClick={zoomOut} className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white rounded transition-colors" aria-label="Zoom out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
        </button>
        <span className="text-white/70 text-[10px] font-mono min-w-[32px] text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={zoomIn} className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white rounded transition-colors" aria-label="Zoom in">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        {zoom > 1 && (
          <button onClick={resetView} className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white rounded transition-colors" aria-label="Reset zoom">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}
