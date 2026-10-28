// Cuts the promo reel and the App Store preview from record.mjs's flow.
//
//   node store/reel.mjs REC_DIR OUT_DIR [locale ...]
//
// Writes, per language:
//   reel.mp4      1080×1920, about 20 s: title card, the app in a phone with a
//                 caption per step, end card. For Play (via YouTube) and social.
//   preview.mp4   886×1920, the app alone, 15+ s, for the App Store, which
//                 accepts only footage captured from the app itself.
// Both carry a silent stereo track; the stores reject video with no audio stream.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const [recDir, outDir, ...only] = process.argv.slice(2);
const listing = JSON.parse(readFileSync(join(here, 'listing.json'), 'utf8'));
const LOCALES = only.length ? only : Object.keys(listing);
const fonts = pathToFileURL(join(here, '../assets/fonts')).href;
const W = 1080;
const H = 1920;
const PHONE_W = 700;
const PHONE_H = Math.round((PHONE_W * 2796) / 1290);
const PHONE_Y = H - PHONE_H - 70;
const INTRO = 2.2;
const OUTRO = 2.8;

const css = `
  @font-face { font-family: G; src: url(${fonts}/Geist-Medium.ttf); font-weight: 500; }
  @font-face { font-family: G; src: url(${fonts}/Geist-Regular.ttf); font-weight: 400; }
  * { margin: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; background: transparent; color: #fff; font-family: G, 'Noto Sans SC', sans-serif; }
  .mark { width: 132px; height: 132px; }
`;
const MARK = '<svg class="mark" viewBox="0 0 512 512"><path d="M104 128H408L332 236H180Z" fill="#fff"/><path d="M104 384H408L332 276H180Z" fill="#fff"/></svg>';

const caption = (text) => `<style>${css}
  div { position: absolute; left: 90px; right: 90px; top: 0; height: ${PHONE_Y - 20}px; display: flex; align-items: center; }
  h1 { font-weight: 500; font-size: 88px; line-height: 1.04; letter-spacing: -2.5px; }</style><div><h1>${text}</h1></div>`;
const card = (title, sub, foot = '') => `<style>${css}
  body { background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 44px; text-align: center; padding: 0 100px; }
  h1 { font-weight: 500; font-size: 92px; line-height: 1.05; letter-spacing: -3px; }
  p { color: #a6a6a6; font-size: 44px; line-height: 1.3; }
  small { position: absolute; bottom: 140px; color: #a6a6a6; font-size: 34px; letter-spacing: 1px; }</style>
  ${MARK}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}${foot ? `<small>${foot}</small>` : ''}`;
// Rounded screen corners and a thin bezel, as a mask and a ring.
const mask = `<style>${css} body{background:#000} div{position:absolute;left:0;top:0;width:${PHONE_W}px;height:${PHONE_H}px;border-radius:84px;background:#fff}</style><div></div>`;
const ring = `<style>${css} div{position:absolute;left:${(W - PHONE_W) / 2 - 16}px;top:${PHONE_Y - 16}px;width:${PHONE_W + 32}px;height:${PHONE_H + 32}px;border-radius:100px;border:16px solid #1c1c1c;box-shadow:0 0 0 2px rgba(255,255,255,.14)}</style><div></div>`;

const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
async function png(html, file, size = { width: W, height: H }) {
  const tmp = `${file}.html`;
  writeFileSync(tmp, `<!doctype html><meta charset="utf-8">${html}`);
  await page.setViewportSize(size);
  await page.goto(pathToFileURL(tmp).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, omitBackground: true });
  rmSync(tmp);
}

