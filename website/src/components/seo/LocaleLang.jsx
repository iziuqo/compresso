'use client';

import { useEffect } from 'react';

/** Sets document.documentElement.lang from the locale route (SSR metadata is separate). */
export default function LocaleLang({ locale }) {
  useEffect(() => {
    if (locale) document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
