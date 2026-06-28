import en from './en.json';
import es from './es.json';
import ptBr from './pt-br.json';

export const locales = ['en', 'es', 'pt-br'];
export const defaultLocale = 'en';

const translations = { en, es, 'pt-br': ptBr };

export function getTranslations(locale) {
  return translations[locale] || translations[defaultLocale];
}

export function getLocaleFromHeaders(acceptLanguage) {
  if (!acceptLanguage) return defaultLocale;

  const preferred = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=');
      return { lang: lang.toLowerCase().trim(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of preferred) {
    if (lang.startsWith('pt')) return 'pt-br';
    if (lang.startsWith('es')) return 'es';
    if (lang.startsWith('en')) return 'en';
  }

  return defaultLocale;
}

export function getLocaleLabel(locale) {
  const labels = {
    en: 'English',
    es: 'Español',
    'pt-br': 'Português',
  };
  return labels[locale] || locale;
}
