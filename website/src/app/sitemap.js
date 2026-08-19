import { locales } from '../i18n';
import {
  APP_URL,
  BUILD_DATE,
  SITE_URL,
  localePath,
} from '../lib/seo';
import { LANDING_PAGE_SLUGS } from '../content/landing-pages';

export const dynamic = 'force-static';

const STATIC_PATHS = ['faq', 'compare', 'examples', 'privacy', ...LANDING_PAGE_SLUGS];

export default function sitemap() {
  const lastModified = BUILD_DATE;
  const entries = [];

  // Root redirect target — English homepage
  for (const locale of locales) {
    entries.push({
      url: `${SITE_URL}${localePath(locale)}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: locale === 'en' ? 1 : 0.9,
    });
  }

  // FAQ, compare, and programmatic landing pages × locales
  for (const pathTail of STATIC_PATHS) {
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}${localePath(locale, pathTail)}`,
        lastModified,
        changeFrequency: pathTail === 'faq' || pathTail === 'compare' ? 'monthly' : 'weekly',
        priority: pathTail === 'faq' || pathTail === 'compare' ? 0.85 : 0.8,
      });
    }
  }

  // Developer docs (English-only route; single URL)
  entries.push({
    url: `${SITE_URL}/docs/`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.8,
  });

  // Primary consumer app (external canonical product URL)
  entries.push({
    url: APP_URL,
    lastModified,
    changeFrequency: 'weekly',
    priority: 1,
  });

  return entries;
}
