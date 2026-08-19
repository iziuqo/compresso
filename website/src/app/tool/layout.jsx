/**
 * The standalone app at izaias.xyz/compresso is the product now. This route
 * still works for anyone who installed it or has it bookmarked, but it points
 * search engines at the app so the two stop competing for the same queries.
 */
export const metadata = {
  title: 'Compress Images Online, Free and Private, In Your Browser | Compresso',
  description:
    'Free online image compressor. Compress, resize, and convert JPEG, PNG, WebP, AVIF, and HEIC images right in your browser. Nothing is uploaded to any server. Powered by compresso.js.',
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://izaias.xyz/compresso' },
  openGraph: {
    title: 'Compress Images Online, Free and Private | Compresso',
    description:
      'Compress, resize, and convert images including HEIC in your browser. Nothing is uploaded, it is fully client side.',
    url: 'https://izaias.xyz/compresso',
  },
};

export default function ToolLayout({ children }) {
  return children;
}
