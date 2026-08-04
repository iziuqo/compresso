export const metadata = {
  title: 'compresso.js Documentation: Client Side Image Compression API',
  description:
    'API reference and guides for compresso.js, the 3.6 KB zero dependency browser image compressor. Compress, resize, and convert images including HEIC, with parallel Web Worker batching, fully client side.',
  alternates: { canonical: '/docs/' },
  openGraph: {
    title: 'compresso.js Documentation: Client Side Image Compression API',
    description:
      'API reference for the 3.6 KB, zero-dependency browser image compressor with HEIC input and parallel Web Worker batching.',
    url: 'https://compresso.izaias.xyz/docs/',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Compresso — compress images in the browser.' }],
  },
};

export default function DocsLayout({ children }) {
  return children;
}
