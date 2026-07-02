import StoryChapter from './StoryChapter';

export default function CTA({ t, basePath = '' }) {
  return (
    <section id="get-started" className="cta-band">
      <div className="site-wrap">
        <div className="max-w-narrow mx-auto text-center">
          <StoryChapter
            title={t.cta.title}
            desc={t.cta.subtitle}
            className="!mb-10 sm:!mb-12"
          />

          <div className="inline-flex items-center gap-2 font-mono text-sm border border-line rounded-pill px-5 py-3 mb-10 bg-canvas-soft text-ink">
            <span className="text-ink-faint">$</span>
            <span className="font-semibold">npm install compresso.js</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={`${basePath}/docs/`} className="btn-primary-dark !px-8 w-full sm:w-auto">
              {t.cta.docs}
            </a>
            <a href="#playground" className="btn-secondary !px-8 w-full sm:w-auto">
              {t.cta.demo}
            </a>
            <a
              href="https://github.com/iziuqo/compresso"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline !px-8 w-full sm:w-auto"
            >
              {t.cta.github}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
