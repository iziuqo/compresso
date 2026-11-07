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

/** Arriving from the early-access signup (its consent link ends in
    #early-access), keep Chrome from offering to install the web tool, as the
    early page itself does. Any other visit to this page is left alone. */
const BLOCK_INSTALL_FROM_EARLY =
  "if(location.hash==='#early-access')addEventListener('beforeinstallprompt',function(e){e.preventDefault()})";

export default async function PrivacyPage({ params }) {
  const { locale: slug } = await params;
  const locale = resolveLocaleFromSlug(slug);
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BLOCK_INSTALL_FROM_EARLY }} />
      <PrivacyClient locale={locale} />
    </>
  );
}
