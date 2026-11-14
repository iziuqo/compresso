/**
 * The one list of known failures: which test cases still expose a confirmed
 * finding, in which engines, and how the failure shows. Finding IDs are the
 * assessment's (see the quality plan's appendix).
 *
 * A listed case must fail in the listed engines, and fail the known way
 * (`failsWith`); any other error fails the test as usual. Once the bug is
 * fixed the case stops failing, which fails the test with a message saying
 * to delete the entry, so the pull request that fixes a finding deletes its
 * entries and those cases must then pass for real. Nothing is skipped, and a
 * fix can't claim more than it does.
 */
import { it } from 'vitest';
import { server } from 'vitest/browser';
import { liesAbout } from './honest.js';

/** Case key → the findings it exposes, the engines where they reproduce, and how. */
export const KNOWN_FAILURES = {
  // COR-06: a returned source keeps its own bytes, but the result names another
  // format. Firefox re-encodes these small sources instead of returning them.
  'corpus/animated.gif': { findings: ['COR-06'], engines: ['chromium', 'webkit'], failsWith: liesAbout('format') },
  'corpus/vector.svg': { findings: ['COR-06'], engines: ['chromium', 'webkit'], failsWith: liesAbout('format') },
  'corpus/sample.heic': { findings: ['COR-06'], engines: ['chromium', 'webkit'], failsWith: liesAbout('format') },
  'compress/untyped-heic': { findings: ['COR-06'], engines: ['chromium', 'webkit'], failsWith: liesAbout('format') },
  'benchmark/untyped-heic': { findings: ['COR-06'], engines: ['chromium', 'webkit'], failsWith: liesAbout('format') },
};

/** Runs `fn`, requiring it to fail the known way; any other error is reported as it is. */
async function expectKnownFailure(key, known, fn) {
  try {
    await fn();
  } catch (error) {
    if (known.failsWith(error)) return;
    throw error;
  }
  throw new Error(
    `${known.findings.join(', ')} no longer reproduces in ${server.browser} for "${key}": ` +
    'delete its entry (or this engine) from KNOWN_FAILURES in test/browser/support/known-bugs.js'
  );
}

/**
 * `it()` for the case `key`. A listed case gets its finding IDs in the title
 * and, in the engines the list names, must fail the known way.
 */
export function itTracked(key, title, fn, timeout) {
  const known = KNOWN_FAILURES[key];
  if (!known) return it(title, fn, timeout);
  const reproduces = known.engines.includes(server.browser);
  return it(`[${known.findings.join(', ')}] ${title}`, reproduces ? () => expectKnownFailure(key, known, fn) : fn, timeout);
}
