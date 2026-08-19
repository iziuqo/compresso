import PrivacyClient from '../../../components/seo/PrivacyClient';
import { getPrivacyForLocale } from '../../../content/privacy';
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
  const copy = getPrivacyForLocale(locale);
  return buildPageMetadata(locale, {
    pathTail: 'privacy',
    title: copy.metaTitle,
    description: copy.metaDescription,
  });
}

export default async function PrivacyPage({ params }) {
  const { locale: slug } = await params;
  const locale = resolveLocaleFromSlug(slug);
  return <PrivacyClient locale={locale} />;
}
