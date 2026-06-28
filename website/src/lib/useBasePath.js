'use client';

import { useMemo } from 'react';

export function useBasePath() {
  return useMemo(() => {
    if (typeof window === 'undefined') return '';
    const path = window.location.pathname;
    if (path.startsWith('/compresso')) return '/compresso';
    return '';
  }, []);
}
