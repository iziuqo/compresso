// Runs every result in photos.json through the real app, its web build: the
// photo, a tap on the purpose, "Make it lighter", "Save". Keeps what the app
// saved (public/out/<id>.<ext>), a screen recording of the taps and the result
// (public/out/<id>-flow.mp4), and the sizes and the recording's moments in
// src/measured.json. So every number and app screen in a Short is real.
//
//   (cd ../mobile && npx expo export --platform web)   then serve mobile/dist on 8765
//   node scripts/measure.mjs
//
// The web build encodes with the browser's canvas, on the same recipes as the
// phones (mobile/src/engine/presets.ts). Frames come from the DevTools
// screencast at full device resolution, as in mobile/store/record.mjs.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { results, root } from './shared.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const t = require('../../mobile/src/i18n/locales/en.json');
const URL = process.env.APP_URL ?? 'http://localhost:8765/';
const PHONE = { width: 430, height: 932, scale: 3 }; // the store kit's phone
const out = join(root, 'public/out');
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
 * One pass through the app: tap the purpose, wait `gap` s, tap "Make it
 * lighter", wait for the result, save it as `id` in public/out. With `flow`,
 * records the screen from just before the tap to after the result.
 */
async function run(id, photo, purpose, gap, flow) {
  const ctx = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height }, deviceScaleFactor: PHONE.scale, colorScheme: 'dark', hasTouch: true,
  });
  // Message is the app's default, so the tap on any other purpose shows on camera.
  await ctx.addInitScript(() => localStorage.setItem('compresso.prefs', JSON.stringify({
    locale: 'en', appearance: 'dark', introSeen: true, lastPurpose: 'message', uploadLimit: 1000000, lastSaved: 0,
  })));
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

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: t['job.save'] }).click();
  const saved = await download;
  const file = `out/${id}${extname(saved.suggestedFilename()) || '.jpg'}`;
  await saved.saveAs(join(root, 'public', file));
  await ctx.close();
  const at = Object.fromEntries(Object.entries(moment).map(([k, v]) => [k, Number((v - start).toFixed(3))]));
  return { file, at, work: moment.done - moment.go };
}

const browser = await chromium.launch();
const measured = {};
for (const [id, { photo, purpose }] of Object.entries(results)) {
  const first = await run(id, photo, purpose, 0.9);
  const flow = `out/${id}-flow.mp4`;
  const { file, at } = await run(id, photo, purpose, Math.max(0.6, TAP_TO_DONE - first.work), flow);
  const original = join(root, 'public/photos', `${photo}.jpg`);
  measured[id] = { photo, purpose, from: statSync(original).size, to: statSync(join(root, 'public', file)).size, file, flow, at };
  console.log(id, measured[id]);
}
await browser.close();
writeFileSync(join(root, 'src/measured.json'), `${JSON.stringify(measured, null, 2)}\n`);
