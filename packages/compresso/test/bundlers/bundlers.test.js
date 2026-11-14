/**
 * Tests what ships: packs the npm tarball, checks it with publint and attw,
 * and installs it into seven small apps (test/bundlers/apps.js), one per
 * bundler. Each app is built with the bundler's defaults, opened in
 * Chromium, and run through the support matrix: main-thread JPEG, pool JPEG
 * on real workers, pool HEIC, main-thread HEIC. Expected failures live in
 * KNOWN_FAILURES like every other test's. Run with `npm run test:bundlers`,
 * which builds first.
 */
import { execFile } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { publint } from 'publint';
import { checkPackage, createPackageFromTarballData } from '@arethetypeswrong/core';
import { MATRIX, NOT_RUN, tracked } from '../support/known-failures.js';
import { APPS } from './apps.js';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = join(HERE, '../..');
const FIXTURES = join(HERE, '../fixtures');
const OUT = join(HERE, '.out');
const CHECKS = MATRIX.slice(2);
const CHECK_TIMEOUT_MS = 20_000;
const itTracked = tracked(it, 'chromium');

/** The line of an error (or a build's output) that says what went wrong. */
function reason(error) {
  const lines = String(error?.stderr || error?.message || error).split('\n').map((line) => line.trim()).filter(Boolean);
  return (lines.find((line) => /error|failed to|cannot|invalid/i.test(line)) ?? lines[0] ?? 'failed').slice(0, 200);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.jpg': 'image/jpeg', '.heic': 'image/heic' };

/** A static server for one app's output, with the test fixtures at /fixtures/. */
function serve(root) {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
    let file = path.startsWith('/fixtures/') ? join(FIXTURES, path.slice(10)) : join(root, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) return response.writeHead(404).end();
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let tarball;
let browser;

beforeAll(async () => {
  if (!existsSync(join(PACKAGE, 'dist/compresso.mjs'))) throw new Error('dist/ is missing: run `npm run build` first');
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
        await run(join(HERE, 'node_modules/.bin', tool), args, { cwd: dir, env: { ...process.env, NODE_ENV: 'production' } });
        if (app.page) await writeFile(join(dir, 'out/index.html'), app.page);
        outcome.build = 'ok';
      } catch (error) {
        outcome.build = reason(error);
      }

      if (outcome.build === 'ok') {
        const server = await serve(join(dir, 'out'));
        const page = await browser.newPage();
        const crashes = [];
        page.on('pageerror', (error) => crashes.push(reason(error)));
        try {
          await page.goto(`http://127.0.0.1:${server.address().port}/`);
          await page.waitForFunction(() => window.checks, null, { timeout: 10_000 });
          outcome.load = crashes[0] ?? 'ok';
        } catch (error) {
          outcome.load = crashes[0] ?? reason(error);
        }
        if (outcome.load === 'ok') {
          for (const check of CHECKS) {
            outcome[check] = await page.evaluate(([name, ms]) => Promise.race([
              window.checks[name]().then(() => 'ok'),
              new Promise((resolve) => setTimeout(resolve, ms, `timed out after ${ms / 1000} s`)),
            ]).catch((error) => String(error?.message ?? error)), [check, CHECK_TIMEOUT_MS]);
          }
        }
        await page.close();
        server.close();
      }

      expect(outcome, `${app.name}: every cell of its support-matrix row`).toEqual(Object.fromEntries(MATRIX.map((column) => [column, 'ok'])));
    });
  }
});
