import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import it from './it.json';
import ptBR from './pt-BR.json';
import zhHans from './zh-Hans.json';

/**
 * The same seven locales the app ships, under the same tags, so a visitor who
 * reads the site in Italian and then opens the app is not switched back to
 * English on arrival. They cannot share a stored preference — the app lives on
 * izaias.xyz and this site on compresso.izaias.xyz, which are separate origins —
 * but they can at least agree on what the languages are called.
 *
 * Native name first, English name beneath it. Never flags: a flag is a country,
 * and es / pt-BR / zh do not map onto one.
 */
export const LOCALES = {
  en:        { native: 'English',    english: 'English',              dict: en },
  es:        { native: 'Español',    english: 'Spanish',              dict: es },
  fr:        { native: 'Français',   english: 'French',               dict: fr },
  de:        { native: 'Deutsch',    english: 'German',               dict: de },
  it:        { native: 'Italiano',   english: 'Italian',              dict: it },
  'pt-BR':   { native: 'Português',  english: 'Portuguese (Brazil)',  dict: ptBR },
  'zh-Hans': { native: '简体中文',    english: 'Chinese (Simplified)', dict: zhHans },
};

export const locales = Object.keys(LOCALES);
export const defaultLocale = 'en';

const STORE_KEY = 'compresso-locale';

/**
 * English is the only complete dictionary by definition — it is where new copy
 * lands first. Merging each locale over it means a key added today renders in
 * English everywhere else instead of rendering the word "undefined".
 */
function withFallback(dict) {
  const out = {};
  for (const section of Object.keys(en)) {
    out[section] = { ...en[section], ...(dict[section] || {}) };
  }
  for (const section of Object.keys(dict)) {
    if (!out[section]) out[section] = dict[section];
  }
  return out;
}

const merged = Object.fromEntries(
  locales.map((l) => [l, l === defaultLocale ? en : withFallback(LOCALES[l].dict)]),
);

export function getTranslations(locale) {
  return merged[locale] || merged[defaultLocale];
}

/**
 * Map any BCP-47 tag a browser offers onto a locale we ship. Region subtags are
 * dropped except where they carry meaning: every flavour of Portuguese lands on
 * pt-BR, and every flavour of Chinese lands on Simplified (Traditional is a
 * known gap, not an oversight).
 */
export function normalize(tag) {
  if (!tag) return null;
  const t = String(tag).toLowerCase();
  if (t.startsWith('pt')) return 'pt-BR';
  if (t.startsWith('zh')) return 'zh-Hans';
  const base = t.split('-')[0];
  return locales.includes(base) ? base : null;
}

/**
 * The site shipped lowercase 'pt-br' before it shipped seven languages. Reading
 * that value forward costs two lines; not reading it silently resets every
 * Brazilian visitor who had already chosen their language.
 */
function readStored() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    if (locales.includes(raw)) return raw;
    const migrated = normalize(raw);
    if (migrated) {
      localStorage.setItem(STORE_KEY, migrated);
      return migrated;
    }
  } catch { /* private mode */ }
  return null;
}

export function detectLocale() {
  if (typeof window === 'undefined') return defaultLocale;
  const stored = readStored();
  if (stored) return stored;
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    const hit = normalize(tag);
    if (hit) return hit;
  }
  return defaultLocale;
}

export function storeLocale(locale) {
  try { localStorage.setItem(STORE_KEY, locale); } catch { /* private mode */ }
}

/** Accept-Language, for anything rendering before the client has a say. */
export function getLocaleFromHeaders(acceptLanguage) {
  if (!acceptLanguage) return defaultLocale;
  const preferred = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=');
      return { lang: lang.trim(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { lang } of preferred) {
    const hit = normalize(lang);
    if (hit) return hit;
  }
  return defaultLocale;
}

export function getLocaleLabel(locale) {
  return LOCALES[locale]?.native || locale;
}
