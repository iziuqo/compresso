import { buildPageMetadata, generateLocaleStaticParams, resolveLocaleFromSlug } from '../../lib/seo';
import { getTranslations } from '../../i18n';
import LocaleLang from '../../components/seo/LocaleLang';

export function generateStaticParams() {
  return generateLocaleStaticParams();
}

export async function generateMetadata({ params }) {
  const { locale: slug } = await params;
  const locale = resolveLocaleFromSlug(slug);
  const t = getTranslations(locale);
  return buildPageMetadata(locale, { pathTail: '' });
}

export default async function LocaleLayout({ children, params }) {
  const { locale: slug } = await params;
  const locale = resolveLocaleFromSlug(slug);
  return (
    <>
      <LocaleLang locale={locale} />
      {children}
    </>
  );
}
