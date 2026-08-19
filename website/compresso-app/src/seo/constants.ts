import type { Locale } from '../i18n';

/** Consumer app canonical origin + path prefix. */
export const APP_ORIGIN = 'https://izaias.xyz';
export const APP_BASE_PATH = '/compresso';
export const APP_URL = `${APP_ORIGIN}${APP_BASE_PATH}`;

/** Marketing / docs site (cross-links + hreflang). */
export const SITE_URL = 'https://compresso.izaias.xyz';

export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const LOCALE_SLUGS: Record<Locale, string> = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  'pt-BR': 'pt-br',
  'zh-Hans': 'zh-hans',
};

export const SLUG_TO_LOCALE = Object.fromEntries(
  Object.entries(LOCALE_SLUGS).map(([locale, slug]) => [slug, locale as Locale]),
) as Record<string, Locale>;

/** BCP-47 hreflang values. */
export const HREFLANG: Record<Locale, string> = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  'pt-BR': 'pt-BR',
  'zh-Hans': 'zh-Hans',
};

export const LOCALE_LIST = Object.keys(LOCALE_SLUGS) as Locale[];

export function appLocaleUrl(locale: Locale): string {
  const slug = LOCALE_SLUGS[locale];
  if (locale === 'en') return `${APP_URL}/`;
  return `${APP_URL}/${slug}/`;
}

export function marketingLocaleUrl(locale: Locale, pathTail = ''): string {
  const slug = LOCALE_SLUGS[locale];
  const tail = pathTail ? `${pathTail.replace(/^\//, '').replace(/\/$/, '')}/` : '';
  return tail ? `${SITE_URL}/${slug}/${tail}` : `${SITE_URL}/${slug}/`;
}
