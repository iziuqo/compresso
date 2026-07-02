'use client';

export default function EmbedMobileShell({ t, stage, bar, fullscreen = false }) {
  return (
    <div className={`demo-widget ${fullscreen ? 'demo-widget-fs' : ''}`}>
      <header className="demo-widget-header">
        <div className="demo-widget-heading">
          <span className="demo-widget-label">{t.playground.label}</span>
          <span className="demo-widget-title">{t.playground.title}</span>
        </div>
        <a href="/tool" className="demo-widget-tool-link">
          {t.playground.openTool || 'Full tool'} →
        </a>
      </header>
      <div className="demo-widget-stage">{stage}</div>
      {bar && <div className="demo-widget-bar">{bar}</div>}
    </div>
  );
}
