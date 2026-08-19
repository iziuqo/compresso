import type { Locale } from '../i18n';
import { APP_BASE_PATH, LOCALE_SLUGS, SLUG_TO_LOCALE } from './constants';

const BASE = APP_BASE_PATH.replace(/\/$/, '');

/** Read locale from `/compresso/` or `/compresso/{slug}/`. */
export function localeFromPath(pathname = window.location.pathname): Locale | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === BASE || normalized === `${BASE}/index.html`) return 'en';

  const prefix = `${BASE}/`;
  if (!normalized.startsWith(prefix)) return null;

  const rest = normalized.slice(prefix.length);
  const slug = rest.split('/')[0];
  if (!slug) return 'en';
  return SLUG_TO_LOCALE[slug] ?? null;
}

/** Canonical app path for a locale (always trailing slash). */
export function pathForLocale(locale: Locale): string {
  if (locale === 'en') return `${BASE}/`;
  return `${BASE}/${LOCALE_SLUGS[locale]}/`;
}

export function syncPathToLocale(locale: Locale): void {
  const next = pathForLocale(locale);
  if (window.location.pathname.replace(/\/+$/, '') === next.replace(/\/+$/, '')) return;
  window.history.replaceState(null, '', next);
}
