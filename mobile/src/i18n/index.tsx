import { getLocales } from 'expo-localization';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import ptBR from './locales/pt-BR.json';
import zhHans from './locales/zh-Hans.json';

/**
 * The same seven locales, under the same tags, as the website and the web app,
 * so someone who reads the site in Italian opens the app in Italian. All are
 * bundled: switching language must never need a network.
 */
export const LOCALES = {
  en:        { native: 'English',   english: 'English',              dict: en },
  es:        { native: 'Español',   english: 'Spanish',              dict: es },
  fr:        { native: 'Français',  english: 'French',               dict: fr },
  de:        { native: 'Deutsch',   english: 'German',               dict: de },
  it:        { native: 'Italiano',  english: 'Italian',              dict: it },
  'pt-BR':   { native: 'Português', english: 'Portuguese (Brazil)',  dict: ptBR },
  'zh-Hans': { native: '简体中文',   english: 'Chinese (Simplified)', dict: zhHans },
} as const;

export type Locale = keyof typeof LOCALES;
export const LOCALE_LIST = Object.keys(LOCALES) as Locale[];
export type Key = keyof typeof en;

/** Same mapping as the web app: every Portuguese is pt-BR, every Chinese zh-Hans. */
export function normalize(tag: string): Locale | null {
  const t = tag.toLowerCase();
  if (t.startsWith('pt')) return 'pt-BR';
  if (t.startsWith('zh')) return 'zh-Hans';
  const base = t.split('-')[0];
  return (LOCALE_LIST as string[]).includes(base) ? (base as Locale) : null;
}

export function deviceLocale(): Locale {
  for (const l of getLocales()) {
    const hit = normalize(l.languageTag);
    if (hit) return hit;
  }
  return 'en';
}

/**
 * Sizes are decimal, matching how iOS and Android show file sizes and how the
 * size targets are defined (presets.ts). Units stay Latin in every locale.
 */
export function formatBytes(locale: string, bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = bytes <= 0 ? 0 : Math.min(Math.floor(Math.log10(bytes) / 3), 3);
  const value = bytes / 1000 ** i;
  const n = new Intl.NumberFormat(locale, {
    maximumFractionDigits: i === 0 ? 0 : value < 10 ? 1 : 0,
  }).format(value);
  // A no-break space keeps "111 KB" from splitting across lines in a big headline.
  return `${n}\u00A0${units[i]}`;
}

export function formatPercent(locale: string, fraction: number): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(fraction);
}

type Ctx = {
  locale: Locale;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  bytes: (n: number) => string;
  percent: (f: number) => string;
  count: (n: number) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<Ctx>(() => {
    const dict = LOCALES[locale].dict as Record<string, string>;
    const fallback = en as Record<string, string>;
    const nf = new Intl.NumberFormat(locale);
    return {
      locale,
      t: (key, vars) => {
        let s = dict[key] ?? fallback[key] ?? key;
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
        return s;
      },
      bytes: (n) => formatBytes(locale, n),
      percent: (f) => formatPercent(locale, f),
      count: (n) => nf.format(n),
    };
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n outside I18nProvider');
  return ctx;
}
