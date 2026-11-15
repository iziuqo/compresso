/**
 * Runs the device lab page (lab/index.html) the way a phone would open it: a
 * static server for this package, the page at /lab/, and `?report=` pointing
 * back at the server, which takes the finished report as a POST. Each of the
 * page's checks is then one case per browser, keyed `lab/<check>`, so known
 * failures live in KNOWN_FAILURES like every other test's. Run with
 * `npm run test:lab` after `npm run build`.
 *
 * By default it opens the page in Playwright's Chromium, Firefox and WebKit;
 * LAB_BROWSERS=chromium,firefox limits them and CHROMIUM_PATH picks another
 * Chromium. With LAB_OPEN set it opens the page with that command instead, the
 * URL appended, and names the browser LAB_ENV: CI opens iPhone Safari with
 * LAB_OPEN="xcrun simctl openurl <device>" and LAB_ENV=ios-26.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as playwright from 'playwright';
import { tracked } from '../support/known-failures.js';
import { serveStatic } from '../support/static-server.js';

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '../..');
/** The folder of the installed heic-to's own build, served at /heic-to/ as the page's import map expects. */
const HEIC_TO = dirname(createRequire(import.meta.url).resolve('heic-to'));
const { LAB_OPEN, LAB_ENV } = process.env;
if (LAB_OPEN && !LAB_ENV) throw new Error('LAB_OPEN needs LAB_ENV, the browser name KNOWN_FAILURES uses (for example ios-26)');
const ENGINES = LAB_OPEN ? [LAB_ENV] : (process.env.LAB_BROWSERS ?? 'chromium,firefox,webkit').split(',').map((name) => name.trim()).filter(Boolean);
// checks.mjs imports dist/, so say what is missing before importing it.
if (!existsSync(join(PACKAGE, 'dist/compresso.mjs'))) throw new Error('dist/ is missing: run `npm run build` first');
const { CHECKS } = await import('../../lab/checks.mjs');
// Every check has its own timeout inside the page: all of them, plus room to load.
const REPORT_TIMEOUT_MS = CHECKS.reduce((sum, check) => sum + check.timeout, 0) + 2 * 60_000;
/** Reports POSTed to /report?run=<engine>, by run, as they arrive. */
const waiting = new Map();

/** Takes the page's finished report, POSTed to /report?run=<engine>. */
function takeReport(request, response, url) {
  if (request.method !== 'POST' || url.pathname !== '/report') return false;
  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => { body += chunk; });
  request.on('end', () => {
    response.writeHead(204).end();
    waiting.get(url.searchParams.get('run'))?.(body);
  });
  return true;
}

/** The report the page POSTs for `run`, parsed; rejects if it never comes, or through `fail`. */
function reportFor(run) {
  let fail;
  const report = new Promise((resolve, reject) => {
    fail = reject;
    const timer = setTimeout(() => reject(new Error(`no report from ${run} in ${REPORT_TIMEOUT_MS / 60_000} min`)), REPORT_TIMEOUT_MS);
    waiting.set(run, (body) => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error(`${run} posted a report that isn't JSON: ${error.message}`));
      }
    });
  });
  return { report, fail };
}

/**
 * Opens `url` in `engine`: with LAB_OPEN's command, or in a Playwright browser.
 * Calls `fail` if the browser goes away before reporting; returns a close().
 */
async function open(engine, url, fail) {
  if (LAB_OPEN) {
    const [command, ...args] = LAB_OPEN.split(' ').filter(Boolean);
    const opener = spawn(command, [...args, url], { stdio: 'inherit' });
    opener.on('error', (error) => fail(new Error(`LAB_OPEN failed to start: ${error.message}`)));
    opener.on('exit', (code) => code && fail(new Error(`LAB_OPEN exited with ${code}`)));
    return () => {};
  }
  const browser = await playwright[engine].launch(engine === 'chromium' && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  page.on('crash', () => fail(new Error(`the page crashed in ${engine}`)));
  await page.goto(url);
  return () => browser.close();
}

let server;
let origin;

beforeAll(async () => {
  server = await serveStatic({ '/': PACKAGE, '/heic-to/': HEIC_TO }, takeReport);
  origin = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => server?.close());

for (const engine of ENGINES) {
  describe(`the device lab in ${engine}`, () => {
    const itTracked = tracked(it, engine);
    let close;
    let report;

    beforeAll(async () => {
      const received = reportFor(engine);
      close = await open(engine, `${origin}/lab/?report=${encodeURIComponent(`${origin}/report?run=${engine}`)}`, received.fail);
      report = await received.report;
      console.log(`${engine}: ${report.env.browser.name} ${report.env.browser.version}, ${report.summary.passed} of ${report.checks.length} checks passed`);
    }, REPORT_TIMEOUT_MS + 60_000);

    afterAll(() => close?.());

    it('loads the library and reports every check, in order, with no page errors', () => {
      expect(report.library, 'the library loads').toMatchObject({ loaded: true });
      expect(report.pageErrors, 'errors and unhandled rejections on the page').toEqual([]);
      expect(report.checks.map((check) => check.name), 'checks reported').toEqual(CHECKS.map((check) => check.name));
    });

    for (const check of CHECKS) {
      itTracked(`lab/${check.name}`, `${check.name}: ${check.title}`, () => {
        const row = report.checks.find((r) => r.name === check.name);
        expect(row, `lab/${check.name} is in the report`).toBeDefined();
        // The finding is in the message, so a KNOWN_FAILURES entry matches only a failure that names it.
        const why = row.error ?? row.summary ?? JSON.stringify(row.details);
        expect(row.pass, `lab/${check.name} [${row.finding ?? 'no known finding'}]: ${why}`).toBe(true);
      });
    }
  });
}
