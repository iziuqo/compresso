#!/usr/bin/env node
/**
 * Ping IndexNow after build/deploy so Bing/Yandex pick up new URLs faster.
 * Runs automatically via npm postbuild on Vercel.
 *
 * Prefers the freshly built out/sitemap.xml; falls back to live sitemap URL.
 * Failures are non-fatal (exit 0) so deploys are not blocked.
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const KEY = '339cfae15c2d4a1fb8e9076521bc8f8a';
const HOST = 'compresso.izaias.xyz';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_URL = process.env.SITEMAP_URL || `https://${HOST}/sitemap.xml`;
const BATCH_SIZE = 10_000;
const STRICT = process.env.INDEXNOW_STRICT === '1';

const LOCAL_SITEMAP = join(dirname(fileURLToPath(import.meta.url)), '../out/sitemap.xml');

function parseSitemapXml(xml, source) {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].trim())
    .filter((url) => {
      try {
        return new URL(url).hostname === HOST;
      } catch {
        return false;
      }
    });
  if (urls.length === 0) throw new Error(`No ${HOST} URLs found in ${source}`);
  return urls;
}

async function getSitemapUrls() {
  if (existsSync(LOCAL_SITEMAP)) {
    const xml = readFileSync(LOCAL_SITEMAP, 'utf8');
    return { urls: parseSitemapXml(xml, LOCAL_SITEMAP), source: LOCAL_SITEMAP };
  }

  const res = await fetch(SITEMAP_URL);
  if (!res.ok) throw new Error(`Sitemap fetch failed: ${res.status} ${SITEMAP_URL}`);
  const xml = await res.text();
  return { urls: parseSitemapXml(xml, SITEMAP_URL), source: SITEMAP_URL };
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

function fail(message, err) {
  console.warn(`[indexnow] ${message}`);
  if (err) console.warn(err);
  process.exit(STRICT ? 1 : 0);
}

try {
  const { urls, source } = await getSitemapUrls();
  console.log(`[indexnow] Sitemap: ${source} (${urls.length} URLs)`);

  let submitted = 0;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const { status, statusText, text } = await pingBatch(batch);
    console.log(`[indexnow] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${status} ${statusText} (${batch.length} URLs)`);
    if (status !== 200 && status !== 202) {
      fail(`IndexNow request failed: ${text || statusText}`);
    }
    submitted += batch.length;
  }

  console.log(`[indexnow] Complete — submitted ${submitted} URLs`);
} catch (err) {
  fail('Ping skipped (non-fatal for deploy)', err);
}
