import '../app/globals.css';
import '../app/marketing.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import ServiceWorker from './ServiceWorker';
import JsonLd from './seo/JsonLd';
import { SITE_SCHEMA } from '../lib/seo';

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
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
    <html lang={lang} className={`scroll-smooth ${GeistSans.variable} ${GeistMono.variable} ${display.variable}`}>
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
