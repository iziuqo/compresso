import { getTranslations, locales } from '../i18n';
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
export const BUILD_DATE = new Date('2026-08-19T00:00:00.000Z');

export function absoluteUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function buildLanguageAlternates(pathTail = '') {
  const languages = {};
  for (const locale of locales) {
    const hreflang = HREFLANG_TAGS[locale];
    languages[hreflang] = absoluteUrl(localePath(locale, pathTail));
  }
  languages['x-default'] = absoluteUrl(localePath('en', pathTail));
  return languages;
}

export function buildPageMetadata(locale, { pathTail = '', title, description, ogTitle, ogDescription } = {}) {
  const t = getTranslations(locale);
  const canonical = absoluteUrl(localePath(locale, pathTail));
  const languages = buildLanguageAlternates(pathTail);

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
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Compresso — compress images in the browser. 3.6 KB gzipped, 0 dependencies, 100% client-side.',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle || title || t.meta.ogTitle,
      description: ogDescription || description || t.meta.ogDescription,
      images: ['/og-image.jpg'],
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
  ],
};
