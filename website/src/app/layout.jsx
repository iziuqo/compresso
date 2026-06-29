import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

export const metadata = {
  title: 'Compresso — Instant Image Optimization in the Browser',
  description:
    'Tiny, zero-dependency image optimizer. Compress, resize, and convert images on the client side — no server needed.',
  metadataBase: new URL('https://compresso.izaias.xyz'),
  openGraph: {
    title: 'Compresso — Images optimized instantly, right in the browser',
    description:
      '~3 KB library that compresses, resizes, and converts images before upload. Zero server load. Works everywhere.',
    siteName: 'Compresso',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compresso — Instant Image Optimization in the Browser',
    description:
      '~3 KB library that compresses, resizes, and converts images before upload. Zero server load.',
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
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#22c55e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Compresso" />
        <script src="https://t.contentsquare.net/uxa/17eb42fc937fb.js" defer />
      </head>
      <body className="bg-white text-gray-900">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
