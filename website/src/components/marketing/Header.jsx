'use client';

import LangMenu from './LangMenu';
import Mark from './Mark';
import { APP_URL, GITHUB_URL } from './links';

export default function Header({ t, locale, onLocaleChange, basePath = '' }) {
  return (
    <header className="mk-head">
      <div className="mk-wrap mk-head__row">
        <Mark />

        <nav className="mk-head__nav" aria-label="Primary">
          <a className="mk-head__link" href="#library">{t.nav.library}</a>
          <a className="mk-head__link" href={`${basePath}/docs/`}>{t.nav.docs}</a>
          <a className="mk-head__link" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            {t.nav.github}
          </a>
        </nav>

        <div className="mk-head__right">
          <LangMenu locale={locale} onChange={onLocaleChange} label={t.lang.label} />
          <a className="mk-pill mk-pill--sm" href={APP_URL}>{t.nav.openApp}</a>
        </div>
      </div>
    </header>
  );
}
