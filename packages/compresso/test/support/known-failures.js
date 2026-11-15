/**
 * The one list of known failures: which test cases still expose a confirmed
 * finding, in which environments, and how the failure shows. Finding IDs are
 * the assessment's (see the quality plan's appendix). Environments are the
 * browser engines (`chromium`, `firefox`, `webkit`) and `node` for unit tests;
 * test/bundlers runs as `chromium`, and test/lab as each engine it opens, or
 * as `ios-<major>` in iPhone Safari on a simulator.
 *
 * A listed case must fail where listed, and fail the known way: by default an
 * assertion whose message names one of its findings (tests write
 * `expect(value, 'COR-10 …')`), or the entry's own `failsWith`. Any other
 * error fails the test as usual. Once the bug is fixed the case stops
 * failing, which fails the test with a message to delete the entry, so the
 * pull request that fixes a finding deletes its entries and those cases must
 * then pass for real. Nothing is skipped, and a fix can't claim more than it
 * does. Each pull request states how many entries are left.
 */

const BROWSERS = ['chromium', 'firefox', 'webkit'];
/** iPhone Safari in CI: the oldest and newest iOS simulators the runners have. */
const IOS = ['ios-18', 'ios-26'];

/**
 * A `failsWith` for honesty failures: true when `error` is the honesty check
 * (test/browser/support/honest.js) finding at least one of `fields` wrong.
 */
export const liesAbout = (...fields) => (error) =>
  Boolean(error?.actual && error?.expected) && fields.some((f) => !Object.is(error.actual[f], error.expected[f]));

/** A matrix cell for a step that never ran because an earlier one failed (test/bundlers). */
export const NOT_RUN = '—';

/**
 * A `failsWith` for one row of the bundler matrix: true when every cell of the
 * failed assertion's outcome matches `row`. A cell is `ok`, `NOT_RUN`, or a
 * pattern that the cell's failure reason must match, so a row fails only the
 * known way.
 */
export const matrixRow = (row) => (error) => {
  const matches = (want, got) => (want instanceof RegExp ? got !== 'ok' && got !== NOT_RUN && want.test(got) : want === got);
  return Boolean(error?.actual) && Object.keys({ ...row, ...error.actual }).every((key) => matches(row[key], error.actual[key]));
};

/** A `failsWith` for a list check: true when the failed assertion saw exactly `list`. */
export const saw = (list) => (error) => JSON.stringify(error?.actual) === JSON.stringify(list);

/** The bundler matrix's columns: the build, the page load, then each check in test/bundlers/app.js. */
export const MATRIX = ['build', 'load', 'mainJpeg', 'poolJpeg', 'poolHeic', 'mainHeic'];

/** A matrix row: the given cells in column order, the rest `NOT_RUN`. */
const row = (...cells) => Object.fromEntries(MATRIX.map((key, i) => [key, cells[i] ?? NOT_RUN]));
const NO_WORKERS = /ran without real workers/;
const POOL_ON_MAIN_THREAD = row('ok', 'ok', 'ok', NO_WORKERS, NO_WORKERS, 'ok');

