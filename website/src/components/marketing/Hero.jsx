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

        <div className="mk-actions">
          <a className="mk-pill mk-pill--lg" href={APP_URL}>{t.hero.cta}</a>
          <a className="mk-ghost" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            {t.hero.ctaSecondary}
          </a>
        </div>

        <p className="mk-label mk-hero__note">{t.hero.note}</p>

        {/* Below 640px the wide desktop crop shrinks to an illegible strip, so a
            phone capture of the same screen takes over. Both ratios are declared
            on the frame in CSS, so the swap reserves its box before either loads. */}
        <a className="mk-shot mk-shot--hero mk-shot--flush" href={APP_URL} aria-label={t.hero.cta}>
          <picture>
            <source media="(max-width: 639.98px)" srcSet="/app/app-mobile-dark.png" width={780} height={1688} />
            <img
              src="/app/app-dark-shot.png"
              alt={t.hero.shotAlt}
              width={2880}
              height={1688}
              decoding="async"
              fetchPriority="high"
            />
          </picture>
        </a>
      </div>
    </section>
  );
}
