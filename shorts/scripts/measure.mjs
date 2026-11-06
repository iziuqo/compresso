// Runs every result in photos.json through the real app, its web build: the
// photo, a tap on the purpose, "Make it lighter", "Save". Keeps what the app
// saved (public/out/<id>.<ext>) and the sizes in src/measured.json. A result
// marked `recording` is also filmed in every language in locales/
// (public/out/<id>-<lang>.mp4), with the moments of its taps. So every number
// and app screen in a Short is real.
//
//   (cd ../mobile && npx expo export --platform web)   then serve mobile/dist on 8765
//   node scripts/measure.mjs
//
// The web build encodes with the browser's canvas, on the same recipes as the
// phones (mobile/src/engine/presets.ts). Frames come from the DevTools
// screencast at full device resolution, as in mobile/store/record.mjs.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { results, root } from './shared.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const URL = process.env.APP_URL ?? 'http://localhost:8765/';
const PHONE = { width: 430, height: 932, scale: 3 }; // the store kit's phone
const out = join(root, 'public/out');
const locales = readdirSync(join(root, 'locales')).map((f) => basename(f, '.json'));
mkdirSync(out, { recursive: true });

/** Records the page until stop(); frames arrive only on change, so each is held until the next. */
async function screencast(ctx, page) {
  const dir = mkdtempSync(join(tmpdir(), 'shorts-'));
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = join(dir, `${String(frames.length).padStart(5, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, at: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: PHONE.width * PHONE.scale, maxHeight: PHONE.height * PHONE.scale });
  return async (file) => {
    const end = Date.now() / 1000;
    await cdp.send('Page.stopScreencast');
    const list = frames.map((f, i) => `file '${f.file}'\nduration ${((frames[i + 1]?.at ?? end) - f.at).toFixed(4)}`);
    writeFileSync(join(dir, 'frames.txt'), `${list.join('\n')}\nfile '${frames.at(-1).file}'\n`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(dir, 'frames.txt'),
      '-vf', `fps=60,scale=${PHONE.width * PHONE.scale}:${PHONE.height * PHONE.scale}:flags=lanczos,format=yuv420p`,
      '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', file]);
    rmSync(dir, { recursive: true, force: true });
    return frames[0].at;
  };
}

// The Shorts cut from the tap on the purpose to the result in four beats at
// 120 BPM, so the result lands on the beat. The second run times its "Make it
// lighter" tap from the first run's encode time; the recording stays real time.
const TAP_TO_DONE = 2;

/**
 * One pass through the app in `locale`: tap the purpose, wait `gap` s, tap
 * "Make it lighter", wait for the result. With `save`, keeps the app's file as
 * public/out/<save>.<ext>; with `flow`, records the screen from just before
 * the tap to after the result.
 */
async function run({ photo, purpose, locale, gap, save, flow }) {
  const t = require(`../../mobile/src/i18n/locales/${locale}.json`);
  const ctx = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height }, deviceScaleFactor: PHONE.scale, colorScheme: 'dark', hasTouch: true,
  });
  // Message is the app's default, so the tap on any other purpose shows on camera.
  await ctx.addInitScript((locale) => localStorage.setItem('compresso.prefs', JSON.stringify({
    locale, appearance: 'dark', introSeen: true, lastPurpose: 'message', uploadLimit: 1000000, lastSaved: 0,
  })), locale);
  const page = await ctx.newPage();
  await page.goto(URL);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: t['home.choose'] }).click();
  await (await chooser).setFiles(join(root, 'public/photos', `${photo}.jpg`));
  await page.getByText(t['purpose.title']).waitFor();
  await page.waitForTimeout(800); // the thumbnail settles

  const stop = flow && await screencast(ctx, page);
  const moment = {};
  const mark = (name) => { moment[name] = Date.now() / 1000; };
  await page.waitForTimeout(700);
  mark('tap');
  await page.getByRole('radio', { name: new RegExp(`^${t[`purpose.${purpose}.name`]}\\.`) }).click();
  await page.waitForTimeout(gap * 1000);
  mark('go');
  await page.getByRole('button', { name: t['purpose.goOne'] }).click();
  await page.getByRole('button', { name: t['job.again'] }).waitFor({ timeout: 180000 });
  mark('done');
  await page.waitForTimeout(2500);
  const start = stop ? await stop(join(root, 'public', flow)) : moment.tap;

  let file;
  if (save) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: t['job.save'] }).click();
    const saved = await download;
    file = `out/${save}${extname(saved.suggestedFilename()) || '.jpg'}`;
    await saved.saveAs(join(root, 'public', file));
  }
  await ctx.close();
  const at = Object.fromEntries(Object.entries(moment).map(([k, v]) => [k, Number((v - start).toFixed(3))]));
  return { file, at, work: moment.done - moment.go };
}

const browser = await chromium.launch();
const measured = {};
for (const [id, { photo, purpose, recording }] of Object.entries(results)) {
  const { file, work } = await run({ photo, purpose, locale: 'en', gap: 0.9, save: id });
  const result = { photo, purpose, from: statSync(join(root, 'public/photos', `${photo}.jpg`)).size, to: statSync(join(root, 'public', file)).size, file };
  if (recording) {
    result.flows = {};
    for (const locale of locales) {
      const flow = `out/${id}-${locale}.mp4`;
      const { at } = await run({ photo, purpose, locale, gap: Math.max(0.6, TAP_TO_DONE - work), flow });
      result.flows[locale] = { flow, at };
    }
  }
  measured[id] = result;
  console.log(id, JSON.stringify(result));
}
await browser.close();
writeFileSync(join(root, 'src/measured.json'), `${JSON.stringify(measured, null, 2)}\n`);
