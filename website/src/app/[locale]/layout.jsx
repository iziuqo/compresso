import RootDocument from '../../components/RootDocument';
import { SITE_METADATA } from '../../lib/site-metadata';
import { HREFLANG_TAGS, buildPageMetadata, generateLocaleStaticParams, resolveLocaleFromSlug } from '../../lib/seo';

export function generateStaticParams() {
  return generateLocaleStaticParams();
}

export async function generateMetadata({ params }) {
  const { locale: slug } = await params;
  const locale = resolveLocaleFromSlug(slug);
  return { ...SITE_METADATA, ...buildPageMetadata(locale, { pathTail: '' }) };
}

/* A root layout of its own, so every /<locale>/ page is exported with its
   language in <html lang> rather than "en" fixed up by a script later. */
export default async function LocaleLayout({ children, params }) {
  const { locale: slug } = await params;
  const locale = resolveLocaleFromSlug(slug);
  return <RootDocument lang={HREFLANG_TAGS[locale] || 'en'}>{children}</RootDocument>;
}
