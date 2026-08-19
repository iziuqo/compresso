import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import ptBR from './locales/pt-BR.json';
import zhHans from './locales/zh-Hans.json';
import { updateDocumentMeta } from '../seo/document-meta';
import { localeFromPath, syncPathToLocale } from '../seo/locale-path';

/**
 * Seven locales, all bundled. They are ~4 KB each: lazy-loading them would add a
 * network dependency to switching languages, which would then fail offline —
 * exactly the thing this app promises never to happen.
 */
export const LOCALES = {
  en:        { native: 'English',     english: 'English',              dict: en },
  es:        { native: 'Español',     english: 'Spanish',              dict: es },
  fr:        { native: 'Français',    english: 'French',               dict: fr },
  de:        { native: 'Deutsch',     english: 'German',               dict: de },
  it:        { native: 'Italiano',    english: 'Italian',              dict: it },
  'pt-BR':   { native: 'Português',   english: 'Portuguese (Brazil)',  dict: ptBR },
  'zh-Hans': { native: '简体中文',     english: 'Chinese (Simplified)', dict: zhHans },
} as const;

export type Locale = keyof typeof LOCALES;
export const LOCALE_LIST = Object.keys(LOCALES) as Locale[];
type Key = keyof typeof en;

const STORE_KEY = 'compresso.lang';

/**
 * Map any BCP-47 tag the browser offers onto a locale we ship. Region subtags are
 * stripped except where they carry meaning: every flavour of Portuguese lands on
 * pt-BR, and every flavour of Chinese lands on Simplified (Traditional is a known
 * v1 gap, not an oversight).
 */
export function normalize(tag: string): Locale | null {
  const t = tag.toLowerCase();
  if (t.startsWith('pt')) return 'pt-BR';
  if (t.startsWith('zh')) return 'zh-Hans';
  const base = t.split('-')[0];
  return (LOCALE_LIST as string[]).includes(base) ? (base as Locale) : null;
}

export function detectLocale(): Locale {
  const fromPath = localeFromPath();
  if (fromPath) return fromPath;
  try {
    const stored = localStorage.getItem(STORE_KEY);
    if (stored && (LOCALE_LIST as string[]).includes(stored)) return stored as Locale;
  } catch { /* private mode */ }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const hit = normalize(tag);
    if (hit) return hit;
  }
  return 'en';
}

/* ------------------------------------------------------------- formatting */

/**
 * Bytes, localised. This interface is almost entirely numbers — leaving "1.5 MB"
 * in a French UI is the tell that a product was translated but never localised.
 * Units stay Latin in every locale, including zh: that is the convention there.
 */
export function formatBytes(locale: string, bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = bytes === 0 ? 0 : Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), 3);
  const value = bytes / 1024 ** i;
  const n = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: i === 0 ? 0 : value < 10 ? 1 : 0,
  }).format(value);
  return `${n} ${units[i]}`;
}

export function formatPercent(locale: string, fraction: number): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(fraction);
}

export function formatCount(locale: string, n: number): string {
  return new Intl.NumberFormat(locale).format(n);
}

/* ---------------------------------------------------------------- context */

type Phase = 'in' | 'out';
type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  phase: Phase;
  bytes: (n: number) => string;
  percent: (f: number) => string;
  count: (n: number) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());
  const [phase, setPhase] = useState<Phase>('in');

  useEffect(() => {
    document.documentElement.lang = locale;
    updateDocumentMeta(locale);
  }, [locale]);

  /**
   * Language doesn't snap. Text drifts out over 120ms, the dictionary swaps while
   * nothing is visible, then it settles back in. A page turning, not a re-render.
   */
  const setLocale = useCallback((next: Locale) => {
    try { localStorage.setItem(STORE_KEY, next); } catch { /* private mode */ }
    syncPathToLocale(next);
    setPhase('out');
    window.setTimeout(() => {
      setLocaleState(next);
      setPhase('in');
    }, 130);
  }, []);

  const value = useMemo<Ctx>(() => {
    const dict = LOCALES[locale].dict as Record<string, string>;
    const fallback = en as Record<string, string>;
    return {
      locale,
      setLocale,
      phase,
      t: (key, vars) => {
        let s = dict[key] ?? fallback[key] ?? (key as string);
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
        return s;
      },
      bytes: (n) => formatBytes(locale, n),
      percent: (f) => formatPercent(locale, f),
      count: (n) => formatCount(locale, n),
    };
  }, [locale, phase, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n outside provider');
  return ctx;
}

/** Localised text that participates in the language-swap drift. */
export function T({ k, vars }: { k: Key; vars?: Record<string, string | number> }) {
  const { t, phase } = useI18n();
  return <span className={`t t--${phase}`}>{t(k, vars)}</span>;
}
