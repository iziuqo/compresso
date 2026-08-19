'use client';

import Link from 'next/link';
import { APP_URL, NPM_URL } from '../marketing/links';
import { localePath } from '../../lib/locale-routes';
import {
  COMPARISON_COLUMNS,
  COMPARISON_ROWS,
  compareJsonLd,
  getCompareForLocale,
} from '../../content/compare';
import JsonLd from './JsonLd';
import SeoPageShell from './SeoPageShell';

function cellLabel(labels, value) {
  if (value === 'yes') return labels.yes;
  if (value === 'no') return labels.no;
  return value;
}

export default function CompareClient({ locale }) {
  const { copy, labels } = getCompareForLocale(locale);
  const schema = compareJsonLd(locale);

  return (
    <SeoPageShell initialLocale={locale}>
      <JsonLd data={schema} />
      <article className="mk-seo__article">
        <h1 className="mk-seo__h1">{copy.title}</h1>
        <p className="mk-seo__lead">{copy.intro}</p>
        <div className="mk-seo__table-wrap">
          <table className="mk-seo__table">
            <thead>
              <tr>
                <th scope="col" />
                {COMPARISON_COLUMNS.map((col) => (
                  <th key={col} scope="col">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{labels[row.key]}</th>
                  {row.values.map((val, i) => (
                    <td key={COMPARISON_COLUMNS[i]}>{cellLabel(labels, val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2 className="mk-seo__h2">{copy.whenNotTitle}</h2>
        <p className="mk-seo__p">{copy.whenNotBody}</p>
        <div className="mk-seo__actions">
          <a className="mk-pill" href={APP_URL}>{copy.appLink}</a>
          <a className="mk-pill mk-pill--ghost" href={NPM_URL} target="_blank" rel="noopener noreferrer">{copy.npmLink}</a>
        </div>
        <p className="mk-seo__foot">
          <Link href={localePath(locale, 'faq')}>FAQ</Link>
        </p>
      </article>
    </SeoPageShell>
  );
}
