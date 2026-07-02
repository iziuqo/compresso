'use client';

import { useEffect, useRef, useState } from 'react';
import { locales, getLocaleLabel } from '../i18n';
import Logo from './Logo';

export default function Header({ t, locale, onLocaleChange, basePath = '' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollHidden, setScrollHidden] = useState(false);
  const [fsHidden, setFsHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');

    const onScroll = () => {
      if (!mq.matches) {
        setScrollHidden(false);
        return;
      }

      const y = window.scrollY;
      const delta = y - lastY.current;

      if (y < 64) {
        setScrollHidden(false);
      } else if (delta > 10) {
        setScrollHidden(true);
      } else if (delta < -10) {
        setScrollHidden(false);
      }

      lastY.current = y;
    };

    const onFullscreen = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement;
      setFsHidden(el?.id === 'demo-fullscreen-root');
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('webkitfullscreenchange', onFullscreen);

    const onMq = () => setScrollHidden(false);
    mq.addEventListener('change', onMq);

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('webkitfullscreenchange', onFullscreen);
      mq.removeEventListener('change', onMq);
    };
  }, []);

  const headerClass = [
    'site-header',
    scrollHidden && !fsHidden ? 'is-hidden' : '',
    fsHidden ? 'is-fs-hidden' : '',
  ].filter(Boolean).join(' ');

  return (
    <header className={headerClass}>
      <div className="site-wrap">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="text-[0.9375rem] font-semibold text-white tracking-tight">Compresso</span>
          </a>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main">
            <a href="#playground" className="text-sm font-medium text-white/70 hover:text-white px-3 py-2 rounded-pill transition-colors">
              {t.nav.playground}
            </a>
            <a href={`${basePath}/docs/`} className="text-sm font-medium text-white/70 hover:text-white px-3 py-2 rounded-pill transition-colors">
              {t.nav.docs}
            </a>
            <a
              href="https://github.com/iziuqo/compresso"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-white/70 hover:text-white px-3 py-2 rounded-pill transition-colors"
            >
              {t.nav.github}
            </a>

            <div className="w-px h-5 bg-line-dark mx-2" aria-hidden="true" />

            <select
              value={locale}
              onChange={(e) => onLocaleChange(e.target.value)}
              className="appearance-none bg-transparent text-sm font-medium text-white/70 hover:text-white px-2 py-1.5 cursor-pointer focus:outline-none rounded-pill"
              aria-label="Language"
            >
              {locales.map((l) => (
                <option key={l} value={l} className="text-ink">{getLocaleLabel(l)}</option>
              ))}
            </select>

            <a href="#playground" className="btn-primary ml-2 !h-10 !px-5 !text-sm">
              {t.nav.getStarted}
            </a>
          </nav>

          <button
            className="md:hidden p-2 -mr-1 text-white/70 rounded-pill hover:bg-white/10"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? <path d="M6 6L18 18M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-line-dark bg-canvas-dark px-5 py-4 space-y-1" aria-label="Mobile">
          <a href="#playground" className="block py-2.5 px-2 text-white font-medium rounded-pill hover:bg-white/10" onClick={() => setMenuOpen(false)}>{t.nav.playground}</a>
          <a href={`${basePath}/docs/`} className="block py-2.5 px-2 text-white font-medium rounded-pill hover:bg-white/10">{t.nav.docs}</a>
          <a href="https://github.com/iziuqo/compresso" target="_blank" rel="noopener noreferrer" className="block py-2.5 px-2 text-white font-medium rounded-pill hover:bg-white/10">{t.nav.github}</a>
          <select
            value={locale}
            onChange={(e) => { onLocaleChange(e.target.value); setMenuOpen(false); }}
            className="w-full mt-2 py-2.5 px-3 border border-line-dark rounded-ui-lg bg-canvas-elevated text-sm font-medium text-white"
            aria-label="Language"
          >
            {locales.map((l) => <option key={l} value={l}>{getLocaleLabel(l)}</option>)}
          </select>
        </nav>
      )}
    </header>
  );
}
