'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getTranslations, storeLocale } from '../i18n';
import { swapLocaleInPath } from '../lib/locale-routes';

/** The site also renders embedded under /compresso, where its links need the prefix. */
function detectBasePath() {
  return window.location.pathname.startsWith('/compresso') ? '/compresso' : '';
}

/**
 * Everything a locale-routed marketing page shares: its dictionary, the base
 * path, and a language switch that navigates to the same page in the other
 * language. The locale comes from the route, so it is never held as state;
 * switching is a navigation, and the next route brings its own.
 *
 * `swapping` turns true once a switch starts, for the `.mk.is-swapping` fade
 * that hides the old language while the new route loads.
 */
export default function useLocaleRoute(locale) {
  const [basePath, setBasePath] = useState('');
  const [swapping, setSwapping] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setBasePath(detectBasePath());
    document.documentElement.lang = locale;
    storeLocale(locale);
  }, [locale]);

  const changeLocale = useCallback((next) => {
    if (next === locale) return;
    storeLocale(next);
    setSwapping(true);
    router.push(swapLocaleInPath(pathname || '/', next));
  }, [locale, pathname, router]);

  return { t: getTranslations(locale), basePath, swapping, changeLocale };
}
