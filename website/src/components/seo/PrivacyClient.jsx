'use client';

import Link from 'next/link';
import { GITHUB_URL } from '../marketing/links';
import { getPrivacyForLocale } from '../../content/privacy';
import JsonLd from './JsonLd';
import SeoPageShell from './SeoPageShell';

export default function PrivacyClient({ locale }) {
  const copy = getPrivacyForLocale(locale);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: copy.title,
    description: copy.metaDescription,
  };

  return (
    <SeoPageShell initialLocale={locale}>
      <JsonLd data={schema} />
      <article className="mk-seo__article">
        <h1 className="mk-seo__h1">{copy.title}</h1>
        <p className="mk-seo__lead">{copy.intro}</p>
        <h2 className="mk-seo__h2">{copy.imageTitle}</h2>
        <p className="mk-seo__p">{copy.imageBody}</p>
        <h2 className="mk-seo__h2">{copy.analyticsTitle}</h2>
        <p className="mk-seo__p">{copy.analyticsBody}</p>
        <h2 className="mk-seo__h2">{copy.libraryTitle}</h2>
        <p className="mk-seo__p">{copy.libraryBody}</p>
        <p className="mk-seo__foot">
          {copy.contact}{' '}
          <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer">GitHub Issues</a>
          {' · '}
          <Link href="/docs/">Docs</Link>
        </p>
      </article>
    </SeoPageShell>
  );
}
