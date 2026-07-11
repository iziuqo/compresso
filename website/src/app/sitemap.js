export const dynamic = 'force-static';

export default function sitemap() {
  const base = 'https://compresso.izaias.xyz';
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/tool/`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/docs/`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
