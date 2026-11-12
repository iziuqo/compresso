import { getTranslations, locales } from '../i18n';
import { APP_STORE_URL } from '../components/marketing/links';
import {
  APP_URL,
  LOCALE_SLUGS,
  SLUG_TO_LOCALE,
  generateLocaleStaticParams,
  localePath,
  localeSlug,
  resolveLocaleFromSlug,
} from './locale-routes';

export {
  APP_URL,
  LOCALE_SLUGS,
  SLUG_TO_LOCALE,
  generateLocaleStaticParams,
  localePath,
  localeSlug,
  resolveLocaleFromSlug,
  swapLocaleInPath,
  appUrlWithUtm,
} from './locale-routes';

export const SITE_URL = 'https://compresso.izaias.xyz';

/** hreflang attribute values (BCP-47). */
export const HREFLANG_TAGS = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  'pt-BR': 'pt-BR',
  'zh-Hans': 'zh-Hans',
};

export const LOCALE_SLUG_LIST = Object.values(LOCALE_SLUGS);

/** ISO date for sitemap lastModified (updated at build). */
export const BUILD_DATE = new Date();

export function absoluteUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function buildLanguageAlternates(pathTail = '', pageLocales = locales) {
  const languages = {};
  for (const locale of pageLocales) {
    const hreflang = HREFLANG_TAGS[locale];
    languages[hreflang] = absoluteUrl(localePath(locale, pathTail));
  }
  languages['x-default'] = absoluteUrl(localePath('en', pathTail));
  return languages;
}

const DEFAULT_OG_IMAGE = {
  url: '/og-image.jpg',
  alt: 'Compresso — compress images in the browser. 3.6 KB gzipped, 0 dependencies, 100% client-side.',
};

/** `image` ({ url, alt }, 1200×630) replaces the site-wide link preview. */
export function buildPageMetadata(
  locale,
  {
    pathTail = '',
    title,
    description,
    ogTitle,
    ogDescription,
    image = DEFAULT_OG_IMAGE,
    pageLocales = locales,
  } = {},
) {
  const t = getTranslations(locale);
  /* A locale the page has no copy in shows English, so English is canonical. */
  const canonicalLocale = pageLocales.includes(locale) ? locale : 'en';
  const canonical = absoluteUrl(localePath(canonicalLocale, pathTail));
  const languages = buildLanguageAlternates(pathTail, pageLocales);

  return {
    title: title || t.meta.title,
    description: description || t.meta.description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title: ogTitle || title || t.meta.ogTitle,
      description: ogDescription || description || t.meta.ogDescription,
      url: canonical,
      siteName: 'Compresso',
      type: 'website',
      images: [{ ...image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle || title || t.meta.ogTitle,
      description: ogDescription || description || t.meta.ogDescription,
      images: [image.url],
    },
  };
}

export const SITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Compresso',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.svg`,
      sameAs: [
        'https://github.com/iziuqo/compresso',
        'https://www.npmjs.com/package/compresso.js',
      ],
    },
    {
      '@type': 'WebSite',
      name: 'Compresso',
      url: SITE_URL,
    },
    {
      '@type': 'SoftwareApplication',
      name: 'compresso.js',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any (web browser)',
      description:
        'A 3.6 KB, zero-dependency JavaScript image compressor that compresses, resizes, and converts images (including HEIC), with parallel Web Worker batching, entirely in the browser.',
      url: `${SITE_URL}/docs/`,
      license: 'https://opensource.org/licenses/MIT',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      sameAs: [
        'https://github.com/iziuqo/compresso',
        'https://www.npmjs.com/package/compresso.js',
      ],
    },
    {
      '@type': 'WebApplication',
      name: 'Compresso Image Optimizer',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (web browser)',
      browserRequirements: 'Requires JavaScript',
      description:
        'Free online image compressor that runs entirely in your browser. Compress, resize, and convert JPEG, PNG, WebP, AVIF, and HEIC images with zero server upload.',
      url: APP_URL,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@type': 'MobileApplication',
      name: 'Compresso: Photo Compressor',
      applicationCategory: 'PhotographyApplication',
      operatingSystem: 'iOS, iPadOS',
      description:
        'Make photos smaller for messages, email and upload forms. Everything happens on the iPhone: no upload, no account, no ads.',
      url: APP_STORE_URL,
      installUrl: APP_STORE_URL,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ],
};
