import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import ServiceWorker from '../components/ServiceWorker';

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

export const metadata = {
  title: 'Compresso — Compress Images in the Browser',
  description:
    'Compress, resize, and convert images in the browser — a 2 KB, zero-dependency JavaScript image compressor with HEIC input. 100% client-side, no server needed.',
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
  ],
  metadataBase: new URL('https://compresso.izaias.xyz'),
  openGraph: {
    title: 'Compresso — Compress Images in the Browser',
    description:
      '2 KB, zero-dependency image compressor. Compress, resize, and convert images (incl. HEIC) before upload — 100% client-side.',
    siteName: 'Compresso',
    type: 'website',
    url: 'https://compresso.izaias.xyz',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compresso — Compress Images in the Browser',
    description:
      '2 KB, zero-dependency image compressor. Compress, resize, and convert images (incl. HEIC) before upload — 100% client-side.',
  },
  alternates: {
    languages: {
      en: '/en/',
      es: '/es/',
      'pt-BR': '/pt-br/',
    },
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Compresso',
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Any (web browser)',
              description:
                'A 2 KB, zero-dependency JavaScript image compressor that compresses, resizes, and converts images (including HEIC) entirely in the browser.',
              url: 'https://compresso.izaias.xyz',
              license: 'https://opensource.org/licenses/MIT',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              sameAs: [
                'https://github.com/iziuqo/compresso',
                'https://www.npmjs.com/package/compresso.js',
              ],
            }),
          }}
        />
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
