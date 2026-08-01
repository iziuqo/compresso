'use client';

import { useEffect, useState } from 'react';
import { getTranslations, defaultLocale, detectLocale, storeLocale } from '../../i18n';
import CompressorApp from '../../components/tool/CompressorApp';

export default function ToolPage() {
  const [locale, setLocale] = useState(defaultLocale);

  useEffect(() => {
    const next = detectLocale();
    setLocale(next);
    document.documentElement.lang = next;
    document.documentElement.classList.add('tool-route');
    return () => document.documentElement.classList.remove('tool-route');
  }, []);

  const t = getTranslations(locale);

  function changeLocale(newLocale) {
    setLocale(newLocale);
    storeLocale(newLocale);
    document.documentElement.lang = newLocale;
  }

  return (
    <CompressorApp t={t} variant="tool" locale={locale} onLocaleChange={changeLocale} />
  );
}
