// Pushes the Google Play listing (text and images, every Play locale) through
// the Play Developer API, in one edit that either lands whole or not at all.
//
//   node scripts/play-publish.mjs <images dir> [--dry-run] [--release <track>]
//
// <images dir> holds one folder per app language, each with a play/ folder of
// phone-N.png, tablet-N.png and feature.png (the output of store:compose).
// The key is the service account JSON, read from GOOGLE_SERVICE_ACCOUNT_KEY.
//
// A language's promo video is the YouTube link in its listing.json `video`
// field (Play takes no video files).
//
// --release <track> also rolls out the draft release saved on that track
// (alpha = closed testing), with release notes in every locale. Unless the
// app uses managed publishing, Google sends the commit for review on its own.
// --dry-run checks every file and prints the plan.
import { createSign } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PLAY } from './store-locales.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo.android.package;
const listing = JSON.parse(readFileSync(join(root, 'store/listing.json'), 'utf8'));
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${app}`;
const UPLOAD = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${app}`;

const args = process.argv.slice(2);
const images = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const track = args.includes('--release') ? args[args.indexOf('--release') + 1] : null;
if (!images || track === undefined) throw new Error('Usage: node scripts/play-publish.mjs <images dir> [--dry-run] [--release <track>]');

/** Play image type → the files that fill it, for one app language. */
function imagesFor(lang) {
  const dir = join(images, lang, 'play');
  const files = existsSync(dir) ? readdirSync(dir).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) : [];
  const pick = (prefix) => files.filter((f) => f.startsWith(prefix) && f.endsWith('.png')).map((f) => join(dir, f));
  const set = {
    phoneScreenshots: pick('phone-'),
    tenInchScreenshots: pick('tablet-'),
    featureGraphic: pick('feature'),
    icon: [join(root, 'assets/store-icon-512.png')],
  };
  if (set.phoneScreenshots.length < 2 || set.featureGraphic.length !== 1) {
    throw new Error(`${dir}: needs at least 2 phone-N.png and one feature.png`);
  }
  return set;
}

// Check everything before touching the store.
const plan = Object.entries(PLAY).flatMap(([lang, locales]) => {
  const copy = listing[lang];
  const text = { title: copy.name, shortDescription: copy.shortDescription, fullDescription: copy.description, video: copy.video };
  const set = imagesFor(lang);
  return locales.map((language) => ({ language, text, set, notes: copy.releaseNotes }));
});
for (const { language, set } of plan) {
  console.log(`${language}: ${Object.entries(set).map(([type, f]) => `${f.length} ${type}`).join(', ')}`);
}
if (dryRun) process.exit(0);

const token = await accessToken(JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? 'null'));
const call = async (method, url, body, type = 'application/json') => {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body && { 'Content-Type': type }) },
    body: body && type === 'application/json' ? JSON.stringify(body) : body,
  });
  if (!res.ok) throw new Error(`${method} ${url.replace(API, '').replace(UPLOAD, '')}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
};

const { id } = await call('POST', `${API}/edits`);
const edit = `${API}/edits/${id}`;
try {
  for (const { language, text, set } of plan) {
    await call('PUT', `${edit}/listings/${language}`, { language, ...text });
    for (const [type, files] of Object.entries(set)) {
      await call('DELETE', `${edit}/listings/${language}/${type}`);
      for (const file of files) {
        await call('POST', `${UPLOAD}/edits/${id}/listings/${language}/${type}?uploadType=media`, readFileSync(file), 'image/png');
      }
    }
    console.log(`✓ ${language}`);
  }
  if (track) {
    const { releases = [] } = await call('GET', `${edit}/tracks/${track}`);
    const draft = releases.find((r) => r.status === 'draft');
    if (!draft) throw new Error(`No draft release on the ${track} track`);
    const releaseNotes = plan.map(({ language, notes }) => ({ language, text: notes }));
    await call('PUT', `${edit}/tracks/${track}`, { track, releases: [{ ...draft, status: 'completed', releaseNotes }] });
    console.log(`✓ ${draft.name} rolls out on ${track}`);
  }
  await call('POST', `${edit}:commit`);
  console.log('Committed.');
} catch (error) {
  await call('DELETE', edit).catch(() => {});
  throw error;
}

/** OAuth access token for a service account, via a signed JWT (no SDK needed). */
async function accessToken(key) {
  if (!key?.client_email || !key?.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is missing or not a service account JSON');
  const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: key.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: key.token_uri, iat: now, exp: now + 3600 };
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claims)}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
  const res = await fetch(key.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  if (!res.ok) throw new Error(`Token: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}