/** Case key → the findings it exposes, where they reproduce, and (optionally) how. */
export const KNOWN_FAILURES = {
  // COR-06: a returned source keeps its own bytes, but the result names another
  // format. Firefox re-encodes these small sources instead of returning them.
  'corpus/animated.gif': { findings: ['COR-06'], where: ['chromium', 'webkit'], failsWith: liesAbout('format') },
  'corpus/vector.svg': { findings: ['COR-06'], where: ['chromium', 'webkit'], failsWith: liesAbout('format') },
  'corpus/sample.heic': { findings: ['COR-06'], where: ['chromium', 'webkit'], failsWith: liesAbout('format') },
  // A kept JPEG is named `jpg`, not the canonical `jpeg`.
  'corpus/photo-gps-compact.jpg': { findings: ['COR-06'], where: BROWSERS, failsWith: liesAbout('format') },
  'compress/untyped-heic': { findings: ['COR-06'], where: ['chromium', 'webkit'], failsWith: liesAbout('format') },
  'benchmark/untyped-heic': { findings: ['COR-06'], where: ['chromium', 'webkit'], failsWith: liesAbout('format') },

  // The rest: one case per finding, from test/browser/findings.test.js and the unit tests.
  'COR-02/avif-where-unsupported': { findings: ['COR-02'], where: BROWSERS, failsWith: liesAbout('format') },
  'COR-03/format': {
    findings: ['COR-03'], where: BROWSERS,
    // compress() reads `format.toLowerCase()` without a default.
    failsWith: (error) => error instanceof TypeError && /toLowerCase/.test(error.message),
  },
  'COR-03/backgroundColor': { findings: ['COR-03'], where: BROWSERS },
  'COR-03/maxInputPixels': { findings: ['COR-03'], where: BROWSERS },
  // A kept source keeps its EXIF, GPS included.
  'COR-04/photo-gps-compact.jpg': { findings: ['COR-04'], where: BROWSERS },
  'COR-04/photo-gps.webp': { findings: ['COR-04'], where: BROWSERS },
  'COR-07/truncated-main-thread': { findings: ['COR-07'], where: BROWSERS },
  'COR-08/pool-abort-name': { findings: ['COR-08'], where: BROWSERS },
  'COR-08/decode-error-kind': { findings: ['COR-08'], where: BROWSERS },
  'COR-10/after-destroy': { findings: ['COR-10'], where: BROWSERS },
  'COR-15/signal-type': { findings: ['COR-15'], where: BROWSERS },
  'COR-15/formatBytes': { findings: ['COR-15'], where: ['node'] },
  // Firefox re-encodes small animated sources to a still WebP.
  'COR-16/animated.gif': { findings: ['COR-16'], where: ['firefox'] },
  'COR-16/animated.png': { findings: ['COR-16'], where: ['firefox'] },
  'COR-16/animated.webp': { findings: ['COR-16'], where: ['firefox'] },
  'COR-16/svg-both-paths': { findings: ['COR-16'], where: BROWSERS },
  'CMP-17/decoded-smaller': { findings: ['CMP-17'], where: BROWSERS },

  // test/bundlers: the packed tarball and the seven bundler apps, in Chromium.
  'package/publint': {
    findings: ['PKG-07'], where: ['chromium'],
    failsWith: saw(['.', './plan', './pool'].map((entry) => `EXPORTS_TYPES_SHOULD_BE_FIRST exports ${entry} types`)),
  },
  'package/attw': {
    findings: ['PKG-07'], where: ['chromium'],
    failsWith: saw([
      'CJSResolvesToESM ./pool node16-cjs',
      'FallbackCondition . bundler', 'FallbackCondition . node16-cjs', 'FallbackCondition . node16-esm',
      'FallbackCondition ./plan bundler', 'FallbackCondition ./plan node16-cjs', 'FallbackCondition ./plan node16-esm',
      'FallbackCondition ./pool bundler', 'FallbackCondition ./pool node16-esm',
      'FalseESM types/index.d.ts', 'FalseESM types/plan.d.ts',
      'InternalResolutionError types/pool.d.ts',
      'NoResolution ./plan node10', 'NoResolution ./pool node10',
    ]),
  },
  // The pool can't find its worker file, so it compresses on the main thread.
  'bundler/rollup': { findings: ['PKG-02'], where: ['chromium'], failsWith: matrixRow(POOL_ON_MAIN_THREAD) },
  'bundler/esbuild-esm': { findings: ['PKG-02'], where: ['chromium'], failsWith: matrixRow(POOL_ON_MAIN_THREAD) },
  // Importing the pool resolves a URL against `import.meta.url`, which an IIFE lacks.
  'bundler/esbuild-iife': { findings: ['PKG-03'], where: ['chromium'], failsWith: matrixRow(row('ok', /Failed to construct 'URL'/)) },
  // Parcel ignores the exports map by default, so `compresso.js/pool` doesn't resolve.
  'bundler/parcel': { findings: ['PKG-04'], where: ['chromium'], failsWith: matrixRow(row(/Failed to resolve 'compresso\.js\/pool'/)) },

  // test/lab: the device lab page's checks (lab/checks.mjs). No engine here
  // encodes AVIF on a canvas.
  'lab/explicit-avif': { findings: ['COR-02'], where: [...BROWSERS, ...IOS] },
  // iPhone Safari can't encode WebP, and the PNG it gets instead is labelled WebP.
  'lab/explicit-webp': { findings: ['COR-02'], where: IOS },
  // iPhone Safari: iOS 26's canvas labels bytes that aren't AVIF as
  // image/avif and ignores quality (CMP-16). The library no longer believes
  // it, but the raw encoder check reports what the browser does. Safari's
  // JPEG runs far larger than Chromium's.
  'lab/encoders': { findings: ['CMP-16'], where: ['ios-26'] },
  'lab/jpeg-size': { findings: ['CMP-18'], where: IOS },
  // So no JPEG it makes beats the 64 × 64 JPEG source, which comes back named
  // `jpg`, not the canonical `jpeg` (COR-06, as for photo-gps-compact.jpg).
  'lab/pool-fallback': { findings: ['COR-06'], where: IOS },
};

/** Default `failsWith`: an error whose message names one of the entry's findings. */
const namesFinding = (findings) => (error) => findings.some((id) => String(error?.message).includes(id));

async function expectKnownFailure(key, known, environment, fn) {
  try {
    await fn();
  } catch (error) {
    if ((known.failsWith ?? namesFinding(known.findings))(error)) return;
    throw error;
  }
  throw new Error(
    `${known.findings.join(', ')} no longer reproduces in ${environment} for "${key}": ` +
    'delete its entry (or this environment) from KNOWN_FAILURES in test/support/known-failures.js'
  );
}

/**
 * Makes `itTracked(key, title, fn, timeout)` for one environment: `it()` for
 * the case `key`; a listed case gets its finding IDs in the title and, where
 * the list names this environment, must fail the known way.
 */
export function tracked(it, environment) {
  return (key, title, fn, timeout) => {
    const known = KNOWN_FAILURES[key];
    if (!known) return it(title, fn, timeout);
    const body = known.where.includes(environment) ? () => expectKnownFailure(key, known, environment, fn) : fn;
    return it(`[${known.findings.join(', ')}] ${title}`, body, timeout);
  };
}
