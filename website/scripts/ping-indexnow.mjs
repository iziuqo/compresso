#!/usr/bin/env node
/**
 * Ping IndexNow after deploy so Bing/Yandex pick up new URLs faster.
 * Submits all URLs from the live sitemap (or SITEMAP_URL override).
 *
 * Usage:
 *   npm run ping:indexnow
 *   SITEMAP_URL=https://compresso.izaias.xyz/sitemap.xml npm run ping:indexnow
 */
const KEY = '339cfae15c2d4a1fb8e9076521bc8f8a';
const HOST = 'compresso.izaias.xyz';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_URL = process.env.SITEMAP_URL || `https://${HOST}/sitemap.xml`;
const BATCH_SIZE = 10_000;

async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) throw new Error(`Sitemap fetch failed: ${res.status} ${SITEMAP_URL}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].trim())
    .filter((url) => {
      try {
        return new URL(url).hostname === HOST;
      } catch {
        return false;
      }
    });
  if (urls.length === 0) throw new Error(`No URLs found in ${SITEMAP_URL}`);
  return urls;
}

async function pingBatch(urlList) {
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  const text = res.ok ? '' : await res.text();
  return { status: res.status, statusText: res.statusText, text };
}

const urls = await fetchSitemapUrls();
console.log(`Sitemap: ${SITEMAP_URL} (${urls.length} URLs)`);

let submitted = 0;
for (let i = 0; i < urls.length; i += BATCH_SIZE) {
  const batch = urls.slice(i, i + BATCH_SIZE);
  const { status, statusText, text } = await pingBatch(batch);
  console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${status} ${statusText} (${batch.length} URLs)`);
  if (status !== 200 && status !== 202) {
    console.error(text || 'IndexNow request failed');
    process.exit(1);
  }
  submitted += batch.length;
}

console.log(`IndexNow complete — submitted ${submitted} URLs`);
