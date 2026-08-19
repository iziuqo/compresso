import './globals.css';
import './marketing.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import ServiceWorker from '../components/ServiceWorker';
import JsonLd from '../components/seo/JsonLd';
import { SITE_SCHEMA } from '../lib/seo';

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

export const metadata = {
  title: 'Compresso: Free Image Compressor That Runs In Your Browser',
  description:
    'Compress, resize, and convert images without uploading them anywhere. Free app that works offline, plus a 3.6 KB zero dependency JavaScript library with HEIC input and parallel Web Worker batching. Fully client side, no server needed.',
  keywords: [
    'image compression',
    'compress image in browser',
    'client-side image compression',
    'javascript image compressor',
    'heic to jpeg',
    'convert heic in browser',
    'resize image in browser',
    'webp',
    'avif',
    'compress images before upload',
    'offline image compressor',
    'image compressor no upload',
    'free image optimizer app',
    'web worker image compression',
    'batch image compression javascript',
  ],
  metadataBase: new URL('https://compresso.izaias.xyz'),
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  openGraph: {
    title: 'Compresso: Free Image Compressor That Runs In Your Browser',
    description:
      'A free image optimizer that runs entirely on your device. Nothing is uploaded and it works offline. Also available as a 3.6 KB library with HEIC input and parallel Web Worker batching.',
    siteName: 'Compresso',
    type: 'website',
    url: 'https://compresso.izaias.xyz',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Compresso — compress images in the browser. 3.6 KB gzipped, 0 dependencies, 100% client-side.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compresso: Free Image Compressor That Runs In Your Browser',
    description:
      'A free image optimizer that runs entirely on your device. Nothing is uploaded and it works offline. Also available as a 3.6 KB library with HEIC input and parallel Web Worker batching.',
    images: ['/og-image.jpg'],
  },
  /* No `alternates.languages` here on purpose. hreflang declares one URL per
     language, and this is a static export with a single page that adapts on
     the client — /en/, /es/ and /pt-br/ were being advertised to crawlers and
     all three returned 404. Seven languages would have meant seven of them.
     Per-locale routes would be the fix; announcing routes we do not serve is
     worse than announcing none. */
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`scroll-smooth ${GeistSans.variable} ${GeistMono.variable} ${display.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Compresso" />
        <script src="https://t.contentsquare.net/uxa/17eb42fc937fb.js" defer />
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
