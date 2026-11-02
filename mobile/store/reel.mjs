// Cuts the promo reel and the App Store preview from record.mjs's flow.
//
//   node store/reel.mjs REC_DIR OUT_DIR [locale ...]
//
// Writes, per language:
//   reel.mp4      1080×1920, about 20 s: title card, the app in a phone with a
//                 caption per step, end card. For social (Reels, Shorts, Status).
//   reel-wide.mp4 1920×1080, the same cut side by side: the caption left, the
//                 phone right. For Play, whose promo player is landscape and
//                 won't play a vertical video, which YouTube files as a Short.
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
const PHONE_RATIO = 2796 / 1290;
const INTRO = 2.2;
const OUTRO = 2.8;

/** Where the phone and the captions sit, for each cut. */
const LAYOUTS = {
  reel: (() => {
    const W = 1080, H = 1920, phoneW = 700, phoneH = Math.round(phoneW * PHONE_RATIO);
    const phoneY = H - phoneH - 70;
    return { W, H, phoneW, phoneH, phoneX: (W - phoneW) / 2, phoneY, cap: `left:90px;right:90px;top:0;height:${phoneY - 20}px` };
  })(),
  'reel-wide': (() => {
    const W = 1920, H = 1080, phoneH = 940, phoneW = Math.round(phoneH / PHONE_RATIO);
    const phoneX = 1340 - phoneW / 2;
    return { W, H, phoneW, phoneH, phoneX, phoneY: (H - phoneH) / 2, cap: `left:150px;width:${phoneX - 260}px;top:0;bottom:0` };
  })(),
};

const css = (L) => `
  @font-face { font-family: G; src: url(${fonts}/Geist-Medium.ttf); font-weight: 500; }
  @font-face { font-family: G; src: url(${fonts}/Geist-Regular.ttf); font-weight: 400; }
  * { margin: 0; box-sizing: border-box; }
  html, body { width: ${L.W}px; height: ${L.H}px; background: transparent; color: #fff; font-family: G, 'Noto Sans SC', sans-serif; }
  .mark { width: 132px; height: 132px; }
`;
const MARK = '<svg class="mark" viewBox="0 0 512 512"><path d="M104 128H408L332 236H180Z" fill="#fff"/><path d="M104 384H408L332 276H180Z" fill="#fff"/></svg>';

const caption = (L, text) => `<style>${css(L)}
  div { position: absolute; ${L.cap}; display: flex; align-items: center; }
  h1 { font-weight: 500; font-size: 88px; line-height: 1.04; letter-spacing: -2.5px; }</style><div><h1>${text}</h1></div>`;
const card = (L, title, sub, foot = '') => `<style>${css(L)}
  body { background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 44px; text-align: center; padding: 0 100px; }
  h1 { font-weight: 500; font-size: 92px; line-height: 1.05; letter-spacing: -3px; }
  p { color: #a6a6a6; font-size: 44px; line-height: 1.3; }
  small { position: absolute; bottom: 140px; color: #a6a6a6; font-size: 34px; letter-spacing: 1px; }</style>
  ${MARK}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}${foot ? `<small>${foot}</small>` : ''}`;
// Rounded screen corners and a thin bezel, as a mask and a ring, sized to the phone.
const mask = (L) => {
  const r = Math.round(L.phoneW * 0.12);
  return `<style>${css(L)} body{background:#000} div{position:absolute;left:0;top:0;width:${L.phoneW}px;height:${L.phoneH}px;border-radius:${r}px;background:#fff}</style><div></div>`;
};
const ring = (L) => {
  const b = Math.round(L.phoneW * 0.023), r = Math.round(L.phoneW * 0.12) + b;
  return `<style>${css(L)} div{position:absolute;left:${L.phoneX - b}px;top:${L.phoneY - b}px;width:${L.phoneW + 2 * b}px;height:${L.phoneH + 2 * b}px;border-radius:${r}px;border:${b}px solid #1c1c1c;box-shadow:0 0 0 2px rgba(255,255,255,.14)}</style><div></div>`;
};

const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(html, file, size) {
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

  const caps = [
    [beats.home, beats.purpose, head('1-home')],
    [beats.purpose, beats.working, head('2-purpose')],
    [beats.working, beats.done, head('7-private')],
    [beats.done, dur, head('5-done')],
  ];
  for (const [name, L] of Object.entries(LAYOUTS)) {
    const full = { width: L.W, height: L.H };
    await png(card(L, c.name.split(/[:：]/)[0], head('1-home')), join(tmp, 'intro.png'), full);
    await png(card(L, 'Compresso', c.subtitle), join(tmp, 'outro.png'), full);
    await png(mask(L), join(tmp, 'mask.png'), { width: L.phoneW, height: L.phoneH });
    await png(ring(L), join(tmp, 'ring.png'), full);
    for (const [i, [, , text]] of caps.entries()) await png(caption(L, text), join(tmp, `cap${i}.png`), full);

    // Middle: the phone with captions, on black.
    const inputs = ['-i', flow, '-loop', '1', '-i', join(tmp, 'mask.png'), '-loop', '1', '-i', join(tmp, 'ring.png')];
    caps.forEach((_, i) => inputs.push('-loop', '1', '-i', join(tmp, `cap${i}.png`)));
    let graph = `color=black:s=${L.W}x${L.H}:r=30:d=${dur}[bg];`
      + `[0:v]scale=${L.phoneW}:${L.phoneH}:flags=lanczos,format=rgba[v];[1:v]format=gray,scale=${L.phoneW}:${L.phoneH}[m];`
      + `[v][m]alphamerge[phone];[bg][phone]overlay=${L.phoneX}:${L.phoneY}[a];[a][2:v]overlay=0:0[s0];`;
    caps.forEach(([from, to], i) => {
      const a = Math.max(0, from);
      graph += `[${3 + i}:v]format=rgba,fade=t=in:st=${a}:d=0.35:alpha=1,fade=t=out:st=${Math.max(a, to - 0.3)}:d=0.3:alpha=1[c${i}];`
        + `[s${i}][c${i}]overlay=0:0:enable='between(t,${a},${to})'[s${i + 1}];`;
    });
    graph += `[s${caps.length}]trim=duration=${dur},setsar=1,format=yuv420p[out]`;
    ff([...inputs, '-filter_complex', graph, '-map', '[out]', '-r', '30', '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', join(tmp, 'middle.mp4')]);

    const still = (img, d, file) => ff(['-loop', '1', '-i', img, '-t', String(d), '-vf', `scale=${L.W}:${L.H},setsar=1,format=yuv420p`, '-r', '30', '-c:v', 'libx264', '-crf', '17', join(tmp, file)]);
    still(join(tmp, 'intro.png'), INTRO, 'intro.mp4');
    still(join(tmp, 'outro.png'), OUTRO, 'outro.mp4');

    const x = 0.45;
    ff(['-i', join(tmp, 'intro.mp4'), '-i', join(tmp, 'middle.mp4'), '-i', join(tmp, 'outro.mp4'),
      '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
      '-filter_complex', `[0:v][1:v]xfade=transition=fade:duration=${x}:offset=${INTRO - x}[ab];`
        + `[ab][2:v]xfade=transition=fade:duration=${x}:offset=${INTRO + dur - 2 * x}[v]`,
      '-map', '[v]', '-map', '3:a', '-shortest', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', join(out, `${name}.mp4`)]);
  }

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
