import { defineConfig } from 'vitest/config';
import { normalizePath, searchForWorkspaceRoot } from 'vite';
import { playwright } from '@vitest/browser-playwright';
import { existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const BROWSERS = ['chromium', 'firefox', 'webkit'];

/** The browser suite, in real engines via Playwright, with `plugins` applied. */
const browserSuite = (name, plugins = []) => ({
  plugins,
  test: {
    name,
    include: ['test/browser/**/*.test.js'],
    // Fresh instance objects per project: Vitest names them in place.
    browser: { enabled: true, provider: playwright(), headless: true, instances: BROWSERS.map((browser) => ({ browser })) },
  },
});

/** The library's source folder, as Vite writes module ids. */
const SRC = `${normalizePath(resolve(import.meta.dirname, 'src'))}/`;
/** The built file that ships each source module the tests import. */
const SHIPPED = { 'pool.js': 'dist/compresso.pool.mjs', 'plan.js': 'dist/compresso.plan.mjs' };

/**
 * Points the tests' imports of `src/` at `dist/`, so the same suite runs
 * against what npm users get (every other source module ships in the main
 * entry), and fails on any module still loaded from `src/`, so a new kind
 * of import can't fall back to the source unnoticed. Run `npm run build` first.
 */
const againstDist = {
  name: 'compresso:against-dist',
  enforce: 'pre',
  resolveId(source, importer) {
    if (!importer?.includes('/test/') || !/\/src\/[^/]+\.js$/.test(source)) return null;
    const file = resolve(import.meta.dirname, SHIPPED[basename(source)] ?? 'dist/compresso.mjs');
    if (!existsSync(file)) this.error(`${file} is missing: run \`npm run build\` first`);
    return file;
  },
  load(id) {
    if (id.startsWith(SRC)) this.error(`${id} was loaded from src/ by the dist project: map its import to dist/`);
  },
};

/**
 * `unit` runs in plain Node: fast, no browser needed, for pure logic (byte
 * parsing, dimension math, format tables). `browser` runs the source in real
 * engines, required for anything that touches actual image decode/encode,
 * which Node has no implementation of at all; `dist` runs the same suite
 * against the build. `bundlers` builds the packed tarball with seven bundlers
 * and drives each app in Chromium. See test/browser/README.md and
 * test/bundlers/README.md.
 */
export default defineConfig({
  // The optional, personal-photo corpus at the monorepo's `_assets/` (gitignored,
  // local-only — see test/browser/corpus.test.js) lives outside this package's
  // own root, which Vite's dev server otherwise refuses to serve.
  server: { fs: { allow: [searchForWorkspaceRoot(process.cwd())] } },
  test: {
    // Coverage over the unit tests and Chromium together (V8 coverage needs a
    // Chromium engine): `npm run test:coverage`. The thresholds are the floor
    // the suite has reached, less one point so one moved line can't fail CI;
    // raise them as coverage rises, never lower them. worker.js runs only
    // inside Workers, which V8 browser coverage can't see.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/worker.js'],
      reporter: ['text-summary', 'text'],
      thresholds: { statements: 89, branches: 85, functions: 92, lines: 90 },
    },
    projects: [
      { test: { name: 'unit', include: ['test/*.test.js'], environment: 'node' } },
      browserSuite('browser'),
      browserSuite('dist', [againstDist]),
      { test: { name: 'bundlers', include: ['test/bundlers/*.test.js'], environment: 'node', testTimeout: 120_000, hookTimeout: 600_000 } },
    ],
  },
});
