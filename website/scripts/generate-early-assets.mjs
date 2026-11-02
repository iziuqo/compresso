import sharp from 'sharp';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LOCALE_SLUGS } from '../src/lib/locale-routes.js';
import { sentences } from '../src/lib/text.js';

/**
 * Images for the early-access page (/<locale>/early/) and its invite email,
 * cut from the store kit so the page always shows the screens that ship.
 *
 *   node scripts/generate-early-assets.mjs /path/to/store-kit [en pt-BR …]
 *
 * Naming locales redoes only those; the AVIF encode is slow, about a minute
 * per screen, so a copy fix need not wait for all seven.
 *
 *   node scripts/generate-early-assets.mjs --previews [en pt-BR …]
 *
 * redraws only og.jpg from the screens already in public/early/, for when the
 * headline changed and the screens did not (no store kit needed).
 *
 * Per locale, into public/early/<slug>/:
 *   <screen>.avif / .webp  the device frame from each App Store shot, without
 *                          the headline above it (the page sets its own type)
 *   compare.jpg            the same frame for email clients, which take no AVIF
 *   og.jpg                 1200×630 link preview; WhatsApp and Reddit show it
 * Once, into public/early/:
 *   mark.png               the wordmark for the email header (email has no SVG)
 *
 * Needs Playwright with Chromium, and Noto Sans SC installed for Chinese, the
 * same as the store kit itself (mobile/store/README.md).
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/early');
const [kit, ...only] = process.argv.slice(2);
if (!kit) throw new Error('usage: generate-early-assets.mjs <store-kit dir | --previews> [locale…]');
const previewsOnly = kit === '--previews';

/** Which App Store shot carries which screen. */
const SCREENS = { home: 1, purpose: 2, compare: 3, private: 5 };

/** The device frame inside every 1290×2796 store shot, measured, with a 9px
    margin so the frame's anti-aliased edge survives the cut. */
const FRAME = { left: 160, top: 597, width: 970, height: 2126 };
const WIDTH = 640; // drawn at ≤320 CSS px, so this is 2× for every screen
const EMAIL_WIDTH = 480; // drawn at 240px in the invite

/** Everything outside the frame's rounded corners turns transparent, so a
    phone in front of another covers it with glass, not with a black square. */
const ROUNDED = Buffer.from(
  `<svg width="${FRAME.width}" height="${FRAME.height}"><rect x="8" y="8" width="${FRAME.width - 16}" ` +
  `height="${FRAME.height - 16}" rx="168" fill="#fff"/></svg>`,
);

const AVIF = { quality: 58, effort: 6, chromaSubsampling: '4:4:4' };
const WEBP = { quality: 84, effort: 6, smartSubsample: true };
const JPEG = { quality: 84, mozjpeg: true, chromaSubsampling: '4:4:4' };

/** The app's own subset of Geist, so the preview is set in the shipping type. */
const font = (file) => pathToFileURL(join(ROOT, 'compresso-app/src/assets/fonts', file)).href;

/** The brand mark: two plates closing on each other (components/Logo.jsx). */
const LOGO = `<svg viewBox="0 0 24 24" fill="#fff"><path d="M3 3.6H21L16.5 10H7.5Z"/><path d="M3 20.4H21L16.5 14H7.5Z"/></svg>`;

const BASE_CSS = `
  @font-face { font-family: G; font-weight: 300; src: url(${font('geist-300.woff2')}); }
  @font-face { font-family: G; font-weight: 500; src: url(${font('geist-500.woff2')}); }
  @font-face { font-family: M; src: url(${font('geistmono-latin.woff2')}); }
  * { margin: 0; box-sizing: border-box; }
  body { background: #000; color: #fff; font-family: G, 'Noto Sans SC', sans-serif; -webkit-font-smoothing: antialiased; }
  .mark { display: flex; align-items: center; gap: 14px; font-weight: 500; letter-spacing: -0.005em; }
  .mark svg { display: block; }`;

/**
 * 1200×630, composed for the square crop. WhatsApp, and several other apps,
 * show only the centre 630×630 of a wide card, so everything that must be
 * read lives there: the mark, the label, the headline and the front phone.
 * The side phones sit in the outer bands, where a wide render adds them and a
 * square one loses nothing.
 */
