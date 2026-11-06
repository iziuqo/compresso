// Runs every result in photos.json through the real app, its web build: the
// photo, the purpose, "Make it lighter", "Save". Keeps what the app saved in
// public/out/<id>.<ext>, the purpose and done screens as the app drew them
// (public/out/<id>-purpose.png, -done.png), and the sizes in
// src/measured.json. So every number and app screen in a Short is real.
//
//   (cd ../mobile && npx expo export --platform web)   then serve mobile/dist on 8765
//   node scripts/measure.mjs
//
// The web build encodes with the browser's canvas, on the same recipes as the
// phones (mobile/src/engine/presets.ts).
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';
import { results, root } from './shared.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const t = require('../../mobile/src/i18n/locales/en.json');
const URL = process.env.APP_URL ?? 'http://localhost:8765/';
const out = join(root, 'public/out');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const measured = {};
for (const [id, { photo, purpose }] of Object.entries(results)) {
  // The phone the store kit records on (store/record.mjs): 430×932 at 3×.
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, colorScheme: 'dark' });
  await ctx.addInitScript((p) => localStorage.setItem('compresso.prefs', JSON.stringify({
    locale: 'en', appearance: 'dark', introSeen: true, lastPurpose: p, uploadLimit: 1000000, lastSaved: 0,
  })), purpose);
  const page = await ctx.newPage();
  await page.goto(URL);
  const original = join(root, 'public/photos', `${photo}.jpg`);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: t['home.choose'] }).click();
  await (await chooser).setFiles(original);
  await page.getByRole('radio', { name: new RegExp(`^${t[`purpose.${purpose}.name`]}\\.`) }).click();
  await page.waitForTimeout(600); // let the selection settle before the screenshot
  await page.screenshot({ path: join(out, `${id}-purpose.png`) });
  await page.getByRole('button', { name: t['purpose.goOne'] }).click();
  await page.getByRole('button', { name: t['job.again'] }).waitFor({ timeout: 180000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(out, `${id}-done.png`) });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: t['job.save'] }).click();
  const saved = await download;
  const file = `out/${id}${extname(saved.suggestedFilename()) || '.jpg'}`;
  await saved.saveAs(join(root, 'public', file));
  measured[id] = { photo, purpose, from: statSync(original).size, to: statSync(join(root, 'public', file)).size, file };
  console.log(id, measured[id]);
  await ctx.close();
}
await browser.close();
writeFileSync(join(root, 'src/measured.json'), `${JSON.stringify(measured, null, 2)}\n`);
