// Turns the raw captures from capture.mjs into finished store images:
// a localized headline over the real screen, set in the app's own type.
//
//   node store/compose.mjs RAW_DIR OUT_DIR [locale ...]
//
// Writes, per language:
//   ios/phone-*.png      1290×2796  App Store iPhone 6.9"
//   ios/tablet-*.png     2064×2752  App Store iPad 13"
//   play/phone-*.png     1242×2208  Google Play phone (9:16)
//   play/tablet-*.png    2064×2752  Google Play 7" and 10" tablet
//   play/feature.png     1024×500   Google Play feature graphic
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const [rawDir, outDir, ...only] = process.argv.slice(2);
const listing = JSON.parse(readFileSync(join(here, 'listing.json'), 'utf8'));
const LOCALES = only.length ? only : Object.keys(listing);
const fonts = pathToFileURL(join(here, '../assets/fonts')).href;
const scheme = process.env.SCHEME ?? 'dark';

const TARGETS = [
  { store: 'ios', id: 'phone', w: 1290, h: 2796, src: 'phone', status: true },
  { store: 'ios', id: 'tablet', w: 2064, h: 2752, src: 'tablet', status: true },
  { store: 'play', id: 'phone', w: 1242, h: 2208, src: 'phone', status: true },
  { store: 'play', id: 'tablet', w: 2064, h: 2752, src: 'tablet', status: true },
];

const INK = scheme === 'dark'
  ? { bg: '#000', ink: '#fff', ink2: '#a6a6a6', bezel: '#1c1c1c', line: 'rgba(255,255,255,.14)' }
  : { bg: '#f3f3f3', ink: '#000', ink2: '#545454', bezel: '#d9d9d9', line: 'rgba(0,0,0,.12)' };

const base = `
  @font-face { font-family: G; src: url(${fonts}/Geist-Regular.ttf); font-weight: 400; }
  @font-face { font-family: G; src: url(${fonts}/Geist-Medium.ttf); font-weight: 500; }
  @font-face { font-family: G; src: url(${fonts}/Geist-SemiBold.ttf); font-weight: 600; }
  * { margin: 0; box-sizing: border-box; }
  body { font-family: G, 'Noto Sans SC', sans-serif; background: ${INK.bg}; color: ${INK.ink}; overflow: hidden; }
`;

