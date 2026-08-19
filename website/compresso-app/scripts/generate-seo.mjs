#!/usr/bin/env node
/**
 * Post-build: locale-specific index.html shells, sitemap.xml, robots.txt.
 * Crawlers get translated meta + hreflang in static HTML; the SPA hydrates the same bundle.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'dist/compresso');

const APP_ORIGIN = 'https://compresso.izaias.xyz';
const APP_BASE = '/compresso';
const SITE_URL = 'https://compresso.izaias.xyz';
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const LOCALE_FILES = {
  en: 'en.json',
  es: 'es.json',
  fr: 'fr.json',
  de: 'de.json',
  it: 'it.json',
  'pt-BR': 'pt-BR.json',
  'zh-Hans': 'zh-Hans.json',
};

const LOCALE_SLUGS = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  'pt-BR': 'pt-br',
  'zh-Hans': 'zh-hans',
};

const HREFLANG = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  'pt-BR': 'pt-BR',
  'zh-Hans': 'zh-Hans',
};

const HTML_LANG = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  'pt-BR': 'pt-BR',
  'zh-Hans': 'zh-Hans',
};

function loadMeta(locale) {
  const raw = readFileSync(join(ROOT, 'src/i18n/locales', LOCALE_FILES[locale]), 'utf8');
  const dict = JSON.parse(raw);
  const en = JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales/en.json'), 'utf8'));
  return {
    title: dict['meta.title'] ?? en['meta.title'],
    description: dict['meta.description'] ?? en['meta.description'],
    ogTitle: dict['meta.ogTitle'] ?? en['meta.ogTitle'],
    ogDescription: dict['meta.ogDescription'] ?? en['meta.ogDescription'],
  };
}

function appUrl(locale) {
  if (locale === 'en') return `${APP_ORIGIN}${APP_BASE}/`;
  return `${APP_ORIGIN}${APP_BASE}/${LOCALE_SLUGS[locale]}/`;
}


function webAppSchema(locale, meta) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Compresso',
    url: appUrl(locale),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any (web browser)',
    description: meta.description,
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

function seoHead(locale, meta) {
  const canonical = appUrl(locale);
  const hreflangLinks = Object.keys(LOCALE_SLUGS)
    .map(
      (loc) =>
        `<link rel="alternate" hreflang="${HREFLANG[loc]}" href="${appUrl(loc)}" />`,
    )
    .join('\n    ');
  return `
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeAttr(meta.description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />
    ${hreflangLinks}
    <link rel="alternate" hreflang="x-default" href="${appUrl('en')}" />
    <meta property="og:title" content="${escapeAttr(meta.ogTitle)}" />
    <meta property="og:description" content="${escapeAttr(meta.ogDescription)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:site_name" content="Compresso" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(meta.ogTitle)}" />
    <meta name="twitter:description" content="${escapeAttr(meta.ogDescription)}" />
    <meta name="twitter:image" content="${OG_IMAGE}" />
    <script type="application/ld+json">${JSON.stringify(webAppSchema(locale, meta))}</script>`;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function stripSeoTags(html) {
  return html
    .replace(/<html lang="[^"]*">/, '<html lang="PLACEHOLDER">')
    .replace(/<title>[^<]*<\/title>\s*/gi, '')
    .replace(/<meta name="description"[^>]*>\s*/gi, '')
    .replace(/<meta name="robots"[^>]*>\s*/gi, '')
    .replace(/<link rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '');
}

function patchHtml(baseHtml, locale) {
  const meta = loadMeta(locale);
  let html = stripSeoTags(baseHtml).replace(
    '<html lang="PLACEHOLDER">',
    `<html lang="${HTML_LANG[locale]}">`,
  );

  const injection = seoHead(locale, meta);
  html = html.replace('</head>', `${injection}\n  </head>`);
  return html;
}

function writeLocalePages(baseHtml) {
  for (const locale of Object.keys(LOCALE_SLUGS)) {
    const html = patchHtml(baseHtml, locale);
    if (locale === 'en') {
      writeFileSync(join(OUT, 'index.html'), html, 'utf8');
    } else {
      const dir = join(OUT, LOCALE_SLUGS[locale]);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.html'), html, 'utf8');
    }
  }
}

function writeSitemap() {
  const urls = Object.keys(LOCALE_SLUGS).map((locale) => {
    const loc = appUrl(locale);
    const priority = locale === 'en' ? '1.0' : '0.9';
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  writeFileSync(
    join(OUT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    'utf8',
  );
}

function writeRobots() {
  writeFileSync(
    join(OUT, 'robots.txt'),
    `User-agent: *\nAllow: ${APP_BASE}/\n\nSitemap: ${APP_ORIGIN}${APP_BASE}/sitemap.xml\n`,
    'utf8',
  );
}

const indexPath = join(OUT, 'index.html');
if (!existsSync(indexPath)) {
  console.error('[generate-seo] dist/compresso/index.html not found — run vite build first');
  process.exit(1);
}

const baseHtml = readFileSync(indexPath, 'utf8');
writeLocalePages(baseHtml);
writeSitemap();
writeRobots();
console.log(`[generate-seo] Wrote 7 locale shells, sitemap.xml, robots.txt → ${OUT}`);
