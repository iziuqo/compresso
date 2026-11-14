/**
 * The one list of known failures: which test cases still expose a confirmed
 * finding, and in which engines. Finding IDs are the assessment's (see the
 * quality plan's appendix).
 *
 * A listed case runs as `it.fails` in the engines named here: it passes while
 * the bug exists and fails the moment the bug is fixed. So the pull request
 * that fixes a finding deletes its entries, and those cases then have to pass
 * for real. Nothing is skipped, and a fix can't claim more than it does.
 */
import { it } from 'vitest';
import { server } from 'vitest/browser';

const ALL = ['chromium', 'firefox', 'webkit'];

/** Case key → the findings it exposes and the engines where they still reproduce. */
export const KNOWN_FAILURES = {
  // COR-06: a returned source keeps its own bytes, but the result names another format.
  'corpus/animated.gif': { findings: ['COR-06'], engines: ALL },
  'corpus/vector.svg': { findings: ['COR-06'], engines: ALL },
  'corpus/sample.heic': { findings: ['COR-06'], engines: ALL },
  'compress/untyped-heic': { findings: ['COR-06'], engines: ['chromium', 'webkit'] },
  'benchmark/untyped-heic': { findings: ['COR-06'], engines: ['chromium', 'webkit'] },
};

/**
 * `it()` for the case `key`. Listed cases get their finding IDs in the title
 * and run as `it.fails` where the list says they still fail.
 */
export function itTracked(key, title, fn, timeout) {
  const known = KNOWN_FAILURES[key];
  if (!known) return it(title, fn, timeout);
  const run = known.engines.includes(server.browser) ? it.fails : it;
  return run(`[${known.findings.join(', ')}] ${title}`, fn, timeout);
}
