'use client';

import { useEffect } from 'react';
import useLocaleRoute from '../../hooks/useLocaleRoute';
import { localeSlug } from '../../lib/locale-routes';
import { sentences } from '../../lib/text';
import Header from '../marketing/Header';
import Footer from '../marketing/Footer';
import JoinForm from './JoinForm';
import Phone from './Phone';

/**
 * The early-access page: a short list of people who get the Android app before
 * Google Play opens it to everyone, which is how the closed test finds testers.
 * iPhone is already on the App Store, so the form sends iPhone users there.
 *
 * It is built on the marketing surface's own parts (header, type ramp, rows,
 * pills) and adds only what a signup needs. The pull is in the facts rather
 * than in the volume: the app exists, Google Play is not open yet, and a few
 * people are already using it. Nothing on the page counts down or shouts.
 */
export default function EarlyClient({ locale }) {
  const { t, basePath, swapping, changeLocale } = useLocaleRoute(locale);
  const e = t.early;
  const slug = localeSlug(locale);

  // the inline script in page.jsx covers a first load; this covers arriving
  // by client navigation, and lets the rest of the site offer install again
  useEffect(() => {
    const block = window.__eaBlockInstall || ((event) => event.preventDefault());
    window.addEventListener('beforeinstallprompt', block);
    return () => window.removeEventListener('beforeinstallprompt', block);
  }, []);

  const perks = [1, 2, 3].map((n) => ({ title: e[`perk${n}Title`], body: e[`perk${n}Body`] }));
  const steps = [1, 2, 3].map((n) => ({ title: e[`step${n}Title`], body: e[`step${n}Body`] }));

  return (
    <div className={`mk ${swapping ? 'is-swapping' : ''}`}>
      <Header t={t} locale={locale} onLocaleChange={changeLocale} basePath={basePath} nav={false} />
      <main>
        <section className="ea-hero" id="top">
          <div className="mk-wrap ea-hero__grid">
            <div className="ea-hero__copy">
              <p className="mk-label">{e.label}</p>
              <h1 className="mk-hero__title ea-hero__title">
                {sentences(e.title).map((s) => <span key={s}>{s}</span>)}
              </h1>
              <p className="mk-hero__lede ea-hero__lede">{e.lede}</p>
            </div>

            {/* the product before/after sits in front; the two screens either
                side of it are the steps around it, set back in the dark */}
            <div className="ea-phones">
              <Phone slug={slug} screen="home" alt={e.altHome} className="ea-phones__side ea-phones__side--l" />
              <Phone slug={slug} screen="purpose" alt={e.altPurpose} className="ea-phones__side ea-phones__side--r" />
              <Phone slug={slug} screen="compare" alt={e.altCompare} className="ea-phones__front" priority />
            </div>

            <JoinForm t={t} locale={locale} id="join" />
          </div>
        </section>

        <section className="mk-section">
          <div className="mk-wrap ea-split">
            <div>
              <div className="mk-section__head">
                <p className="mk-label">{e.perksLabel}</p>
                <h2 className="mk-section__title">{e.perksTitle}</h2>
              </div>
              <div className="mk-rows">
                {perks.map((p) => (
                  <div className="mk-row ea-row" key={p.title}>
                    <h3 className="mk-row__title">{p.title}</h3>
                    <p className="mk-row__body">{p.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <Phone slug={slug} screen="private" alt={e.altPrivate} className="ea-split__phone" />
          </div>
        </section>

        <section className="mk-section">
          <div className="mk-wrap">
            <div className="mk-section__head">
              <p className="mk-label">{e.stepsLabel}</p>
              <h2 className="mk-section__title">{e.stepsTitle}</h2>
            </div>
            <ol className="ea-steps">
              {steps.map((s, i) => (
                <li className="ea-step" key={s.title}>
                  <span className="ea-step__n mk-mono">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mk-row__title">{s.title}</h3>
                  <p className="mk-row__body">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mk-close">
          <div className="mk-wrap">
            <h2 className="mk-close__title">{e.closeTitle}</h2>
            <div className="mk-actions">
              <a className="mk-pill mk-pill--lg" href="#join">{e.closeCta}</a>
            </div>
            <p className="mk-label mk-hero__note">{e.closeNote}</p>
          </div>
        </section>
      </main>
      <Footer t={t} basePath={basePath} locale={locale} />
    </div>
  );
}
