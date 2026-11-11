// Runs every result in photos.json through the real app, its web build: the
// photo (or, for a result with `photos`, the whole batch), a tap on the
// purpose, "Make it lighter", "Save". Keeps what the app saved
// (public/out/<id>[-<n>].<ext>) and the sizes in src/measured.json. A result
// with a `limit` sets the upload form's size limit first. A result marked
// `recording` is also filmed in every language in locales/, or only in the
// languages it lists (public/out/<id>-<lang>.mp4), with the moments of its
// taps. A result marked `preselected` opens with its purpose already chosen,
// so the only tap on camera is "Make it lighter". So every number and app
// screen in a Short is real. A result with a `tour` is filmed as one take on
// a clock instead (09): starting on the purpose `from`, each purpose in
// `taps` is tapped at its second, "Make it lighter" at `go`, and the
// before/after slider is dragged across on each second in `compare`, until
// `end`. A result with an `app` is measured on the web build served there.
//
//   (cd ../mobile && npx expo export --platform web)   then serve mobile/dist on 8765
//   node scripts/measure.mjs [id ...]     only these results; the rest of measured.json stays
//
// The web build encodes with the browser's canvas, on the same recipes as the
// phones (mobile/src/engine/presets.ts). Frames come from the DevTools
// screencast at full device resolution, as in mobile/store/record.mjs.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
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
 * "Make it lighter", wait for the result. With `save`, keeps the app's files
 * as public/out/<save>.<ext> (one photo) or <save>-<n>.<ext> (a batch); with
 * `flow`, records the screen from just before the tap to after the result.
 */
async function run({ photos, purpose, limit = 1000000, preselected = false, locale, gap, save, flow, tour, app = URL }) {
  const t = require(`../../mobile/src/i18n/locales/${locale}.json`);
  const ctx = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height }, deviceScaleFactor: PHONE.scale, colorScheme: 'dark', hasTouch: true,
  });
  // Message is the app's default, so the tap on any other purpose shows on camera, unless it is preselected.
  await ctx.addInitScript(({ locale, limit, last }) => localStorage.setItem('compresso.prefs', JSON.stringify({
    locale, appearance: 'dark', introSeen: true, lastPurpose: last, uploadLimit: limit, lastSaved: 0,
  })), { locale, limit, last: tour?.from ?? (preselected ? purpose : 'message') });
  await ctx.addInitScript(() => {
    window.saved = [];
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (!this.hasAttribute('download')) return click.call(this);
      window.saved.push(this.href);
    };
  });
  const page = await ctx.newPage();
  await page.goto(app);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: t['home.choose'] }).click();
  await (await chooser).setFiles(photos.map((photo) => join(root, 'public/photos', `${photo}.jpg`)));
  await page.getByText(t['purpose.title']).waitFor();
  await page.waitForTimeout(800); // the thumbnail settles

  const stop = flow && await screencast(ctx, page);
  const moment = {};
  const mark = (name) => { moment[name] = Date.now() / 1000; };
  const tap = (p) => page.getByRole('radio', { name: new RegExp(`^${t[`purpose.${p}.name`]}\\.`) }).click();
  const go = async () => {
    mark('go');
    await page.getByRole('button', { name: t[photos.length > 1 ? 'purpose.go' : 'purpose.goOne'] }).click();
    await page.getByRole('button', { name: t['job.again'] }).waitFor({ timeout: 180000 });
    mark('done');
  };
  if (tour) {
    // One take on a clock: every moment at its second from the start of the recording.
    const t0 = Date.now() / 1000;
    const until = (s) => page.waitForTimeout(Math.max(0, (t0 + s - Date.now() / 1000) * 1000));
    for (const [i, [p, s]] of tour.taps.entries()) { await until(s); mark(`tap${i}`); await tap(p); }
    await until(tour.go);
    await go();
    // The slider sweeps from side to side, a sweep on each beat, starting from the middle.
    const box = await page.getByRole('slider', { name: t['job.compare'] }).boundingBox();
    const y = box.y + box.height / 2;
    let x = box.x + box.width / 2;
    for (const [i, s] of tour.compare.entries()) {
      await until(s);
      mark(`compare${i}`);
      const to = box.x + box.width * (i % 2 ? 0.85 : 0.15);
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(to, y, { steps: 18 }); await page.mouse.up();
      x = to;
    }
    await until(tour.end);
  } else {
    await page.waitForTimeout(700);
    if (!preselected) {
      mark('tap');
      await tap(purpose);
      await page.waitForTimeout(gap * 1000);
    }
    await go();
    await page.waitForTimeout(2500);
  }
  const start = stop ? await stop(join(root, 'public', flow)) : moment.tap;

  const files = [];
  if (save) {
    // The web build saves each photo by clicking a download link to its blob.
    // Chromium allows ten such downloads at once, so the init script below
    // collects the links instead, and the files are read straight from them.
    await page.getByRole('button', { name: t[photos.length > 1 ? 'job.saveAll' : 'job.save'] }).click();
    const saved = await page.evaluate(() => Promise.all(window.saved.map(async (href) => {
      const blob = await (await fetch(href)).blob();
      return { type: blob.type, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())) };
    })));
    for (const [i, { type, bytes }] of saved.entries()) {
      const file = `out/${save}${photos.length > 1 ? `-${i + 1}` : ''}.${type.split('/')[1]}`;
      writeFileSync(join(root, 'public', file), Buffer.from(bytes));
      files.push(file);
    }
  }
  await ctx.close();
  const at = Object.fromEntries(Object.entries(moment).map(([k, v]) => [k, Number((v - start).toFixed(3))]));
  return { files, at, work: moment.done - moment.go };
}

const ids = process.argv.slice(2);
const measuredPath = join(root, 'src/measured.json');
const measured = ids.length ? JSON.parse(readFileSync(measuredPath, 'utf8')) : {};
const browser = await chromium.launch();
const size = (file) => statSync(join(root, file)).size;
for (const [id, { photo, photos = [photo], purpose, limit, preselected, recording, tour, app }] of Object.entries(results).filter(([id]) => !ids.length || ids.includes(id))) {
  const { files, work } = await run({ photos, purpose, limit, preselected, locale: 'en', gap: 0.9, save: id, app });
  const from = photos.map((p) => size(`public/photos/${p}.jpg`));
  const to = files.map((f) => size(`public/${f}`));
  const sum = (sizes) => sizes.reduce((a, b) => a + b, 0);
  const result = photo
    ? { photo, purpose, from: from[0], to: to[0], file: files[0] }
    : { photos, purpose, from: sum(from), to: sum(to), items: photos.map((p, i) => ({ photo: p, from: from[i], to: to[i], file: files[i] })) };
  if (limit) result.limit = limit;
  if (recording) {
    result.flows = {};
    for (const locale of Array.isArray(recording) ? recording : locales) {
      const flow = `out/${id}-${locale}.mp4`;
      const { at } = await run({ photos, purpose, limit, preselected, locale, gap: Math.max(0.6, TAP_TO_DONE - work), flow, tour, app });
      result.flows[locale] = { flow, at };
    }
  }
  measured[id] = result;
  console.log(id, JSON.stringify(result));
}
await browser.close();
writeFileSync(measuredPath, `${JSON.stringify(measured, null, 2)}\n`);
