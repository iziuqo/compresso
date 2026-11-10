// Finds photos worth using on Wikimedia Commons: for each search in
// candidates.json, the CC0 and public-domain JPEGs of a useful size, as
// small previews in public/candidates/<search>/ with what is known about
// each in public/candidates/<search>.json, to look at before picking one
// for photos.json. Commons answers 429 to busy shared addresses, so this
// runs where photos.mjs runs.
//
//   node scripts/candidates.mjs            candidates.json: { "<search>": { "q": "...", "min": MB, "max": MB } }
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './shared.mjs';

const headers = { 'User-Agent': 'CompressoShorts/0.1 (https://compresso.izaias.xyz)' };
const FREE = /^(cc0|public domain|pd)/i;
const wanted = JSON.parse(readFileSync(join(root, 'candidates.json'), 'utf8'));
const dir = join(root, 'public/candidates');

async function get(url) {
  for (;;) {
    const res = await fetch(url, { headers });
    if (res.ok) return res;
    if (res.status !== 429) throw new Error(`${res.status} ${url}`);
    await new Promise((r) => setTimeout(r, 60_000));
  }
}

for (const [name, { q, min = 2, max = 12 }] of Object.entries(wanted)) {
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=40'
    + '&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=480&gsrsearch=' + encodeURIComponent(q);
  const pages = Object.values((await (await get(api)).json()).query?.pages ?? {});
  const found = pages
    .map(({ title, imageinfo: [i] }) => ({ title: title.replace(/^File:/, ''), bytes: i.size, width: i.width, height: i.height, mime: i.mime, thumb: i.thumburl,
      licence: i.extmetadata?.LicenseShortName?.value ?? '', author: (i.extmetadata?.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim() }))
    .filter((c) => c.mime === 'image/jpeg' && FREE.test(c.licence) && c.bytes >= min * 1e6 && c.bytes <= max * 1e6 && c.width >= 2400)
    .slice(0, 12);
  mkdirSync(join(dir, name), { recursive: true });
  for (const [n, c] of found.entries()) writeFileSync(join(dir, name, `${n}.jpg`), Buffer.from(await (await get(c.thumb)).arrayBuffer()));
  writeFileSync(join(dir, `${name}.json`), JSON.stringify(found, null, 2) + '\n');
  console.log(name, found.length);
}
