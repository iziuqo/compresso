'use client';

import Logo from '../Logo';

export default function ToolShell({ title, subtitle, actions, children }) {
  return (
    <div className="tool-app">
      <header className="tool-header">
        <div className="tool-header-start">
          <a href="/" className="tool-header-back" aria-label="Back to home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <a href="/" className="tool-header-brand">
            <Logo size={24} />
            <span className="tool-header-name">Compresso</span>
          </a>
        </div>

        {(title || subtitle) && (
          <div className="tool-header-center hidden sm:block min-w-0">
            {title && <p className="tool-header-title truncate">{title}</p>}
            {subtitle && <p className="tool-header-subtitle truncate">{subtitle}</p>}
          </div>
        )}

        {actions && <div className="tool-header-actions">{actions}</div>}
      </header>
      <main className="tool-main">{children}</main>
    </div>
  );
}