/** One store image: headline block on top, the phone or tablet below. */
function shot({ w, h, status }, img, headline, sub, lang) {
  const tablet = w / h > 0.6;
  const pad = Math.round(w * 0.075);
  const head = Math.round(w * (tablet ? 0.05 : 0.082));
  const capH = Math.round(h * (tablet ? 0.19 : 0.205));
  // The whole screen must show, footer and all: size the device to the space left.
  const [b, r, st, aspect] = tablet ? [0.018, 0.045, 0.03, 1376 / 1032] : [0.03, 0.13, 0.12, 932 / 430];
  const top = capH + Math.round(h * 0.012);
  const frameW = Math.min(w * (tablet ? 0.8 : 0.84), (h - top - h * 0.03) / ((1 - 2 * b) * aspect + st + 2 * b));
  const bezel = Math.round(frameW * b);
  const radius = Math.round(frameW * r);
  const statusH = Math.round(frameW * st);
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${base}
    .cap { position: absolute; top: 0; left: 0; right: 0; height: ${capH}px; padding: 0 ${pad}px;
      display: flex; flex-direction: column; justify-content: flex-end; gap: ${Math.round(head * 0.32)}px; padding-bottom: ${Math.round(h * 0.03)}px; }
    h1 { font-weight: 500; font-size: ${head}px; line-height: 1.06; letter-spacing: ${lang === 'zh-Hans' ? 0 : -head * 0.035}px; }
    p { color: ${INK.ink2}; font-size: ${Math.round(head * 0.42)}px; line-height: 1.3; }
    .dev { position: absolute; left: 50%; transform: translateX(-50%); top: ${top}px; width: ${frameW}px;
      background: ${INK.bezel}; border-radius: ${radius + bezel}px; padding: ${bezel}px; box-shadow: 0 0 0 1px ${INK.line}; }
    .screen { border-radius: ${radius}px; overflow: hidden; background: ${scheme === 'dark' ? '#000' : '#fff'}; position: relative; }
    .status { height: ${statusH}px; display: flex; align-items: center; justify-content: space-between;
      padding: 0 ${statusH * (tablet ? 0.9 : 0.62)}px; padding-top: ${tablet ? 0 : statusH * 0.12}px;
      color: ${scheme === 'dark' ? '#fff' : '#000'}; font-weight: 600; font-size: ${statusH * (tablet ? 0.42 : 0.3)}px; }
    .island { position: absolute; top: ${statusH * 0.2}px; left: 50%; transform: translateX(-50%); width: ${frameW * 0.29}px;
      height: ${statusH * 0.52}px; border-radius: 999px; background: #000; display: ${tablet ? 'none' : 'block'}; }
    .icons { display: flex; gap: ${statusH * 0.1}px; align-items: center; }
    .bat { width: ${statusH * 0.4}px; height: ${statusH * 0.19}px; border-radius: ${statusH * 0.05}px; border: ${Math.max(2, statusH * 0.02)}px solid currentColor; padding: ${statusH * 0.02}px; }
    .bat i { display: block; height: 100%; width: 80%; background: currentColor; border-radius: 2px; }
    .bars { display: flex; gap: ${statusH * 0.03}px; align-items: flex-end; height: ${statusH * 0.19}px; }
    .bars b { width: ${statusH * 0.045}px; background: currentColor; border-radius: 1px; }
    .screen img { display: block; width: 100%; }
  </style></head><body style="width:${w}px;height:${h}px">
    <div class="cap"><h1>${headline}</h1><p>${sub}</p></div>
    <div class="dev"><div class="screen">
      ${status ? `<div class="status"><span>9:41</span><div class="island"></div>
        <span class="icons"><span class="bars"><b style="height:35%"></b><b style="height:55%"></b><b style="height:75%"></b><b style="height:100%"></b></span>
        <span class="bat"><i></i></span></span></div>` : ''}
      <img src="${img}">
    </div></div>
  </body></html>`;
}

function feature(c, lang) {
  const mark = '<svg viewBox="0 0 512 512" width="120" height="120"><path d="M104 128H408L332 236H180Z" fill="#fff"/><path d="M104 384H408L332 276H180Z" fill="#fff"/></svg>';
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${base}
    body { background: #000; color: #fff; display: flex; align-items: center; gap: 56px; padding: 0 80px; }
    h1 { font-weight: 500; font-size: 64px; letter-spacing: -2px; line-height: 1.05; }
    p { color: #a6a6a6; font-size: 30px; margin-top: 16px; }
  </style></head><body style="width:1024px;height:500px">${mark}<div><h1>Compresso</h1><p>${c.subtitle}</p></div></body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
// A file page, so it may load the local captures and fonts.
const tmp = join(outDir, '.frame.html');
mkdirSync(outDir, { recursive: true });
async function render(html) {
  writeFileSync(tmp, html);
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}
for (const lang of LOCALES) {
  const c = listing[lang];
  for (const target of TARGETS) {
    const dir = join(outDir, lang, target.store);
    mkdirSync(dir, { recursive: true });
    for (const [i, s] of c.screenshots.entries()) {
      const img = pathToFileURL(join(rawDir, lang, target.src, scheme, `${s.screen}.png`)).href;
      await page.setViewportSize({ width: target.w, height: target.h });
      await render(shot(target, img, s.headline, s.sub, lang));
      await page.screenshot({ path: join(dir, `${target.id}-${i + 1}.png`) });
    }
  }
  await page.setViewportSize({ width: 1024, height: 500 });
  await render(feature(c, lang));
  await page.screenshot({ path: join(outDir, lang, 'play', 'feature.png') });
  console.log('composed', lang);
}
rmSync(tmp, { force: true });
await browser.close();