for (const lang of LOCALES) {
  const c = listing[lang];
  const src = join(recDir, lang);
  const out = join(outDir, lang);
  const tmp = join(out, '.parts');
  mkdirSync(tmp, { recursive: true });
  const beats = JSON.parse(readFileSync(join(src, 'flow.json'), 'utf8'));
  const flow = join(src, 'flow.mp4');
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', flow]).toString());
  const head = (screen) => c.screenshots.find((s) => s.screen === screen).headline;

  await png(card(c.name.split(/[:：]/)[0], head('1-home')), join(tmp, 'intro.png'));
  await png(card('Compresso', c.subtitle), join(tmp, 'outro.png'));
  await png(mask, join(tmp, 'mask.png'), { width: PHONE_W, height: PHONE_H });
  await png(ring, join(tmp, 'ring.png'));
  const caps = [
    [beats.home, beats.purpose, head('1-home')],
    [beats.purpose, beats.working, head('2-purpose')],
    [beats.working, beats.done, head('7-private')],
    [beats.done, dur, head('5-done')],
  ];
  for (const [i, [, , text]] of caps.entries()) await png(caption(text), join(tmp, `cap${i}.png`));

  // Middle: the phone with captions, on black.
  const inputs = ['-i', flow, '-loop', '1', '-i', join(tmp, 'mask.png'), '-loop', '1', '-i', join(tmp, 'ring.png')];
  caps.forEach((_, i) => inputs.push('-loop', '1', '-i', join(tmp, `cap${i}.png`)));
  let graph = `color=black:s=${W}x${H}:r=30:d=${dur}[bg];`
    + `[0:v]scale=${PHONE_W}:${PHONE_H}:flags=lanczos,format=rgba[v];[1:v]format=gray,scale=${PHONE_W}:${PHONE_H}[m];`
    + `[v][m]alphamerge[phone];[bg][phone]overlay=${(W - PHONE_W) / 2}:${PHONE_Y}[a];[a][2:v]overlay=0:0[s0];`;
  caps.forEach(([from, to], i) => {
    const a = Math.max(0, from);
    graph += `[${3 + i}:v]format=rgba,fade=t=in:st=${a}:d=0.35:alpha=1,fade=t=out:st=${Math.max(a, to - 0.3)}:d=0.3:alpha=1[c${i}];`
      + `[s${i}][c${i}]overlay=0:0:enable='between(t,${a},${to})'[s${i + 1}];`;
  });
  graph += `[s${caps.length}]trim=duration=${dur},setsar=1,format=yuv420p[out]`;
  ff([...inputs, '-filter_complex', graph, '-map', '[out]', '-r', '30', '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', join(tmp, 'middle.mp4')]);

  const still = (img, d, name) => ff(['-loop', '1', '-i', img, '-t', String(d), '-vf', `scale=${W}:${H},setsar=1,format=yuv420p`, '-r', '30', '-c:v', 'libx264', '-crf', '17', join(tmp, name)]);
  still(join(tmp, 'intro.png'), INTRO, 'intro.mp4');
  still(join(tmp, 'outro.png'), OUTRO, 'outro.mp4');

  const x = 0.45;
  ff(['-i', join(tmp, 'intro.mp4'), '-i', join(tmp, 'middle.mp4'), '-i', join(tmp, 'outro.mp4'),
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-filter_complex', `[0:v][1:v]xfade=transition=fade:duration=${x}:offset=${INTRO - x}[ab];`
      + `[ab][2:v]xfade=transition=fade:duration=${x}:offset=${INTRO + dur - 2 * x}[v]`,
    '-map', '[v]', '-map', '3:a', '-shortest', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', join(out, 'reel.mp4')]);

  // App Store preview: footage only, held at the end so it runs at least 15 s.
  const hold = Math.max(0.5, 15.5 - dur);
  ff(['-i', flow, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-vf', `scale=886:1920:flags=lanczos,tpad=stop_mode=clone:stop_duration=${hold},setsar=1,format=yuv420p`,
    '-map', '0:v', '-map', '1:a', '-shortest', '-r', '30', '-c:v', 'libx264', '-profile:v', 'high', '-crf', '17',
    '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', join(out, 'preview.mp4')]);

  rmSync(tmp, { recursive: true, force: true });
  console.log('cut', lang);
}
await browser.close();
