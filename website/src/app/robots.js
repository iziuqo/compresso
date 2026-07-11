export const dynamic = 'force-static';

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://compresso.izaias.xyz/sitemap.xml',
    host: 'https://compresso.izaias.xyz',
  };
}
