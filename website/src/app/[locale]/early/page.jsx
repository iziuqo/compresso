import EarlyClient from '../../../components/early/EarlyClient';
import { getTranslations } from '../../../i18n';
import {
  buildPageMetadata,
  generateLocaleStaticParams,
  localeSlug,
  resolveLocaleFromSlug,
} from '../../../lib/seo';
import '../../early.css';

export function generateStaticParams() {
  return generateLocaleStaticParams();
}

/** The link preview is what a WhatsApp status or a Reddit post actually shows,
    so each language gets its own card, set in its own headline. */
export async function generateMetadata({ params }) {
  const { locale: slug } = await params;
  const locale = resolveLocaleFromSlug(slug);
  const { early } = getTranslations(locale);
  return buildPageMetadata(locale, {
    pathTail: 'early',
    title: early.metaTitle,
    description: early.lede,
    image: { url: `/early/${localeSlug(locale)}/og.jpg`, alt: early.title },
  });
}

export default async function EarlyPage({ params }) {
  const { locale: slug } = await params;
  return <EarlyClient locale={resolveLocaleFromSlug(slug)} />;
}
