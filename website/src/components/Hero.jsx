export default function Hero({ t }) {
  return (
    <section id="hero" className="hero-band">
      <div className="site-wrap relative z-10">
        <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto text-center">
          <p className="eyebrow mb-8 sm:mb-10">
            {t.hero.badge}
          </p>

          <h1 className="mb-6 sm:mb-8 flex flex-col items-center text-center gap-1">
            <span className="font-display text-hero-lead text-white block lg:whitespace-nowrap">
              {t.hero.title}
            </span>
            <span className="font-display text-hero text-white/90 block">
              Compresso.
            </span>
          </h1>

          <p className="section-desc mb-10 sm:mb-12 text-white/70">
            {t.hero.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 mb-14 sm:mb-20 max-w-sm sm:max-w-none mx-auto">
            <a href="#playground" className="btn-primary w-full sm:w-auto">
              {t.hero.cta}
            </a>
            <a
              href="https://github.com/iziuqo/compresso"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost-dark w-full sm:w-auto"
            >
              {t.hero.ctaSecondary}
            </a>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 rounded-card border border-line-dark bg-canvas-elevated overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-line-dark mb-10 sm:mb-12">
            {[
              { value: t.hero.statsSizeValue, label: t.hero.statsSize },
              { value: t.hero.statsSpeedValue, label: t.hero.statsSpeed },
              { value: t.hero.statsDepsValue, label: t.hero.statsDeps },
            ].map(({ value, label }) => (
              <div key={label} className="px-4 py-6 sm:px-6 sm:py-8 text-center">
                <dt className="stat-value text-2xl sm:text-4xl mb-2 leading-none text-white">
                  {value}
                </dt>
                <dd className="text-xs sm:text-sm text-white/55 font-medium leading-[1.45] max-w-[9rem] sm:max-w-none mx-auto">
                  {label}
                </dd>
              </div>
            ))}
          </dl>

          <a href="#playground" className="story-scroll-cue">
            {t.hero.scrollCue}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
