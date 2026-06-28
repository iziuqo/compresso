export default function Hero({ t }) {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-brand-200/40 via-emerald-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8 border border-brand-200">
          {t.hero.badge}
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6">
          {t.hero.title}
          <br />
          <span className="gradient-text">Compresso.</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          {t.hero.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="#playground"
            className="gradient-bg text-white font-semibold px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-brand-500/25 text-lg"
          >
            {t.hero.cta}
          </a>
          <a
            href="https://github.com/izaiascavalcanti/compresso"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gray-900 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-800 transition-colors text-lg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            {t.hero.ctaSecondary}
          </a>
        </div>

        <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold gradient-text">{t.hero.statsSizeValue}</div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1">{t.hero.statsSize}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold gradient-text">{t.hero.statsSpeedValue}</div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1">{t.hero.statsSpeed}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold gradient-text">{t.hero.statsDepsValue}</div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1">{t.hero.statsDeps}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
