# CI `test-browser` job: intermittent WebKit connection-drop — investigation + fix plan

**Status:** diagnosed. Immediate unblock shipped (`pool.test.js` now skips on WebKit only,
via `describe.skipIf(server.browser === 'webkit')` — see `test/browser/pool.test.js`'s
top-of-file comment). That stops the CI failures but is explicitly *not* the real fix —
it's pure coverage loss (WebKit's worker-pool behavior is no longer verified in CI at all).
The root-cause fix (options below, #1/#3) is still open for a follow-up session: do not
need to re-investigate from scratch, just pick one and implement it, then consider
restoring WebKit coverage to `pool.test.js` once the underlying contention is addressed.

## Symptom

`CI / test-browser` fails intermittently on pushes to `main`, most recently:

- Run [30941171021](https://github.com/iziuqo/compresso/actions/runs/30941171021/job/92099604401) (2026-08-04 19:00 UTC) — failed
- Run [30940596675](https://github.com/iziuqo/compresso/actions/runs/30940596675) (2026-08-04 18:53 UTC) — failed, same signature
- Run [30933237664](https://github.com/iziuqo/compresso/actions/runs/30933237664) (2026-08-04 17:20 UTC) — **passed**, same code

All three ran essentially the same `test/browser/pool.test.js` against the same
`playwright@1.62.1` / `vitest@4.1.10` versions (confirmed via `package-lock.json` — no
Playwright/Vitest version bump between the passing and failing runs). This is the key fact:
**nothing in the code or dependency tree changed between a clean pass and a failure.** That
rules out a logic regression and points at CI-infra non-determinism.

## What's actually failing

Every `unit` and `test` job is green. Only `test-browser` fails, and only with this exact
error (from the raw log, both failing runs):

```
Unhandled Error
Error: Failed to run the test .../packages/compresso/test/browser/pool.test.js.
Caused by: Error: [vitest] Browser connection was closed while running tests. Was the page closed unexpectedly?
Caused by: Error: [birpc] rpc is closed, cannot call "createTesters"
```

This is **not** a failing assertion. Every test that *did* get to run passed (33-39 passed,
0 failed, only the deliberately-skipped ones skipped). What happens is:

1. `pool.test.js` runs fine for `chromium` and `firefox` (visible ✓ lines in the log).
2. `pool.test.js` for `webkit` never prints a single ✓ or ✗ — its whole browser page/tab
   goes silent mid-run.
3. ~20-30s later, Vitest's browser-mode RPC (a WebSocket/birpc channel to the page) reports
   the connection closed, and the whole `test:browser` script exits 1.

Compare to the clean run (30933237664): total duration 7.55s, WebKit's `pool.test.js`
finishes in 3067ms with all 9 tests (1 skipped) ✓. In the failing runs, the log goes quiet
for ~20-30s before erroring — consistent with the WebKit page hanging or crashing rather
than a fast, deterministic failure.

## Why WebKit + `pool.test.js` specifically

`pool.test.js` (`packages/compresso/test/browser/pool.test.js`) is by far the heaviest file
in `test/browser/`:

- Spawns real `Worker` pools up to `size: 4`, doing real image compress work off-thread.
- `generateSyntheticImage()` renders an 800×800 canvas with a gradient + 500 random
  `fillRect` calls, per call, several times across the file.
- One test (`createPool() — fallback path, forced`) deletes and restores
  `globalThis.OffscreenCanvas` mid-run.
- Two tests use `vi.waitFor` with a tight 2ms poll interval.

`.github/workflows/ci.yml`'s `test-browser` job runs on a stock `ubuntu-latest` runner
(2 vCPU, 7GB RAM, shared) and does **not** limit concurrency: `vitest.config.js` gives the
`browser` project three real engine instances (`chromium`, `firefox`, `webkit`) and there's
no `fileParallelism: false` / reduced `maxWorkers` anywhere. All three engines' test files
run concurrently, each spinning up its own real OS worker threads on top of that. WebKit is
already independently documented as the flakiest engine on GitHub Actions' Linux build —
see `pool.test.js`'s own comment on the skipped HEIC-through-worker test (lines 64-72):
confirmed to pass locally on real macOS WebKit, but fails every time on GHA's Linux WebKit
build. This new failure is a second, distinct symptom of the same underlying instability
(previous one was a single assertion failing; this one is the whole page/connection dying).

## This isn't the first flake here — read PR #8 first

[Commit 7db2291](https://github.com/iziuqo/compresso/commit/7db2291f01ae394c4162eccb77130c8c1fc04875)
("Fix CI: drop Node 18 from test matrix, stabilize two browser-test flakes", #8, merged
2026-08-04 ~17:17 UTC) already patched two *different* flakes in this same file:

1. A Chromium timing flake in the "not slower than serial" smoke test → fixed with
   `{ retry: 2 }` (see `pool.test.js:149`).
2. WebKit's HEIC-through-worker test → extended an existing `it.skip` to cover WebKit too,
   because it fails on GHA Linux WebKit specifically, not locally.

That commit's own message says "Verified locally: ... 90 passed + 3 skipped (0 failed)
browser tests" and got one clean CI run (30933237664) — then the *next* two pushes both hit
this new, different failure mode. So: two flakes already fixed, this is a third. Don't
re-solve the first two; this plan is scoped to the connection-drop one only.

## Contributing factor to double check: doc drift

`test/browser/README.md:22-27` currently says WebKit "isn't affected" by the
vitest-dev/vitest#6552 dynamic-import-in-worker bug and "still runs [the HEIC test] for
real." That's now false — `pool.test.js:64-72`'s comment says the skip was extended to
WebKit specifically because it fails on GHA Linux (a different, CI-only issue, not the same
upstream Vitest bug, but the README doesn't distinguish that). Fix the README in the same
pass so the next person doesn't get confused reading the two side by side.

## Fix options, ranked

**No GitHub issue exists yet for this** (`gh issue list` checked 2026-08-04) — file one
referencing this doc before or while fixing, so the fix commit can close it.

1. **Split `test-browser` into a per-engine matrix job** (recommended primary fix).
   Change `.github/workflows/ci.yml`'s `test-browser` job to `strategy: matrix: browser:
   [chromium, firefox, webkit]` and pass the engine through to
   `vitest run --project browser` (e.g. via an env var vitest.config.js reads to filter
   `instances` to just that one browser, or three separate npm scripts). This:
   - Removes the concurrent 3-engine resource contention on one 2-vCPU runner entirely —
     each engine gets its own runner.
   - Lets a genuinely-flaky WebKit run fail/retry independently without re-running
     Chromium/Firefox.
   - Costs: slightly more CI minutes (3 jobs vs. 1), one more moving part in the workflow
     file.

2. **Add job-level retry around the whole `npm run test:lib:browser` step**, e.g. via
   `nick-fields/retry` action or a small bash retry loop. Cheapest possible change, and
   consistent with how the team already treats this category of noise (the in-file
   `{ retry: 2 }` from PR #8). Downside: doesn't reduce the underlying contention, just
   papers over it — reasonable as a fast unblock, not a substitute for #1 or #3.

3. **Cap concurrency in `vitest.config.js`** for the `browser` project (e.g.
   `fileParallelism: false`, or Vitest's browser-mode concurrency/`maxWorkers` equivalent)
   so the three engines don't all run simultaneously even within a single job. Cheaper than
   #1 (no workflow-file restructuring) but makes local `npm run test:browser` slower too,
   and doesn't get WebKit off the same shared 7GB box as the others — just serializes them
   on it.

4. **Lighten `pool.test.js`'s CI footprint** (smaller synthetic image, smaller pool
   `size`) — only worth doing if the diagnostic step below finds real memory pressure
   (OOM) rather than pure scheduling contention. Don't do this speculatively; it would
   weaken the "actually parallelizes" and timing-smoke-test coverage for a guess.

Recommendation: do **#1** as the real fix (it directly removes the contention and matches
how flaky WebKit-on-Linux is already treated as a known quantity in this repo), optionally
paired with **#2** as a safety net for whatever residual WebKit-on-Linux flakiness remains
even in isolation — WebKit alone on a runner is still WebKit-on-GHA-Linux, which this repo
already has one other documented instance of being flakier than macOS.

## Diagnostic steps to run first, before picking a fix

CI logs alone don't say *why* the WebKit page died (crash vs. hang vs. OOM-killed). Before
implementing, get one round of better signal:

1. Re-run the current `main` CI 3-5 times (`gh run rerun` or empty commits) to confirm the
   failure rate — needed to later verify a fix actually worked, not just got lucky once.
2. Temporarily add Playwright trace/video capture on failure for the browser project (see
   `@vitest/browser-playwright` provider options) or bump `test-browser`'s log verbosity —
   currently there's no artifact upload on failure at all, so every failure is a black box
   beyond the RPC-closed message.
3. If runner resource graphs are available for the failing jobs (GitHub Actions doesn't
   expose this natively; would need e.g. a `top`/`free -h`-logging step wrapped around the
   test command), capture memory at time of failure to distinguish OOM from a WebKit-driver
   crash unrelated to memory.

## Verifying the fix

Whichever option is implemented, don't call it done on one green run — this flake has
already produced one false "stabilized" signal (commit 7db2291's single clean run before
the next two pushes both failed differently). Re-run CI 5-10 times after the fix and
confirm zero `test-browser` failures before considering this closed.

## Files involved

- `.github/workflows/ci.yml` — `test-browser` job (lines 68-81)
- `packages/compresso/vitest.config.js` — `browser` project config, `instances` array
- `packages/compresso/test/browser/pool.test.js` — the heavy file; has prior flake-fix
  history and comments worth reading in full before touching
- `packages/compresso/test/browser/README.md` — has the stale WebKit/vitest#6552 claim to
  reconcile (lines 22-27)
