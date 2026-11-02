'use client';

import useLocaleRoute from '../../hooks/useLocaleRoute';
import Header from '../marketing/Header';
import Footer from '../marketing/Footer';

export default function SeoPageShell({ initialLocale, children }) {
  const { t, basePath, swapping, changeLocale } = useLocaleRoute(initialLocale);

  return (
    <div className={`mk ${swapping ? 'is-swapping' : ''}`}>
      <Header t={t} locale={initialLocale} onLocaleChange={changeLocale} basePath={basePath} />
      <main className="mk-seo">
        <div className="mk-wrap">{children}</div>
      </main>
      <Footer t={t} basePath={basePath} locale={initialLocale} />
    </div>
  );
}
