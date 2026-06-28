'use client';

import { useState } from 'react';
import { locales, getLocaleLabel } from '../i18n';

export default function Header({ t, locale, onLocaleChange, basePath = '' }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="flex items-center gap-2 font-bold text-xl">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="8" className="fill-brand-500" />
              <path
                d="M8 16C8 11.58 11.58 8 16 8V12C13.79 12 12 13.79 12 16H8Z"
                fill="white"
                opacity="0.7"
              />
              <path
                d="M16 8C20.42 8 24 11.58 24 16H20C20 13.79 18.21 12 16 12V8Z"
                fill="white"
              />
              <path
                d="M24 16C24 20.42 20.42 24 16 24V20C18.21 20 20 18.21 20 16H24Z"
                fill="white"
                opacity="0.7"
              />
              <path
                d="M16 24C11.58 24 8 20.42 8 16H12C12 18.21 13.79 20 16 20V24Z"
                fill="white"
              />
            </svg>
            <span>Compresso</span>
          </a>

          <nav className="hidden md:flex items-center gap-6" aria-label="Main">
            <a href="#playground" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              {t.nav.playground}
            </a>
            <a href={`${basePath}/docs/`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              {t.nav.docs}
            </a>
            <a
              href="https://github.com/iziuqo/compresso"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t.nav.github}
            </a>

            <div className="relative">
              <select
                value={locale}
                onChange={(e) => onLocaleChange(e.target.value)}
                className="appearance-none bg-gray-100 text-sm rounded-lg px-3 py-1.5 pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Language"
              >
                {locales.map((l) => (
                  <option key={l} value={l}>
                    {getLocaleLabel(l)}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </nav>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M6 6L18 18M6 18L18 6" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-gray-200/50 px-4 py-4 space-y-3" aria-label="Mobile">
          <a href="#playground" className="block text-gray-600" onClick={() => setMenuOpen(false)}>
            {t.nav.playground}
          </a>
          <a href={`${basePath}/docs/`} className="block text-gray-600">
            {t.nav.docs}
          </a>
          <a
            href="https://github.com/iziuqo/compresso"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-gray-600"
          >
            {t.nav.github}
          </a>
          <select
            value={locale}
            onChange={(e) => { onLocaleChange(e.target.value); setMenuOpen(false); }}
            className="w-full bg-gray-100 rounded-lg px-3 py-2"
            aria-label="Language"
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {getLocaleLabel(l)}
              </option>
            ))}
          </select>
        </nav>
      )}
    </header>
  );
}
