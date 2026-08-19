import ExamplesClient from '../../../components/seo/ExamplesClient';
import { getExamplesForLocale } from '../../../content/examples';
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
  const { copy } = getExamplesForLocale(locale);
  return buildPageMetadata(locale, {
    pathTail: 'examples',
    title: copy.metaTitle,
    description: copy.metaDescription,
  });
}

export default async function ExamplesPage({ params }) {
  const { locale: slug } = await params;
  const locale = resolveLocaleFromSlug(slug);
  return <ExamplesClient locale={locale} />;
}
