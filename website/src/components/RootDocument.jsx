import '../app/globals.css';
import '../app/marketing.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import localFont from 'next/font/local';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import ServiceWorker from './ServiceWorker';
import JsonLd from './seo/JsonLd';
import { SITE_SCHEMA } from '../lib/seo';

/**
 * Plus Jakarta Sans (OFL), the Latin variable file Google Fonts serves, kept
 * in the repo so a build never downloads it: when that download fails, the
 * whole build fails. Latin covers all the site's Latin-script copy (none of
 * it needs Latin Extended); anything outside it falls back to system-ui. 500
 * to 800 are the weights the display type uses.
 */
const plusJakartaSans = localFont({
  src: '../fonts/PlusJakartaSans-latin.woff2',
  variable: '--font-display',
  weight: '500 800',
  display: 'swap',
});

/**
 * The <html> document both root layouts share. `lang` is set here, at build
 * time, so the exported HTML already declares the page's language: crawlers,
 * screen readers and the browser's translate prompt read it before any script
 * runs. Each localised page passes its own; everything else is English.
 */
export default function RootDocument({ lang = 'en', children }) {
  return (
    <html lang={lang} className={`scroll-smooth ${GeistSans.variable} ${GeistMono.variable} ${plusJakartaSans.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Compresso" />
        {/* Contentsquare sets cookies. The early-access page asks for nothing
            but its signup consent, so it never loads there (GDPR, LGPD). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "if(!/\\/early\\//.test(location.pathname)){var s=document.createElement('script');s.src='https://t.contentsquare.net/uxa/17eb42fc937fb.js';s.defer=true;document.head.appendChild(s)}",
          }}
        />
        <JsonLd data={SITE_SCHEMA} />
      </head>
      <body className="font-sans antialiased">
        <ServiceWorker />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
