'use client';

import { useEffect, useState } from 'react';
import { getTranslations, locales, defaultLocale } from '../../i18n';
import CompressorApp from '../../components/tool/CompressorApp';

export default function ToolPage() {
  const [locale, setLocale] = useState(defaultLocale);

  useEffect(() => {
    const saved = localStorage.getItem('compresso-locale');
    if (saved && locales.includes(saved)) setLocale(saved);
    else {
      const b = navigator.language?.toLowerCase() || '';
      if (b.startsWith('pt')) setLocale('pt-br');
      else if (b.startsWith('es')) setLocale('es');
    }
    document.documentElement.classList.add('tool-route');
    return () => document.documentElement.classList.remove('tool-route');
  }, []);

  const t = getTranslations(locale);

  function changeLocale(newLocale) {
    setLocale(newLocale);
    localStorage.setItem('compresso-locale', newLocale);
  }

  return (
    <CompressorApp t={t} variant="tool" locale={locale} onLocaleChange={changeLocale} />
  );
}
