#!/usr/bin/env node
/**
 * Ping IndexNow after deploy so Bing/Yandex pick up new URLs faster.
 * Usage: node website/scripts/ping-indexnow.mjs
 */
const KEY = '339cfae15c2d4a1fb8e9076521bc8f8a';
const HOST = 'compresso.izaias.xyz';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const URLS = [
  `https://${HOST}/en/`,
  `https://${HOST}/en/faq/`,
  `https://${HOST}/en/compare/`,
  `https://${HOST}/en/examples/`,
  `https://${HOST}/en/heic-to-jpeg/`,
  `https://${HOST}/sitemap.xml`,
];

const body = {
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: URLS,
};

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

console.log('IndexNow status:', res.status, res.statusText);
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
console.log('Pinged', URLS.length, 'URLs');
