'use client';

import { useEffect } from 'react';

/**
 * Root `/` forwards to `/en/`. Vercel also applies a permanent redirect in vercel.json.
 */
export default function RootRedirectPage() {
  useEffect(() => {
    window.location.replace('/en/');
  }, []);

  return (
    <p style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <a href="/en/">Compresso — continue to homepage</a>
    </p>
  );
}
