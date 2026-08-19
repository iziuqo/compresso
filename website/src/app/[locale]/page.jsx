import HomeClient from '../../components/marketing/HomeClient';
import { generateLocaleStaticParams, resolveLocaleFromSlug } from '../../lib/seo';

export function generateStaticParams() {
  return generateLocaleStaticParams();
}

export default async function LocaleHomePage({ params }) {
  const { locale: slug } = await params;
  const locale = resolveLocaleFromSlug(slug);
  return <HomeClient initialLocale={locale} localeSlug={slug} />;
}
