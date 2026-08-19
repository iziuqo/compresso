'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getTranslations, storeLocale } from '../../i18n';
import { swapLocaleInPath } from '../../lib/locale-routes';
import Header from '../marketing/Header';
import Footer from '../marketing/Footer';

function detectBasePath() {
  if (typeof window === 'undefined') return '';
  return window.location.pathname.startsWith('/compresso') ? '/compresso' : '';
}

export default function SeoPageShell({ initialLocale, children }) {
  const [locale, setLocale] = useState(initialLocale);
  const [basePath, setBasePath] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setLocale(initialLocale);
    setBasePath(detectBasePath());
    document.documentElement.lang = initialLocale;
    storeLocale(initialLocale);
  }, [initialLocale]);

  function changeLocale(next) {
    if (next === locale) return;
    storeLocale(next);
    router.push(swapLocaleInPath(pathname, next));
  }

  const t = getTranslations(locale);

  return (
    <div className="mk">
      <Header t={t} locale={locale} onLocaleChange={changeLocale} basePath={basePath} />
      <main className="mk-seo">
        <div className="mk-wrap">{children}</div>
      </main>
      <Footer t={t} basePath={basePath} locale={locale} />
    </div>
  );
}
