/**
 * The one list of known failures: which test cases still expose a confirmed
 * finding, in which environments, and how the failure shows. Finding IDs are
 * the assessment's (see the quality plan's appendix). Environments are the
 * browser engines (`chromium`, `firefox`, `webkit`) and `node` for unit tests.
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

/**
 * A `failsWith` for honesty failures: true when `error` is the honesty check
 * (test/browser/support/honest.js) finding at least one of `fields` wrong.
 */
export const liesAbout = (...fields) => (error) =>
  Boolean(error?.actual && error?.expected) && fields.some((f) => !Object.is(error.actual[f], error.expected[f]));

/** Case key → the findings it exposes, where they reproduce, and (optionally) how. */
export const KNOWN_FAILURES = {
  // COR-06: a returned source keeps its own bytes, but the result names another
  // format. Firefox re-encodes these small sources instead of returning them.
  'corpus/animated.gif': { findings: ['COR-06'], where: ['chromium', 'webkit'], failsWith: liesAbout('format') },
  'corpus/vector.svg': { findings: ['COR-06'], where: ['chromium', 'webkit'], failsWith: liesAbout('format') },
  'corpus/sample.heic': { findings: ['COR-06'], where: ['chromium', 'webkit'], failsWith: liesAbout('format') },
  'compress/untyped-heic': { findings: ['COR-06'], where: ['chromium', 'webkit'], failsWith: liesAbout('format') },
  'benchmark/untyped-heic': { findings: ['COR-06'], where: ['chromium', 'webkit'], failsWith: liesAbout('format') },
  'COR-06/explicit-format-and-resize': { findings: ['COR-06'], where: BROWSERS, failsWith: liesAbout('width') },

  // The rest: one case per finding, from test/browser/findings.test.js and the unit tests.
  'COR-01/webp-past-16383': {
    findings: ['COR-01'], where: ['chromium', 'firefox'],
    // Chromium cuts the image and reports the full size; Firefox refuses the encode.
    failsWith: (error) => liesAbout('width', 'height')(error) || /Failed to encode/.test(error?.message),
  },
  'COR-02/avif-where-unsupported': { findings: ['COR-02'], where: BROWSERS, failsWith: liesAbout('format') },
  'COR-03/format': { findings: ['COR-03'], where: BROWSERS },
  'COR-03/maxSizeMB': { findings: ['COR-03'], where: BROWSERS },
  'COR-03/backgroundColor': { findings: ['COR-03'], where: BROWSERS },
  'COR-03/maxInputPixels': { findings: ['COR-03'], where: BROWSERS },
  'COR-05/already-compact': { findings: ['COR-05'], where: BROWSERS },
  'COR-07/truncated-main-thread': { findings: ['COR-07'], where: BROWSERS },
  'COR-08/pool-abort-name': { findings: ['COR-08'], where: BROWSERS },
  'COR-08/decode-error-kind': { findings: ['COR-08'], where: BROWSERS },
  'COR-10/after-destroy': { findings: ['COR-10'], where: BROWSERS },
  'COR-14/jpeg': { findings: ['COR-14'], where: BROWSERS },
  'COR-14/png': { findings: ['COR-14'], where: BROWSERS },
  'COR-15/signal-type': { findings: ['COR-15'], where: BROWSERS },
  'COR-15/formatBytes': { findings: ['COR-15'], where: ['node'] },
  'COR-16/svg-both-paths': { findings: ['COR-16'], where: BROWSERS },
  'COR-18/long-screenshot': { findings: ['COR-18'], where: BROWSERS },
  'CMP-16/fake-avif-label': { findings: ['CMP-16'], where: BROWSERS },
  'CMP-17/decoded-smaller': { findings: ['CMP-17'], where: BROWSERS },
  'PKG-01/unreachable-worker': { findings: ['PKG-01'], where: BROWSERS },
  'PERF-01/slow-but-progressing': { findings: ['PERF-01'], where: BROWSERS },
  'PERF-02/size-target-encodes': { findings: ['PERF-02'], where: BROWSERS },
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
