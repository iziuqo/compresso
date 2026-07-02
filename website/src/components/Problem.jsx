'use client';

import Reveal from './Reveal';
import StoryChapter from './StoryChapter';

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16.5V5.25a2.25 2.25 0 012.25-2.25h6.5L18 7.5v9a2.25 2.25 0 01-2.25 2.25h-9.5A2.25 2.25 0 014 16.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2.25v5.25H18" />
    </svg>
  );
}

export default function Problem({ t }) {
  const p = t.problem;
  const facts = [
    { value: p.stat2Value, label: p.stat2 },
    { value: p.stat3Value, label: p.stat3 },
    { value: p.stat1Value, label: p.stat1 },
  ];

  return (
    <section id="problem" className="problem-section section-block">
      <div className="site-wrap">
        <Reveal>
          <StoryChapter title={p.title} desc={p.subtitle} />
        </Reveal>

        <Reveal delay={50}>
          <p className="problem-facts-lead">{p.factsLead}</p>
          <dl className="problem-facts">
            {facts.map(({ value, label }) => (
              <div key={label} className="problem-fact">
                <dt className="problem-fact-value">{value}</dt>
                <dd className="problem-fact-label">{label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal delay={100}>
          <div className="problem-compare">
            <article className="problem-card problem-card-broken" aria-labelledby="problem-broken-title">
              <p className="problem-card-tag problem-card-tag-broken">{p.withoutLabel}</p>
              <h3 id="problem-broken-title" className="problem-card-title">{p.withoutTitle}</h3>

              <div className="problem-file">
                <span className="problem-file-icon" aria-hidden="true"><FileIcon /></span>
                <span className="problem-file-name">{p.mockFile}</span>
                <span className="problem-file-size problem-file-size-bad">{p.mockFileSize}</span>
              </div>

              <div className="problem-alert" role="status">
                <p className="problem-alert-text">{p.mockError}</p>
              </div>

              <blockquote className="problem-quote">&ldquo;{p.userQuote}&rdquo;</blockquote>

              <p className="problem-footnote problem-footnote-bad">{p.deadEnd}</p>
            </article>

            <div className="problem-divider" aria-hidden="true">
              <span className="problem-divider-line" />
              <span className="problem-divider-label">{p.withLabel}</span>
              <span className="problem-divider-line" />
            </div>

            <article className="problem-card problem-card-fixed" aria-labelledby="problem-fixed-title">
              <p className="problem-card-tag problem-card-tag-fixed">{p.withLabel}</p>
              <h3 id="problem-fixed-title" className="problem-card-title">{p.withTitle}</h3>

              <div className="problem-file">
                <span className="problem-file-icon" aria-hidden="true"><FileIcon /></span>
                <span className="problem-file-name">{p.mockFile}</span>
                <span className="problem-file-size problem-file-size-good">{p.mockOptimized}</span>
              </div>

              <div className="problem-transform" aria-label={`${p.mockFileSize} to ${p.mockOptimized}`}>
                <span className="problem-transform-before">{p.mockFileSize}</span>
                <svg className="problem-transform-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="problem-transform-after">{p.mockOptimized}</span>
                <span className="problem-transform-savings">{p.mockSavings}</span>
              </div>

              <p className="problem-ready">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {p.mockReady}
              </p>

              <ul className="problem-wins">
                <li>{p.outcomeUser}</li>
                <li>{p.outcomeBusiness}</li>
              </ul>
            </article>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="problem-close">
            <p className="problem-insight">{p.insight}</p>
            <a href="#playground" className="story-cta">
              {p.solutionCta}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
