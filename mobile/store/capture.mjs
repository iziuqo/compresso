// Captures the real app screens for the store listings, in every language.
//
// Drives the web build (same React Native screens, rendered by react-native-web)
// at each store device size. Before submission, re-shoot on simulators from the
// EAS build so status bars and system fonts are pixel-exact.
//
//   npx expo export --platform web && npx serve dist -l 8765
//   node store/capture.mjs PHOTO_DIR OUT_DIR [locale ...]
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Playwright is a tool here, not an app dependency: use the one installed on the machine.
const { chromium } = createRequire(import.meta.url)('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const [photoDir, outDir, ...only] = process.argv.slice(2);
const photos = readdirSync(photoDir).filter((f) => /\.jpe?g$/i.test(f)).sort().map((f) => join(photoDir, f));
const LOCALES = only.length ? only : ['en', 'es', 'fr', 'de', 'it', 'pt-BR', 'zh-Hans'];
const BROWSER_LOCALE = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', 'pt-BR': 'pt-BR', 'zh-Hans': 'zh-CN' };
// iPhone 6.9" (1290×2796) and iPad 13" (2064×2752), both in points × scale.
const DEVICES = [
  { id: 'phone', width: 430, height: 932, scale: 3 },
  { id: 'tablet', width: 1032, height: 1376, scale: 2 },
];
const URL = process.env.APP_URL ?? 'http://localhost:8765/';

const browser = await chromium.launch();
for (const locale of LOCALES) {
  const t = JSON.parse(readFileSync(join(here, '../src/i18n/locales', `${locale}.json`), 'utf8'));
  for (const device of DEVICES) {
    for (const scheme of ['dark', 'light']) {
      const dir = join(outDir, locale, device.id, scheme);
      mkdirSync(dir, { recursive: true });
      const ctx = await browser.newContext({
        viewport: { width: device.width, height: device.height }, deviceScaleFactor: device.scale,
        locale: BROWSER_LOCALE[locale], colorScheme: scheme, hasTouch: true, reducedMotion: 'no-preference',
      });
      await ctx.addInitScript(([l, s]) => {
        if (localStorage.getItem('compresso.prefs')) return;
        localStorage.setItem('compresso.prefs', JSON.stringify({
          locale: l, appearance: s, introSeen: true, lastPurpose: 'message', uploadLimit: 1000000, lastSaved: 0,
        }));
      }, [locale, scheme]);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(URL);
      await page.waitForTimeout(3200); // the size story finishes counting down
      await page.screenshot({ path: join(dir, '1-home.png') });

      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: t['home.choose'] }).click();
      await (await chooser).setFiles(photos);
      await page.getByText(t['purpose.title']).waitFor();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: join(dir, '2-purpose.png') });

      await page.getByRole('radio').nth(2).click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(dir, '3-upload.png') });
      await page.getByRole('radio').nth(0).click();

      await page.getByRole('button', { name: t['purpose.go'] }).click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: join(dir, '4-working.png') });
      await page.getByRole('button', { name: t['job.again'] }).waitFor({ timeout: 120000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: join(dir, '5-done.png') });

      await page.getByRole('button', { name: t['job.again'] }).click();
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: t['home.settings'] }).click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(dir, '6-settings.png') });

      // The privacy promise, as the intro tells it.
      await page.evaluate(() => {
        const prefs = JSON.parse(localStorage.getItem('compresso.prefs'));
        localStorage.setItem('compresso.prefs', JSON.stringify({ ...prefs, introSeen: false }));
      });
      await page.goto(URL);
      await page.waitForTimeout(1200);
      for (let i = 0; i < 2; i++) {
        await page.getByRole('button', { name: t['intro.next'] }).click();
        await page.waitForTimeout(500);
      }
      await page.screenshot({ path: join(dir, '7-private.png') });

      if (errors.length) console.warn(locale, device.id, scheme, errors.slice(0, 3));
      console.log('captured', locale, device.id, scheme);
      await ctx.close();
    }
  }
}
await browser.close();