const ogHtml = (t, dir) => `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
  body { width: 1200px; height: 630px; overflow: hidden; position: relative; text-align: center; }
  body::before { content: ''; position: absolute; left: 150px; top: -120px; width: 900px; height: 900px;
    background: radial-gradient(closest-side, rgb(255 255 255 / .09), transparent 72%); }
  .copy { position: absolute; left: 315px; top: 44px; width: 570px; display: flex; flex-direction: column; align-items: center; }
  .mark { font-size: 22px; } .mark svg { width: 22px; height: 22px; }
  .label { margin-top: 30px; font-size: 13px; font-weight: 500; letter-spacing: .16em; text-transform: uppercase; color: rgb(255 255 255 / .45); }
  :lang(zh) .label { letter-spacing: .06em; }
  h1 { margin-top: 14px; font-size: 46px; font-weight: 300; line-height: 1.04; letter-spacing: -0.04em; }
  :lang(zh) h1 { letter-spacing: 0; line-height: 1.22; font-size: 42px; }
  h1 span { display: block; }
  .phone { position: absolute; top: 330px; width: 232px; filter: brightness(.42); }
  .p1 { left: 252px; } .p3 { left: 716px; }
  .p2 { left: 470px; top: 286px; width: 260px; filter: drop-shadow(0 30px 60px rgb(0 0 0 / .8)); }
</style>
<body lang="${t.lang}">
  <div class="copy">
    <div class="mark">${LOGO}compresso</div>
    <div class="label">${t.early.label}</div>
    <h1>${sentences(t.early.title).map((l) => `<span>${l}</span>`).join('')}</h1>
  </div>
  <img class="phone p1" src="${dir}/home.webp">
  <img class="phone p3" src="${dir}/purpose.webp">
  <img class="phone p2" src="${dir}/compare.webp">
</body>`;

/** The email header: drawn at 2× of 132×24. */
const markHtml = `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
  body { width: 264px; height: 48px; display: flex; align-items: center; }
  .mark { font-size: 30px; gap: 14px; } .mark svg { width: 30px; height: 30px; }
</style><div class="mark">${LOGO}compresso</div>`;

async function cutScreens(lang, dir) {
  for (const [screen, n] of Object.entries(SCREENS)) {
    const cut = await sharp(join(kit, 'images', lang, 'ios', `phone-${n}.png`))
      .extract(FRAME)
      .ensureAlpha()
      .composite([{ input: ROUNDED, blend: 'dest-in' }])
      .png()
      .toBuffer();
    const frame = sharp(cut).resize({ width: WIDTH });
    await Promise.all([
      frame.clone().avif(AVIF).toFile(join(dir, `${screen}.avif`)),
      frame.clone().webp(WEBP).toFile(join(dir, `${screen}.webp`)),
      screen === 'compare' && sharp(cut).resize({ width: EMAIL_WIDTH }).flatten({ background: '#000' })
        .jpeg(JPEG).toFile(join(dir, 'compare.jpg')),
    ]);
  }
}

/** Renders a page to a file, so the type is set by the same engine as the site. */
async function render(page, html, path, size, type = 'jpeg') {
  const tmp = join(OUT, '.render.html');
  writeFileSync(tmp, html);
  await page.setViewportSize(size);
  await page.goto(pathToFileURL(tmp).href);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png', omitBackground: type === 'png' });
  rmSync(tmp);
  await (type === 'png' ? sharp(png).png({ compressionLevel: 9 }) : sharp(png).jpeg(JPEG)).toFile(path);
}

mkdirSync(OUT, { recursive: true });
// CHROMIUM_PATH points at a preinstalled browser when Playwright's own is absent
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();

for (const [locale, slug] of Object.entries(LOCALE_SLUGS)) {
  if (only.length && !only.includes(locale)) continue;
  const dir = join(OUT, slug);
  mkdirSync(dir, { recursive: true });
  if (!previewsOnly) await cutScreens(locale, dir);
  const { early } = JSON.parse(readFileSync(join(ROOT, 'src/i18n', `${locale}.json`), 'utf8'));
  const t = { early, lang: locale };
  await render(page, ogHtml(t, pathToFileURL(dir).href), join(dir, 'og.jpg'), { width: 1200, height: 630 });
  console.log(`[early] ${locale}`);
}
await render(page, markHtml, join(OUT, 'mark.png'), { width: 264, height: 48 }, 'png');

await browser.close();
console.log(`[early] wrote ${resolve(OUT)}`);
