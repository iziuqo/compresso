import { APP_URL } from './links';

export default function Close({ t }) {
  return (
    <section className="mk-close" id="get-started">
      <div className="mk-wrap">
        <h2 className="mk-close__title">{t.close.title}</h2>
        <div className="mk-actions">
          <a className="mk-pill mk-pill--lg" href={APP_URL}>{t.close.cta}</a>
        </div>
        <p className="mk-label mk-hero__note">{t.close.note}</p>
      </div>
    </section>
  );
}
