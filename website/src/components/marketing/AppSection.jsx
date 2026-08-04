import { APP_URL } from './links';

export default function AppSection({ t }) {
  const rows = [
    { title: t.app.privateTitle, body: t.app.privateBody },
    { title: t.app.offlineTitle, body: t.app.offlineBody },
    { title: t.app.batchTitle, body: t.app.batchBody },
    { title: t.app.formatsTitle, body: t.app.formatsBody },
    { title: t.app.langTitle, body: t.app.langBody },
  ];
  return (
    <section className="mk-section" id="app">
      <div className="mk-wrap">
        <div className="mk-section__head">
          <p className="mk-label">{t.app.label}</p>
          <h2 className="mk-section__title">{t.app.title}</h2>
          <p className="mk-section__lede">{t.app.lede}</p>
        </div>

        <div className="mk-rows">
          {rows.map((r) => (
            <div className="mk-row" key={r.title}>
              <h3 className="mk-row__title">{r.title}</h3>
              <p className="mk-row__body">{r.body}</p>
            </div>
          ))}
        </div>

        <div className="mk-shot mk-shot--app">
          <picture>
            <source type="image/avif" srcSet="/app/app-light-shot.avif" />
            <source type="image/webp" srcSet="/app/app-light-shot.webp" />
            <img
              src="/app/app-light-shot.png"
              alt={t.app.shotAlt}
              width={2880}
              height={1688}
              loading="lazy"
              decoding="async"
            />
          </picture>
        </div>

        <div className="mk-actions">
          <a className="mk-pill mk-pill--lg" href={APP_URL}>{t.app.cta}</a>
        </div>
      </div>
    </section>
  );
}
