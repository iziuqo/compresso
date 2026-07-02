'use client';

import BeforeAfter from '../BeforeAfter';
import StatsBar from './StatsBar';
import SegmentedControl from './SegmentedControl';

export function ViewTabs({ viewMode, setViewMode, t, variant = 'dark' }) {
  const modes = [
    { id: 'compare', label: 'Compare' },
    { id: 'original', label: t.playground.original },
    { id: 'optimized', label: t.playground.optimized },
  ];

  return (
    <div className="animate-pro-toolbar-in" role="presentation">
      <SegmentedControl
        variant={variant}
        options={modes.map((m) => ({ value: m.id, label: m.label }))}
        value={viewMode}
        onChange={setViewMode}
        className={variant === 'dark' ? 'pro-toolbar' : 'pro-segmented'}
      />
    </div>
  );
}

export default function PreviewWorkspace({
  t,
  viewMode,
  setViewMode,
  originalUrl,
  optimizedUrl,
  result,
  initialLoading,
  reprocessing,
  error,
  onClear,
  fill = false,
  hideViewTabs = false,
  hideStats = false,
  mobile = false,
}) {
  return (
    <div className={`pro-stage flex flex-col animate-pro-stage-in ${fill ? 'h-full min-h-0' : mobile ? 'h-full' : 'min-h-[320px] sm:min-h-[440px] lg:min-h-[520px]'}`}>
      {result && !hideViewTabs && !mobile && (
        <div className="absolute top-3 sm:top-5 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md px-1">
          <ViewTabs viewMode={viewMode} setViewMode={setViewMode} t={t} />
        </div>
      )}

      <div className={`pro-canvas flex-1 relative min-h-0 ${fill ? 'pro-canvas-fill' : ''} ${mobile ? 'pro-canvas-mobile' : ''} ${reprocessing ? 'pro-canvas-busy' : ''}`}>
        {error && !result ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 animate-pro-fade-in">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button type="button" onClick={onClear} className="pro-link-btn">
              {t.playground.newImage || 'Try another image'}
            </button>
          </div>
        ) : initialLoading && !result ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 animate-pro-fade-in">
            <div className="pro-spinner" />
            <span className="text-sm text-white/50 font-medium">{t.playground.processing}</span>
          </div>
        ) : result ? (
          <>
            <div key={viewMode} className="pro-image-frame animate-pro-view-in w-full h-full flex-1 min-h-0">
              {viewMode === 'compare' ? (
                <BeforeAfter
                  originalUrl={originalUrl}
                  optimizedUrl={optimizedUrl}
                  originalLabel={t.playground.original}
                  optimizedLabel={t.playground.optimized}
                  dragLabel={t.playground.dragToCompare}
                  fill
                  dark
                  hideLabels={mobile}
                />
              ) : (
                <img
                  src={viewMode === 'original' ? originalUrl : optimizedUrl}
                  alt={viewMode === 'original' ? t.playground.original : t.playground.optimized}
                  className="max-w-full max-h-full object-contain drop-shadow-2xl"
                  draggable={false}
                />
              )}
            </div>
            {!hideStats && (
              <StatsBar t={t} result={result} layout="hud" reprocessing={reprocessing} />
            )}
          </>
        ) : null}

        {reprocessing && result && (
          <div className="absolute top-5 right-5 z-30 flex items-center gap-2 pro-badge animate-pro-fade-in">
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {t.playground.processing}
          </div>
        )}
      </div>
    </div>
  );
}
