'use client';

import useLocaleRoute from '../../hooks/useLocaleRoute';
import Header from './Header';
import Hero from './Hero';
import Proof from './Proof';
import AppSection from './AppSection';
import Library from './Library';
import Close from './Close';
import Footer from './Footer';

export default function HomeClient({ initialLocale }) {
  const { t, basePath, swapping, changeLocale } = useLocaleRoute(initialLocale);

  return (
    <div className={`mk ${swapping ? 'is-swapping' : ''}`}>
      <Header t={t} locale={initialLocale} onLocaleChange={changeLocale} basePath={basePath} />
      <main>
        <Hero t={t} />
        <Proof t={t} />
        <AppSection t={t} />
        <Library t={t} basePath={basePath} />
        <Close t={t} />
      </main>
      <Footer t={t} basePath={basePath} locale={initialLocale} />
    </div>
  );
}
