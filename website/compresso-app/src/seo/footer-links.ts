import { LOCALE_SLUGS, SITE_URL } from '../seo/constants';
import type { Locale } from '../i18n';

export function footerLinks(locale: Locale) {
  const slug = LOCALE_SLUGS[locale];
  return {
    docs: `${SITE_URL}/docs/`,
    faq: `${SITE_URL}/${slug}/faq/`,
    npm: 'https://www.npmjs.com/package/compresso.js',
    site: `${SITE_URL}/${slug}/`,
  };
}
