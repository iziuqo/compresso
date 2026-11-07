/**
 * Site-wide metadata. The site has two root layouts, `(site)` for the
 * unlocalised pages and `[locale]` for the localised ones, so both start
 * from this. Page metadata is merged over it shallowly, the same way Next
 * merges a child segment's metadata over its parent's.
 */
export const SITE_METADATA = {
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
