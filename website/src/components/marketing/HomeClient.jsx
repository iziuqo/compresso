'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getTranslations, storeLocale } from '../../i18n';
import { swapLocaleInPath } from '../../lib/locale-routes';
import Header from './Header';
import Hero from './Hero';
import Proof from './Proof';
import AppSection from './AppSection';
import Library from './Library';
import Close from './Close';
import Footer from './Footer';

function detectBasePath() {
  if (typeof window === 'undefined') return '';
  return window.location.pathname.startsWith('/compresso') ? '/compresso' : '';
}

export default function HomeClient({ initialLocale, localeSlug }) {
  const [locale, setLocale] = useState(initialLocale);
  const [basePath, setBasePath] = useState('');
  const [swapping, setSwapping] = useState(false);
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
    setSwapping(true);
    const target = swapLocaleInPath(pathname || `/${localeSlug}/`, next);
    router.push(target);
  }

  const t = getTranslations(locale);

  return (
    <div className={`mk ${swapping ? 'is-swapping' : ''}`}>
      <Header t={t} locale={locale} onLocaleChange={changeLocale} basePath={basePath} />
      <main>
        <Hero t={t} />
        <Proof t={t} />
        <AppSection t={t} />
        <Library t={t} basePath={basePath} />
        <Close t={t} />
      </main>
      <Footer t={t} basePath={basePath} />
    </div>
  );
}
