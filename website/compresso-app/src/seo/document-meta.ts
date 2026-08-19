import type { Locale } from '../i18n';
import { LOCALES } from '../i18n';
import {
  HREFLANG,
  LOCALE_LIST,
  OG_IMAGE,
  SITE_URL,
  appLocaleUrl,
} from './constants';

type MetaDict = {
  'meta.title': string;
  'meta.description': string;
  'meta.ogTitle': string;
  'meta.ogDescription': string;
};

function metaFor(locale: Locale): MetaDict {
  const dict = LOCALES[locale].dict as Record<string, string>;
  const fallback = LOCALES.en.dict as Record<string, string>;
  return {
    'meta.title': dict['meta.title'] ?? fallback['meta.title'],
    'meta.description': dict['meta.description'] ?? fallback['meta.description'],
    'meta.ogTitle': dict['meta.ogTitle'] ?? fallback['meta.ogTitle'],
    'meta.ogDescription': dict['meta.ogDescription'] ?? fallback['meta.ogDescription'],
  };
}

function upsertMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string, extra?: Record<string, string>) {
  const selector = extra?.hreflang
    ? `link[rel="${rel}"][hreflang="${extra.hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  if (extra) {
    for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v);
  }
}

function upsertJsonLd(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function buildWebApplicationSchema(locale: Locale) {
  const meta = metaFor(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Compresso',
    url: appLocaleUrl(locale),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any (web browser)',
    description: meta['meta.description'],
    inLanguage: HREFLANG[locale],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    browserRequirements: 'Requires JavaScript. Modern browser with Web Workers.',
    featureList: [
      'Private on-device compression — 0 bytes uploaded',
      'HEIC, JPEG, PNG, WebP, AVIF input',
      'Batch processing with Web Workers',
      'Offline PWA',
      'Never-bigger guarantee',
    ],
    sameAs: [
      SITE_URL,
      `${SITE_URL}/docs/`,
      'https://github.com/iziuqo/compresso',
      'https://www.npmjs.com/package/compresso.js',
    ],
  };
}

/** Sync `<head>` for the active locale (client-side navigation / language switch). */
export function updateDocumentMeta(locale: Locale) {
  const meta = metaFor(locale);
  const canonical = appLocaleUrl(locale);

  document.documentElement.lang = locale === 'pt-BR' ? 'pt-BR' : locale === 'zh-Hans' ? 'zh-Hans' : locale;
  document.title = meta['meta.title'];

  upsertMeta('description', meta['meta.description']);
  upsertMeta('og:title', meta['meta.ogTitle'], 'property');
  upsertMeta('og:description', meta['meta.ogDescription'], 'property');
  upsertMeta('og:url', canonical, 'property');
  upsertMeta('og:site_name', 'Compresso', 'property');
  upsertMeta('og:type', 'website', 'property');
  upsertMeta('og:image', OG_IMAGE, 'property');
  upsertMeta('twitter:card', 'summary_large_image');
  upsertMeta('twitter:title', meta['meta.ogTitle']);
  upsertMeta('twitter:description', meta['meta.ogDescription']);
  upsertMeta('twitter:image', OG_IMAGE);

  upsertLink('canonical', canonical);

  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove());
  for (const loc of LOCALE_LIST) {
    upsertLink('alternate', appLocaleUrl(loc), { hreflang: HREFLANG[loc] });
  }
  upsertLink('alternate', appLocaleUrl('en'), { hreflang: 'x-default' });

  upsertJsonLd('compresso-webapp-schema', buildWebApplicationSchema(locale));
}
