// Records the real app flow for the promo reel and the App Store preview.
//
//   node store/record.mjs PHOTO_DIR OUT_DIR [locale ...]
//
// Writes OUT_DIR/<locale>/flow.mp4 (1290×2796, 30 fps) and flow.json, the
// time in seconds at which each beat starts, so reel.mjs can time captions.
// Frames come from the DevTools screencast at full device resolution; the
// built-in video recorder only captures at 1× and would look soft.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const [photoDir, outDir, ...only] = process.argv.slice(2).map((a, i) => (i < 2 ? resolve(a) : a));
const photos = readdirSync(photoDir).filter((f) => /\.jpe?g$/i.test(f)).sort().map((f) => join(photoDir, f));
const LOCALES = only.length ? only : ['en', 'es', 'fr', 'de', 'it', 'pt-BR', 'zh-Hans'];
const URL = process.env.APP_URL ?? 'http://localhost:8765/';
const W = 430;
const H = 932;

const browser = await chromium.launch();
for (const locale of LOCALES) {
  const t = JSON.parse(readFileSync(join(here, '../src/i18n/locales', `${locale}.json`), 'utf8'));
  const dir = join(outDir, locale);
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 3, colorScheme: 'dark', hasTouch: true,
  });
  await ctx.addInitScript((l) => {
    if (localStorage.getItem('compresso.prefs')) return;
    localStorage.setItem('compresso.prefs', JSON.stringify({
      locale: l, appearance: 'dark', introSeen: true, lastPurpose: 'message', uploadLimit: 1000000, lastSaved: 0,
    }));
  }, locale);
  const page = await ctx.newPage();
  const framesDir = join(dir, 'frames');
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = join(framesDir, `${String(frames.length).padStart(5, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, at: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * 3, maxHeight: H * 3 });
  const t0 = Date.now();
  const beats = {};
  const mark = (name) => { beats[name] = (Date.now() - t0) / 1000; };

  await page.goto(URL);
  mark('home');
  await page.waitForTimeout(3400);

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: t['home.choose'] }).click();
  await (await chooser).setFiles(photos);
  await page.getByText(t['purpose.title']).waitFor();
  mark('purpose');
  await page.waitForTimeout(1300);
  await page.getByRole('radio').nth(1).click();
  await page.waitForTimeout(700);
  await page.getByRole('radio').nth(0).click();
  await page.waitForTimeout(900);

  await page.getByRole('button', { name: t['purpose.go'] }).click();
  mark('working');
  await page.getByRole('button', { name: t['job.again'] }).waitFor({ timeout: 120000 });
  mark('done');
  await page.waitForTimeout(1600);

  // Drag the compare seam: left, right, then back to the middle.
  const seam = page.getByRole('slider').first(); // react-native-web's role for "adjustable"
  const box = await seam.boundingBox().catch(() => null);
  if (box) {
    const y = box.y + box.height / 2;
    const mid = box.x + box.width / 2;
    await page.mouse.move(mid, y);
    await page.mouse.down();
    for (const x of [mid - box.width * 0.35, mid + box.width * 0.35, mid]) {
      await page.mouse.move(x, y, { steps: 14 });
      await page.waitForTimeout(250);
    }
    await page.mouse.up();
  }
  mark('compared');
  await page.waitForTimeout(1500);
  mark('end');

  const stopAt = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await ctx.close();
  // Frames arrive only when something changes: hold each until the next one.
  const start = frames[0].at;
  const list = frames.map((f, i) => {
    const next = frames[i + 1]?.at ?? stopAt;
    return `file '${f.file}'\nduration ${(next - f.at).toFixed(4)}`;
  });
  writeFileSync(join(dir, 'frames.txt'), `${list.join('\n')}\nfile '${frames.at(-1).file}'\n`);
  // Beats were measured from navigation; shift them onto the video's clock.
  const offset = (start * 1000 - t0) / 1000;
  for (const k of Object.keys(beats)) beats[k] = Math.max(0, beats[k] - offset);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(dir, 'frames.txt'),
    '-vf', 'fps=30,scale=1290:2796:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '16', '-preset', 'slow',
    join(dir, 'flow.mp4')]);
  rmSync(framesDir, { recursive: true, force: true });
  writeFileSync(join(dir, 'flow.json'), `${JSON.stringify(beats, null, 2)}\n`);
  console.log('recorded', locale, beats);
}
await browser.close();
