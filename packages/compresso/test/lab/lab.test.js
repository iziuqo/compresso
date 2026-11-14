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
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as playwright from 'playwright';
import { tracked } from '../support/known-failures.js';
import { CHECKS } from '../../lab/checks.mjs';

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ENGINES = (process.env.LAB_BROWSERS ?? 'chromium,firefox,webkit').split(',').map((name) => name.trim()).filter(Boolean);
// Every check has its own timeout inside the page; this only catches a page that never reports.
const REPORT_TIMEOUT_MS = 10 * 60_000;
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.heic': 'image/heic', '.svg': 'image/svg+xml',
};

/** Reports POSTed to /report?run=<engine>, by run, as they arrive. */
const waiting = new Map();

/** The package as static files, plus POST /report. */
function serve() {
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://x');
    if (request.method === 'POST' && url.pathname === '/report') {
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        response.writeHead(204).end();
        waiting.get(url.searchParams.get('run'))?.(body);
      });
      return;
    }
    let file = join(PACKAGE, normalize(decodeURIComponent(url.pathname)));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) return response.writeHead(404).end();
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** The report the page POSTs for `run`, parsed; rejects when the page crashes or never reports. */
function reportFor(run, page) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no report from ${run} in ${REPORT_TIMEOUT_MS / 60_000} min`)), REPORT_TIMEOUT_MS);
    page.on('crash', () => reject(new Error(`the page crashed in ${run}`)));
    waiting.set(run, (body) => {
      clearTimeout(timer);
      resolve(JSON.parse(body));
    });
  });
}

const launch = (engine) => playwright[engine].launch(engine === 'chromium' && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let server;
let origin;

beforeAll(async () => {
  if (!existsSync(join(PACKAGE, 'dist/compresso.mjs'))) throw new Error('dist/ is missing: run `npm run build` first');
  server = await serve();
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

    it('loads the library and reports every check, in order', () => {
      expect(report.library, 'the library loads').toMatchObject({ loaded: true });
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
