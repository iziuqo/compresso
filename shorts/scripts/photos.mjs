// Downloads every photo in photos.json from Wikimedia Commons into
// public/photos/<id>.jpg, byte for byte, and checks each against the SHA-1
// Commons publishes, so the "before" size on screen is the real original.
//
//   node scripts/photos.mjs [id ...]     only these photos; by default all of them
//
// Commons rate-limits busy addresses with 429 + Retry-After; we wait it out.
// Behind a proxy, run with NODE_USE_ENV_PROXY=1.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { photos, root } from './shared.mjs';

const dir = join(root, 'public/photos');
const headers = { 'User-Agent': 'CompressoShorts/0.1 (https://compresso.izaias.xyz)' };
const sha1 = (buf) => createHash('sha1').update(buf).digest('hex');

async function get(url) {
  for (;;) {
    const res = await fetch(url, { headers });
    if (res.ok) return res;
    if (res.status !== 429) throw new Error(`${res.status} ${url}`);
    // At least a minute between tries: a shared address must not add to the load.
    const wait = Math.max(60, Number(res.headers.get('retry-after') ?? 0) + 5);
    console.log(`rate-limited, retrying in ${wait} s`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
}

mkdirSync(dir, { recursive: true });
const only = process.argv.slice(2);
for (const [id, { commons }] of Object.entries(photos).filter(([id]) => !only.length || only.includes(id))) {
  const file = join(dir, `${id}.jpg`);
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|sha1&titles='
    + encodeURIComponent(`File:${commons}`);
  const [info] = Object.values((await (await get(api)).json()).query.pages)[0].imageinfo;
  if (existsSync(file) && sha1(readFileSync(file)) === info.sha1) continue;
  const buf = Buffer.from(await (await get(info.url)).arrayBuffer());
  if (sha1(buf) !== info.sha1) throw new Error(`${id}: download does not match Commons' checksum`);
  writeFileSync(file, buf);
  console.log(id, buf.length, 'bytes');
}
