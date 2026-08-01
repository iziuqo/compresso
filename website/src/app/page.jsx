'use client';

import { useEffect, useState } from 'react';
import { getTranslations, locales, defaultLocale } from '../i18n';
import Header from '../components/marketing/Header';
import Hero from '../components/marketing/Hero';
import Proof from '../components/marketing/Proof';
import AppSection from '../components/marketing/AppSection';
import Library from '../components/marketing/Library';
import Close from '../components/marketing/Close';
import Footer from '../components/marketing/Footer';

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
  return window.location.pathname.startsWith('/compresso') ? '/compresso' : '';
}

export default function Home() {
  const [locale, setLocale] = useState(defaultLocale);
  const [basePath, setBasePath] = useState('');

  useEffect(() => {
    const next = detectLocale();
    setLocale(next);
    setBasePath(detectBasePath());
    document.documentElement.lang = next === 'pt-br' ? 'pt-BR' : next;
  }, []);

  function changeLocale(next) {
    setLocale(next);
    localStorage.setItem('compresso-locale', next);
    document.documentElement.lang = next === 'pt-br' ? 'pt-BR' : next;
  }

  const t = getTranslations(locale);

  return (
    <div className="mk">
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
