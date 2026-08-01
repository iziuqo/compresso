'use client';

import { useState } from 'react';
import { GITHUB_URL, NPM_URL } from './links';

const SNIPPET = `import { compress } from 'compresso.js';

const { file, savings } = await compress(input, {
  quality: 0.8,
  format: 'auto',
});`;

export default function Library({ t, basePath = '' }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText('npm install compresso.js');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <section className="mk-section" id="library">
      <div className="mk-wrap">
        <div className="mk-section__head">
          <p className="mk-label">{t.library.label}</p>
          <h2 className="mk-section__title">{t.library.title}</h2>
          <p className="mk-section__lede">{t.library.lede}</p>
        </div>

        <div className="mk-code">
          <div className="mk-code__bar">
            <button type="button" className="mk-copy" onClick={copy}>
              <span className="mk-code__comment">$</span>
              npm install compresso.js
            </button>
            <span className="mk-copy__hint">{copied ? t.library.copied : t.library.copy}</span>
          </div>
          <pre className="mk-code__body">
            <code>{SNIPPET}</code>
          </pre>
        </div>

        <div className="mk-rows">
          <div className="mk-row">
            <h3 className="mk-row__title">{t.library.sizeTitle}</h3>
            <p className="mk-row__body">{t.library.sizeBody}</p>
          </div>
          <div className="mk-row">
            <h3 className="mk-row__title">{t.library.workerTitle}</h3>
            <p className="mk-row__body">{t.library.workerBody}</p>
          </div>
          <div className="mk-row">
            <h3 className="mk-row__title">{t.library.guaranteeTitle}</h3>
            <p className="mk-row__body">{t.library.guaranteeBody}</p>
          </div>
        </div>

        <div className="mk-actions mk-actions--inline">
          <a className="mk-ghost" href={`${basePath}/docs/`}>{t.library.docs}</a>
          <a className="mk-ghost" href={NPM_URL} target="_blank" rel="noopener noreferrer">npm</a>
          <a className="mk-ghost" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </div>
    </section>
  );
}
