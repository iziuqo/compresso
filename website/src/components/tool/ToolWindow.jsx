'use client';

export function TrafficLights({ className = '' }) {
  return (
    <div className={`pro-traffic ${className}`} aria-hidden="true">
      <span className="pro-dot pro-dot-close" />
      <span className="pro-dot pro-dot-min" />
      <span className="pro-dot pro-dot-max" />
    </div>
  );
}

export default function ToolWindow({ title = 'Compresso', actions, children, flush = false, className = '' }) {
  return (
    <div className={`pro-window pro-motion animate-pro-window-in ${flush ? 'pro-window-flush' : ''} ${className}`}>
      <div className="pro-titlebar">
        <TrafficLights className="hidden sm:flex" />
        <span className="pro-title pro-title-animate" key={title}>{title}</span>
        {actions && <div className="pro-titlebar-actions">{actions}</div>}
      </div>
      <div className="pro-body">{children}</div>
    </div>
  );
}
