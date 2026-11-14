import { defineConfig } from 'vitest/config';
import { searchForWorkspaceRoot } from 'vite';
import { playwright } from '@vitest/browser-playwright';

/**
 * Two projects, deliberately: `unit` runs in plain Node — fast, no browser
 * needed, for pure logic (byte parsing, dimension math, format tables).
 * `browser` runs in real engines via Playwright — required for anything that
 * touches actual image decode/encode, which Node has no implementation of at
 * all. See test/browser/README.md for why these can't be merged into one.
 */
export default defineConfig({
  // The optional, personal-photo corpus at the monorepo's `_assets/` (gitignored,
  // local-only — see test/browser/corpus.test.js) lives outside this package's
  // own root, which Vite's dev server otherwise refuses to serve.
  server: { fs: { allow: [searchForWorkspaceRoot(process.cwd())] } },
  test: {
    // Coverage over the unit tests and Chromium together (V8 coverage needs a
    // Chromium engine): `npm run test:coverage`. The thresholds are the floor
    // the suite has reached; raise them as coverage rises, never lower them.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      reporter: ['text-summary', 'text'],
      thresholds: { statements: 86, branches: 83, functions: 91 },
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/*.test.js'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'browser',
          include: ['test/browser/**/*.test.js'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [
              { browser: 'chromium' },
              { browser: 'firefox' },
              { browser: 'webkit' },
            ],
          },
        },
      },
    ],
  },
});
