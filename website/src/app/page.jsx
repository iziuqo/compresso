'use client';

import { useEffect, useState } from 'react';
import { getTranslations, defaultLocale, detectLocale, storeLocale } from '../i18n';
import Header from '../components/marketing/Header';
import Hero from '../components/marketing/Hero';
import Proof from '../components/marketing/Proof';
import AppSection from '../components/marketing/AppSection';
import Library from '../components/marketing/Library';
import Close from '../components/marketing/Close';
import Footer from '../components/marketing/Footer';

function detectBasePath() {
  if (typeof window === 'undefined') return '';
  return window.location.pathname.startsWith('/compresso') ? '/compresso' : '';
}

export default function Home() {
  const [locale, setLocale] = useState(defaultLocale);
  const [basePath, setBasePath] = useState('');
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    const next = detectLocale();
    setLocale(next);
    setBasePath(detectBasePath());
    document.documentElement.lang = next;
  }, []);

  /**
   * The swap is deferred by one fade so the page turns rather than snapping.
   * Storing the choice happens immediately: if the tab dies mid-transition the
   * preference should still have been kept.
   */
  function changeLocale(next) {
    if (next === locale) return;
    storeLocale(next);
    setSwapping(true);
    window.setTimeout(() => {
      setLocale(next);
      document.documentElement.lang = next;
      setSwapping(false);
    }, 130);
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
