import RootDocument from '../../components/RootDocument';
import { SITE_METADATA } from '../../lib/site-metadata';

/* Root layout for the pages outside /<locale>/: the / redirect, /tool and
   /docs. They are English, and the localised pages have their own root
   layout in [locale] so each can declare its language in the HTML. */
export const metadata = SITE_METADATA;

export default function SiteLayout({ children }) {
  return <RootDocument>{children}</RootDocument>;
}
