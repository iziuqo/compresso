import { notFound } from 'next/navigation';
import LandingClient from '../../../components/seo/LandingClient';
import { LANDING_PAGE_SLUGS, LANDING_PAGES } from '../../../content/landing-pages';
import {
  buildPageMetadata,
  generateLocaleStaticParams,
  resolveLocaleFromSlug,
} from '../../../lib/seo';

export function generateStaticParams() {
  const localeParams = generateLocaleStaticParams();
  const params = [];
  for (const { locale } of localeParams) {
    for (const slug of LANDING_PAGE_SLUGS) {
      params.push({ locale, slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }) {
  const { locale: localeSlug, slug: pageSlug } = await params;
  const locale = resolveLocaleFromSlug(localeSlug);
  const page = LANDING_PAGES[pageSlug]?.[locale] || LANDING_PAGES[pageSlug]?.en;
  if (!page) return {};
  return buildPageMetadata(locale, {
    pathTail: pageSlug,
    title: page.metaTitle,
    description: page.metaDescription,
    ogTitle: page.metaTitle,
    ogDescription: page.metaDescription,
  });
}

export default async function LandingPage({ params }) {
  const { locale: localeSlug, slug: pageSlug } = await params;
  if (!LANDING_PAGE_SLUGS.includes(pageSlug)) notFound();
  const locale = resolveLocaleFromSlug(localeSlug);
  return <LandingClient locale={locale} slug={pageSlug} />;
}
