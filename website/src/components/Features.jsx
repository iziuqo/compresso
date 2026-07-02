import StoryChapter from './StoryChapter';

const FEATURE_KEYS = ['clientSide', 'tiny', 'zeroDeps', 'quality', 'universal', 'accessible'];

const ICONS = {
  clientSide: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
    </svg>
  ),
  tiny: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 11-14h-9l1-6z" />
    </svg>
  ),
  zeroDeps: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    </svg>
  ),
  quality: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="12" cy="12" r="3" /><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
    </svg>
  ),
  universal: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  accessible: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="12" cy="4" r="2" /><path d="M4 8h16M12 8v8M8 20l4-8 4 8" />
    </svg>
  ),
};

export default function Features({ t }) {
  return (
    <section id="features" className="band-light section-block">
      <div className="site-wrap">
        <StoryChapter title={t.features.title} desc={t.features.subtitle} />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURE_KEYS.map((key) => (
            <div key={key} className="card p-6 sm:p-7 hover:shadow-lift transition-shadow duration-200">
              <div className="icon-tile mb-5">
                {ICONS[key]}
              </div>
              <h3 className="text-base font-semibold text-ink mb-2 leading-snug">{t.features[key]}</h3>
              <p className="body-copy">{t.features[`${key}Desc`]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
