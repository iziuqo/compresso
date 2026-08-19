import FaqClient from '../../../components/seo/FaqClient';
import { getFaqForLocale } from '../../../content/faq';
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
  const { copy } = getFaqForLocale(locale);
  return buildPageMetadata(locale, {
    pathTail: 'faq',
    title: copy.metaTitle,
    description: copy.metaDescription,
    ogTitle: copy.metaTitle,
    ogDescription: copy.metaDescription,
  });
}

export default async function FaqPage({ params }) {
  const { locale: slug } = await params;
  const locale = resolveLocaleFromSlug(slug);
  return <FaqClient locale={locale} />;
}
