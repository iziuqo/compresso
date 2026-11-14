/**
 * Runs the device lab page (lab/index.html) in Playwright's Chromium, Firefox
 * and WebKit, the way a phone would open it: a static server for this
 * package, the page at /lab/, and `?report=` pointing back at the server,
 * which takes the finished report as a POST. Each of the page's checks is
 * then one case per engine, keyed `lab/<check>`, so known failures live in
 * KNOWN_FAILURES like every other test's. Run with `npm run test:lab` after
 * `npm run build`; LAB_BROWSERS=chromium,firefox limits the engines and
 * CHROMIUM_PATH picks another Chromium.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as playwright from 'playwright';
import { tracked } from '../support/known-failures.js';
import { serveStatic } from '../support/static-server.js';

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ENGINES = (process.env.LAB_BROWSERS ?? 'chromium,firefox,webkit').split(',').map((name) => name.trim()).filter(Boolean);
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

/** The report the page POSTs for `run`, parsed; rejects when the page crashes or never reports. */
function reportFor(run, page) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no report from ${run} in ${REPORT_TIMEOUT_MS / 60_000} min`)), REPORT_TIMEOUT_MS);
    page.on('crash', () => reject(new Error(`the page crashed in ${run}`)));
    waiting.set(run, (body) => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error(`${run} posted a report that isn't JSON: ${error.message}`));
      }
    });
  });
}

const launch = (engine) => playwright[engine].launch(engine === 'chromium' && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let server;
let origin;

beforeAll(async () => {
  server = await serveStatic({ '/': PACKAGE }, takeReport);
  origin = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => server?.close());

for (const engine of ENGINES) {
  describe(`the device lab in ${engine}`, () => {
    const itTracked = tracked(it, engine);
    let browser;
    let report;

    beforeAll(async () => {
      browser = await launch(engine);
      const page = await browser.newPage();
      const received = reportFor(engine, page);
      await page.goto(`${origin}/lab/?report=${encodeURIComponent(`${origin}/report?run=${engine}`)}`);
      report = await received;
      console.log(`${engine}: ${report.env.browser.name} ${report.env.browser.version}, ${report.summary.passed} of ${report.checks.length} checks passed`);
    }, REPORT_TIMEOUT_MS + 60_000);

    afterAll(() => browser?.close());

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
