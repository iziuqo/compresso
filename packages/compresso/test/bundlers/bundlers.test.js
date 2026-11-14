/**
 * Tests what ships: packs the npm tarball, checks it with publint and attw,
 * and installs it into seven small apps (test/bundlers/apps.js), one per
 * bundler. Each app is built with the bundler's defaults, opened in
 * Chromium, and run through the support matrix: main-thread JPEG, pool JPEG
 * on real workers, pool HEIC, main-thread HEIC. Expected failures live in
 * KNOWN_FAILURES like every other test's. Run `npm run build`, then
 * `npm run test:bundlers`; a dist/ older than src/ fails the run.
 */
import { execFile } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { publint } from 'publint';
import { checkPackage, createPackageFromTarballData } from '@arethetypeswrong/core';
import { MATRIX, NOT_RUN, tracked } from '../support/known-failures.js';
import { serveStatic } from '../support/static-server.js';
import { APPS } from './apps.js';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = join(HERE, '../..');
const FIXTURES = join(HERE, '../fixtures');
const OUT = join(HERE, '.out');
const CHECKS = MATRIX.slice(2);
const CHECK_TIMEOUT_MS = 20_000;
const itTracked = tracked(it, 'chromium');
const WINDOWS = process.platform === 'win32';

/** The line of an error (or a build's output) that says what went wrong. */
function reason(error) {
  const lines = String(error?.stderr || error?.message || error).split('\n').map((line) => line.trim()).filter(Boolean);
  return (lines.find((line) => /error|failed to|cannot|invalid/i.test(line)) ?? lines[0] ?? 'failed').slice(0, 200);
}

/** Runs one check in the page, settling to `ok`, its error message, or a timeout. */
const runCheck = ([name, ms]) => Promise.race([
  window.checks[name]().then(() => 'ok'),
  new Promise((resolve) => setTimeout(resolve, ms, `timed out after ${ms / 1000} s`)),
]).catch((error) => String(error?.message ?? error));

/**
 * Opens `url` in a fresh page and, once `window.checks` is there, runs
 * `use(page)`. Resolves to `{ load }`, `ok` or why the page failed to load,
 * and `result`, what `use` returned or why it failed. The page always closes,
 * so a check that timed out can't touch the next one.
 */
async function withPage(url, use) {
  const page = await browser.newPage();
  const crashes = [];
  page.on('pageerror', (error) => crashes.push(reason(error)));
  try {
    try {
      await page.goto(url);
      await page.waitForFunction(() => window.checks, null, { timeout: 10_000 });
    } catch (error) {
      return { load: crashes[0] ?? reason(error) };
    }
    if (crashes.length) return { load: crashes[0] };
    return { load: 'ok', result: await use(page).catch(reason) };
  } finally {
    await page.close();
  }
}

/** The newest modification time of any file under `dir`, in ms. */
async function newest(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return Math.max(...entries.filter((e) => e.isFile()).map((e) => statSync(join(e.parentPath ?? e.path, e.name)).mtimeMs));
}

let tarball;
let browser;

beforeAll(async () => {
  if (!existsSync(join(PACKAGE, 'dist/compresso.mjs'))) throw new Error('dist/ is missing: run `npm run build` first');
  if (await newest(join(PACKAGE, 'src')) > await newest(join(PACKAGE, 'dist'))) throw new Error('dist/ is older than src/: run `npm run build` first');
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const { stdout } = await run('npm', ['pack', '--pack-destination', OUT, '--silent'], { cwd: PACKAGE });
  tarball = join(OUT, stdout.trim().split('\n').pop());
  // Install it as the apps' `compresso.js`, exactly as npm unpacks it.
  const installed = join(HERE, 'node_modules/compresso.js');
  await rm(installed, { recursive: true, force: true });
  await mkdir(installed, { recursive: true });
  await run('tar', ['-xzf', tarball, '-C', installed, '--strip-components=1']);
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
});

afterAll(() => browser?.close());

describe('the packed tarball', () => {
  itTracked('package/publint', 'passes publint', async () => {
    const { messages } = await publint({ pkgDir: join(HERE, 'node_modules/compresso.js') });
    const errors = messages.filter((m) => m.type === 'error').map((m) => `${m.code} ${m.path.join(' ')}`).sort();
    expect(errors, 'publint errors').toEqual([]);
  });

  itTracked('package/attw', 'resolves with types under every module resolution (attw)', async () => {
    const result = await checkPackage(createPackageFromTarballData(new Uint8Array(await readFile(tarball))));
    const problems = result.problems
      .map((p) => [p.kind, p.entrypoint ?? (p.typesFileName ?? p.fileName)?.replace('/node_modules/compresso.js/', ''), p.resolutionKind]
        .filter(Boolean).join(' '))
      .sort();
    expect(problems, 'attw problems').toEqual([]);
  });
});

describe('seven bundler apps in Chromium', () => {
  for (const app of APPS) {
    itTracked(`bundler/${app.name}`, `${app.name}: builds, loads and passes every check`, async () => {
      const outcome = Object.fromEntries(MATRIX.map((column) => [column, NOT_RUN]));
      const dir = join(HERE, '.apps', app.name);
      await rm(dir, { recursive: true, force: true });
      await mkdir(dir, { recursive: true });
      await cp(join(HERE, 'app.js'), join(dir, 'app.js'));
      for (const [name, text] of Object.entries(app.files ?? {})) await writeFile(join(dir, name), text);

      const [tool, ...args] = app.build;
      try {
        await run(join(HERE, 'node_modules/.bin', WINDOWS ? `${tool}.cmd` : tool), args, {
          cwd: dir, env: { ...process.env, NODE_ENV: 'production' }, maxBuffer: 64 * 1024 * 1024, shell: WINDOWS,
        });
        if (app.page) await writeFile(join(dir, 'out/index.html'), app.page);
        outcome.build = 'ok';
      } catch (error) {
        outcome.build = reason(error);
      }

      if (outcome.build === 'ok') {
        const server = await serveStatic({ '/fixtures/': FIXTURES, '/': join(dir, 'out') });
        try {
          const url = `http://127.0.0.1:${server.address().port}/`;
          ({ load: outcome.load } = await withPage(url, async () => 'ok'));
          for (const check of outcome.load === 'ok' ? CHECKS : []) {
            const { load, result } = await withPage(url, (page) => page.evaluate(runCheck, [check, CHECK_TIMEOUT_MS]));
            outcome[check] = load === 'ok' ? result : `page failed to load: ${load}`;
          }
        } finally {
          server.close();
        }
      }

      expect(outcome, `${app.name}: every cell of its support-matrix row`).toEqual(Object.fromEntries(MATRIX.map((column) => [column, 'ok'])));
    });
  }
});
