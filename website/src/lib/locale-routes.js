/** Client-safe locale URL helpers (no i18n imports). */

export const LOCALE_SLUGS = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  'pt-BR': 'pt-br',
  'zh-Hans': 'zh-hans',
};

export const SLUG_TO_LOCALE = Object.fromEntries(
  Object.entries(LOCALE_SLUGS).map(([locale, slug]) => [slug, locale]),
);

export const LOCALE_SLUG_LIST = Object.values(LOCALE_SLUGS);

export function localeSlug(locale) {
  return LOCALE_SLUGS[locale] || LOCALE_SLUGS.en;
}

export function localePath(locale, ...segments) {
  const slug = localeSlug(locale);
  const tail = segments.filter(Boolean).join('/');
  return tail ? `/${slug}/${tail}/` : `/${slug}/`;
}

export function swapLocaleInPath(pathname, nextLocale) {
  const nextSlug = localeSlug(nextLocale);
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return `/${nextSlug}/`;
  if (LOCALE_SLUG_LIST.includes(parts[0])) {
    parts[0] = nextSlug;
  } else {
    parts.unshift(nextSlug);
  }
  return `/${parts.join('/')}/`;
}

export function resolveLocaleFromSlug(slug) {
  return SLUG_TO_LOCALE[slug] || 'en';
}

export function generateLocaleStaticParams() {
  return LOCALE_SLUG_LIST.map((locale) => ({ locale }));
}

export const APP_URL = 'https://izaias.xyz/compresso';

export function appUrlWithUtm(campaign, locale) {
  const params = new URLSearchParams({
    utm_source: 'seo',
    utm_medium: 'landing',
    utm_campaign: campaign,
    utm_content: locale,
  });
  return `${APP_URL}?${params.toString()}`;
}
