'use client';

import Link from 'next/link';
import { APP_URL, GITHUB_URL, NPM_URL } from '../marketing/links';
import { getFaqForLocale, faqJsonLd, faqHowToJsonLd } from '../../content/faq';
import JsonLd from './JsonLd';
import SeoPageShell from './SeoPageShell';

export default function FaqClient({ locale }) {
  const { copy, items } = getFaqForLocale(locale);
  const schema = faqJsonLd(items);
  const howTo = faqHowToJsonLd(items);

  return (
    <SeoPageShell initialLocale={locale}>
      <JsonLd data={schema} />
      {howTo && <JsonLd data={howTo} />}
      <article className="mk-seo__article">
        <h1 className="mk-seo__h1">{copy.title}</h1>
        <p className="mk-seo__lead">{copy.intro}</p>
        <div className="mk-seo__actions">
          <a className="mk-pill" href={APP_URL}>{copy.appLink}</a>
          <Link className="mk-seo__text-link" href="/docs/">{copy.docsLink}</Link>
        </div>
        <dl className="mk-seo__faq">
          {items.map((item) => (
            <div key={item.id} className="mk-seo__faq-item">
              <dt className="mk-seo__faq-q">{item.q}</dt>
              <dd className="mk-seo__faq-a">{item.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mk-seo__foot">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
          {' · '}
          <a href={NPM_URL} target="_blank" rel="noopener noreferrer">npm</a>
        </p>
      </article>
    </SeoPageShell>
  );
}
