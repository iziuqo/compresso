'use client';

import Link from 'next/link';
import { GITHUB_URL, NPM_URL } from '../marketing/links';
import { getExamplesForLocale, EXAMPLES } from '../../content/examples';
import JsonLd from './JsonLd';
import SeoPageShell from './SeoPageShell';

const GITHUB_BASE = 'https://github.com/iziuqo/compresso/blob/main/';

export default function ExamplesClient({ locale }) {
  const { copy, labels } = getExamplesForLocale(locale);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: copy.title,
    description: copy.metaDescription,
  };

  return (
    <SeoPageShell initialLocale={locale}>
      <JsonLd data={schema} />
      <article className="mk-seo__article">
        <h1 className="mk-seo__h1">{copy.title}</h1>
        <p className="mk-seo__lead">{copy.intro}</p>
        <p className="mk-seo__p">
          <code className="mk-seo__code" style={{ display: 'inline', padding: '0.2em 0.5em' }}>npm install compresso.js</code>
        </p>
        <ul className="mk-seo__related">
          {EXAMPLES.map((ex) => (
            <li key={ex.id}>
              <a href={`${GITHUB_BASE}${ex.repoPath}`} target="_blank" rel="noopener noreferrer">
                {labels[ex.id] || ex.id}
              </a>
              {' — '}
              {copy.viewOnGithub}
            </li>
          ))}
        </ul>
        <div className="mk-seo__actions">
          <Link className="mk-pill" href="/docs/">{copy.docsLink}</Link>
          <a className="mk-pill mk-pill--ghost" href={NPM_URL} target="_blank" rel="noopener noreferrer">npm</a>
        </div>
        <p className="mk-seo__foot">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
        </p>
      </article>
    </SeoPageShell>
  );
}
