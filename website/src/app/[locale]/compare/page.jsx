import CompareClient from '../../../components/seo/CompareClient';
import { getCompareForLocale } from '../../../content/compare';
import {
  buildPageMetadata,
  generateLocaleStaticParams,
  resolveLocaleFromSlug,
} from '../../../lib/seo';

export function generateStaticParams() {
  return generateLocaleStaticParams();
}

export async function generateMetadata({ params }) {
  const { locale: slug } = await params;
  const locale = resolveLocaleFromSlug(slug);
  const { copy } = getCompareForLocale(locale);
  return buildPageMetadata(locale, {
    pathTail: 'compare',
    title: copy.metaTitle,
    description: copy.metaDescription,
    ogTitle: copy.metaTitle,
    ogDescription: copy.metaDescription,
  });
}

export default async function ComparePage({ params }) {
  const { locale: slug } = await params;
  const locale = resolveLocaleFromSlug(slug);
  return <CompareClient locale={locale} />;
}
