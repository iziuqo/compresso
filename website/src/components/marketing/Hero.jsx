import { APP_URL, GITHUB_URL } from './links';

/**
 * Headline, then the product itself. The screenshot is the only colour on the
 * page, which is the app's own thesis applied to the page that sells it.
 */
export default function Hero({ t }) {
  return (
    <section className="mk-hero" id="top">
      <div className="mk-wrap mk-hero__inner">
        <p className="mk-label">{t.hero.badge}</p>
        <h1 className="mk-hero__title">{t.hero.title}</h1>
        <p className="mk-hero__lede">{t.hero.subtitle}</p>

        <div className="mk-hero__actions">
          <a className="mk-pill mk-pill--lg" href={APP_URL}>{t.hero.cta}</a>
          <a className="mk-ghost" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            {t.hero.ctaSecondary}
          </a>
        </div>

        <p className="mk-label mk-hero__note">{t.hero.note}</p>

        <a className="mk-shot mk-shot--flush" href={APP_URL} aria-label={t.hero.cta}>
          <img
            src="/app/app-dark-shot.png"
            alt={t.hero.shotAlt}
            width={2880}
            height={1688}
            decoding="async"
          />
        </a>
      </div>
    </section>
  );
}
