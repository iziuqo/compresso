'use client';

import PreviewWorkspace from './PreviewWorkspace';
import ToolMobileSheet from './ToolMobileSheet';

export default function ProMobileLayout({
  previewProps,
  t,
  c,
  panelProps,
  viewMode,
  setViewMode,
  expanded,
  onToggleExpand,
  showFullscreen,
  onFullscreen,
  isFullscreen,
}) {
  const mobilePreview = { ...previewProps, hideStats: true };

  return (
    <div className="pro-mobile-layout">
      <div className="pro-mobile-preview">
        <PreviewWorkspace {...mobilePreview} fill />
      </div>
      <ToolMobileSheet
        t={t}
        c={c}
        panelProps={panelProps}
        viewMode={viewMode}
        setViewMode={setViewMode}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        showFullscreen={showFullscreen}
        onFullscreen={onFullscreen}
        isFullscreen={isFullscreen}
      />
    </div>
  );
}
