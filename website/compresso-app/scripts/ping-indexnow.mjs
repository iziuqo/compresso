#!/usr/bin/env node
/**
 * Ping IndexNow for izaias.xyz/compresso URLs after app build/deploy.
 * Key file: https://izaias.xyz/compresso/{key}.txt (same key as marketing site).
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const KEY = '339cfae15c2d4a1fb8e9076521bc8f8a';
const HOST = 'izaias.xyz';
const KEY_LOCATION = `https://${HOST}/compresso/${KEY}.txt`;
const BATCH_SIZE = 10_000;
const STRICT = process.env.INDEXNOW_STRICT === '1';

const LOCAL_SITEMAP = join(dirname(fileURLToPath(import.meta.url)), '../dist/compresso/sitemap.xml');

function parseSitemapXml(xml, source) {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].trim())
    .filter((url) => {
      try {
        const u = new URL(url);
        return u.hostname === HOST && u.pathname.startsWith('/compresso');
      } catch {
        return false;
      }
    });
  if (urls.length === 0) throw new Error(`No ${HOST}/compresso URLs in ${source}`);
  return urls;
}

async function pingBatch(urlList) {
  const body = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const text = res.ok ? '' : await res.text();
  return { status: res.status, statusText: res.statusText, text };
}

function fail(message, err) {
  console.warn(`[indexnow:app] ${message}`);
  if (err) console.warn(err);
  process.exit(STRICT ? 1 : 0);
}

try {
  if (!existsSync(LOCAL_SITEMAP)) {
    throw new Error(`Missing ${LOCAL_SITEMAP} — run vite build first`);
  }
  const xml = readFileSync(LOCAL_SITEMAP, 'utf8');
  const urls = parseSitemapXml(xml, LOCAL_SITEMAP);
  console.log(`[indexnow:app] Sitemap: ${LOCAL_SITEMAP} (${urls.length} URLs)`);

  let submitted = 0;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const { status, statusText, text } = await pingBatch(batch);
    console.log(`[indexnow:app] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${status} ${statusText}`);
    if (status !== 200 && status !== 202) fail(`IndexNow failed: ${text || statusText}`);
    submitted += batch.length;
  }
  console.log(`[indexnow:app] Complete — submitted ${submitted} URLs`);
} catch (err) {
  fail('Ping skipped (non-fatal for deploy)', err);
}
