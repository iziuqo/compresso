import JsonLd from '../../components/seo/JsonLd';
import { SITE_URL } from '../../lib/seo';

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

const DOCS_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'compresso.js Documentation',
  description:
    'API reference and integration guides for the 3.6 KB browser-native image compression library with HEIC input and Web Worker batching.',
  url: `${SITE_URL}/docs/`,
  author: { '@type': 'Organization', name: 'Compresso' },
  about: {
    '@type': 'SoftwareApplication',
    name: 'compresso.js',
    applicationCategory: 'DeveloperApplication',
  },
};

export default function DocsLayout({ children }) {
  return (
    <>
      <JsonLd data={DOCS_SCHEMA} />
      {children}
    </>
  );
}
