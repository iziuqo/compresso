'use client';

import Link from 'next/link';
import { NPM_URL } from '../marketing/links';
import { appUrlWithUtm, localePath } from '../../lib/locale-routes';
import { getLandingPage, landingJsonLd } from '../../content/landing-pages';
import JsonLd from './JsonLd';
import SeoPageShell from './SeoPageShell';

export default function LandingClient({ locale, slug }) {
  const page = getLandingPage(slug, locale);
  if (!page) return null;

  const { content, ui } = page;
  const schema = landingJsonLd(content, slug);
  const appHref = appUrlWithUtm(slug, locale);

  return (
    <SeoPageShell initialLocale={locale}>
      <JsonLd data={schema} />
      <article className="mk-seo__article">
        <h1 className="mk-seo__h1">{content.h1}</h1>
        <p className="mk-seo__lead">{content.answer}</p>
        <div className="mk-seo__actions">
          <a className="mk-pill" href={appHref}>{ui.cta}</a>
        </div>

        <h2 className="mk-seo__h2">{ui.howTitle}</h2>
        <ol className="mk-seo__steps">
          {content.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>

        {content.faq?.length > 0 && (
          <>
            <h2 className="mk-seo__h2">{ui.faqTitle}</h2>
            <dl className="mk-seo__faq">
              {content.faq.map((item, i) => (
                <div key={i} className="mk-seo__faq-item">
                  <dt className="mk-seo__faq-q">{item.q}</dt>
                  <dd className="mk-seo__faq-a">{item.a}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        <div className="mk-seo__dev">
          <h2 className="mk-seo__h2">{ui.devTitle}</h2>
          <p className="mk-seo__p">{ui.devBody}</p>
          <pre className="mk-seo__code"><code>npm install compresso.js</code></pre>
          <a className="mk-seo__text-link" href={NPM_URL} target="_blank" rel="noopener noreferrer">npm</a>
          {' · '}
          <Link className="mk-seo__text-link" href="/docs/">Docs</Link>
        </div>

        {content.related?.length > 0 && (
          <>
            <h2 className="mk-seo__h2">{ui.relatedTitle}</h2>
            <ul className="mk-seo__related">
              {content.related.map((rel) => (
                <li key={rel}>
                  <Link href={localePath(locale, rel)}>{rel.replace(/-/g, ' ')}</Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
    </SeoPageShell>
  );
}
