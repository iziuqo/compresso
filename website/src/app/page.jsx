'use client';

import { useEffect, useState } from 'react';
import { getTranslations, locales, defaultLocale, getLocaleLabel } from '../i18n';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Playground from '../components/Playground';
import Problem from '../components/Problem';
import Features from '../components/Features';
import CodeSection from '../components/CodeSection';
import Impact from '../components/Impact';
import CTA from '../components/CTA';
import Footer from '../components/Footer';
import InstallBanner from '../components/InstallBanner';

function detectLocale() {
  if (typeof window === 'undefined') return defaultLocale;

  const saved = localStorage.getItem('compresso-locale');
  if (saved && locales.includes(saved)) return saved;

  const browserLang = navigator.language?.toLowerCase() || '';
  if (browserLang.startsWith('pt')) return 'pt-br';
  if (browserLang.startsWith('es')) return 'es';
  return 'en';
}

function detectBasePath() {
  if (typeof window === 'undefined') return '';
  const path = window.location.pathname;
  if (path.startsWith('/compresso')) return '/compresso';
  return '';
}

export default function Home() {
  const [locale, setLocale] = useState(defaultLocale);
  const [mounted, setMounted] = useState(false);
  const [basePath, setBasePath] = useState('');

  useEffect(() => {
    const detected = detectLocale();
    setLocale(detected);
    setBasePath(detectBasePath());
    setMounted(true);
    document.documentElement.lang = detected === 'pt-br' ? 'pt-BR' : detected;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  function changeLocale(newLocale) {
    setLocale(newLocale);
    localStorage.setItem('compresso-locale', newLocale);
    document.documentElement.lang = newLocale === 'pt-br' ? 'pt-BR' : newLocale;
  }

  const t = getTranslations(locale);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Header t={t} locale={locale} onLocaleChange={changeLocale} basePath={basePath} />
      <main>
        <Hero t={t} />
        <Playground t={t} />
        <Problem t={t} />
        <Features t={t} />
        <CodeSection t={t} />
        <Impact t={t} />
        <CTA t={t} basePath={basePath} />
      </main>
      <Footer t={t} basePath={basePath} />
      <InstallBanner t={t} />
    </>
  );
}
