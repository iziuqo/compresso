# Pending work — full inventory & sequencing plan

**Written:** 2026-08-04. **Purpose:** every piece of pending work across this repo (local
branches, open PRs, open issues, in-progress docs) surveyed in one pass and ranked by
impact/risk, so each item below can be handed to its own high-effort session without
re-deriving this context.

**Tier 1 status: done, 2026-08-05.** All three items merged to `main` — see the "Tier 1"
section below for what was verified before each merge.

**Tier 2 status: done, merged 2026-08-05** (PR #20). Not yet published to npm — left as
a deliberate, separate release step for the repo owner.

**Tier 3, item 5 status: done, merged 2026-08-05** (PR #21, Next 16 + React 19).

**Tier 4 status: done, merged 2026-08-05** (PR #22 framework examples/CSP, PR #23
benchmark corpus).

**Tier 3, item 6 status: done, merged 2026-08-05** (PR #14, terser 1.0.0 + Node 18
build-matrix drop).

**All of Tiers 1–4 are done.**

**Tier 5 status: done, 2026-08-05.** Stale branches deleted, two of their worktrees
removed, `.gitignore` gap fixed and pushed to `main` (`1f6d72e`) — see the "Tier 5"
section below for what was found and what's still outstanding.

**Ground rule for every item:** compresso.js (the npm package, the live `/tool`, the
marketing site) has real users today. Nothing here gets rushed or merged on a red CI
signal. That is exactly how we got item #1 in the first place — see "Why this order"
below.

**Explicitly out of scope:** the PWA initiative (`_docs/PRODUCT_CONTEXT.md` +
`_docs/PWA_PLAN.md`) is research/framing only, nothing built, status undecided by the repo
owner. Not included in this plan — raise it separately if it should move forward.

---

## Why this order

On 2026-08-04 a Dependabot grouped update bumped 8 dependencies at once — including three
unrelated majors (Tailwind v4, Next 16, React 19) plus a `@rollup/plugin-terser` major —
merged straight to `main` with no CI signal checked, and broke the website build and the
lib build. It was reverted (`eb72bac`) specifically so each of those majors could be done
as its own "deliberately-scoped project… full visual QA," not a rushed CI-red fix.

This plan is that scoping, made explicit. **Tier 1 lands what's already done and de-risks
CI. Tier 2 fixes a real correctness bug already live on npm. Tier 3 is the major-version
migrations — one at a time, each independently verified. Tier 4 is low-risk community/docs
work. Tier 5 is pure housekeeping**, safe to do whenever, no session required.

Do the tiers in order. Within Tier 3, do Next+React only after Tailwind v4 (item 1) is
merged and has been live for a bit — don't stack two risky website changes.

---

## Tier 1 — Land what's already done, stabilize CI signal

### 1. ✅ DONE — Merge the Tailwind v4 migration (branch `tailwindcss-4.3.3` → PR #13)

**Merged 2026-08-05.** Verified before merge: full manual QA against the live Vercel
preview was blocked by Vercel's login gate, so verification ran instead against a local
dev server on the actual branch — homepage, `/tool` end-to-end (uploaded the Landscape
sample, compression ran and produced correct output), `/docs`, and mobile viewport all
rendered correctly with no console errors. One pre-existing minor issue was found and
confirmed *not* a regression (a ~76px horizontal scroll on `/docs` from unwrapped `<pre>`
code blocks) — confirmed present on `main` before this PR too via a throwaway worktree
diff, so it was left alone rather than scope-creeping into this merge.
**Impact: high** (touches the live marketing site's build pipeline). **Risk: low** — this
is the *redo*, done properly this time.

- Current state: this is literally the local branch already checked out. It tracks PR
  #13's branch (the same Dependabot PR that broke prod originally — updated in place to
  preserve izaias's existing approval rather than opening a fresh PR).
- 3 commits: the version bump, the real `postcss.config.mjs`/`@tailwindcss/postcss`
  migration, and an M8 cleanup (dead embed-mode + unused animation components). The last
  one (`cc9af6c`) is **not yet pushed** — local is ahead of `origin/dependabot/npm_and_yarn/tailwindcss-4.3.3`
  by 1 commit.
- All 8 CI checks green, including the `website` job (the one that actually failed last
  time). Full writeup and the one non-obvious gotcha found (`@apply` + `@layer components`
  needing promotion to `@utility` blocks) is in `_docs/M8_TAILWIND_V4_MIGRATION.md`.
- **Session scope:** push the final commit, re-pull the PR's CI status, do one more manual
  visual QA pass on the preview deploy (the original break only surfaced after merge, on
  a *different* PR's merge commit — so don't trust green CI alone), then merge PR #13.
  No new migration work should be needed — this is a land-it session, not a build-it one.

### 2. ✅ DONE — Merge the WebKit CI flake fix (branch `fix/ci-webkit-pool-flake`)

**Merged 2026-08-05** (as PR #18, outside this session — found already merged into `main`
when this session re-checked PR status mid-way through item 1).
**Impact: medium** (CI trustworthiness). **Risk: low** (test-only change, no product
code touched).

- 1 commit (`bdc5a63`), not yet a PR. Skips `pool.test.js` on WebKit in CI — the browser
  connection drops mid-run on GitHub Actions' shared runner, non-deterministic, not a real
  assertion failure. Chromium/Firefox keep full coverage.
- This is a coverage cut, not a root-cause fix. Root-cause options (per-engine CI jobs,
  concurrency caps) are already written up in `_docs/CI_TESTBROWSER_WEBKIT_FLAKE_PLAN.md`
  for whoever picks this up next — no need to re-derive them.
- **Session scope:** open the PR, confirm CI is green (including on WebKit — should now
  skip cleanly instead of flaking), merge. Do this *before* Tier 3's major-version PRs so
  their CI signal is trustworthy going in.

### 3. ✅ DONE — Merge the M9 docs PR (#17)

**Merged 2026-08-05.** Spot-check surfaced a real-looking hydration warning ("Text content
did not match... Batch & Workers / Progress Tracking") on `/docs` when testing under
`next dev`. Traced it down before trusting or dismissing it: `curl`-fetched the raw SSR
HTML and confirmed the nav order was correct and complete; the warning was intermittent
across identical reloads on the same clean dev server; and critically, running the actual
production path (`npm run build -w website`, static export, served via `serve` — the exact
code path that ships) showed **no hydration warning at all**, across multiple loads. Root
cause: a `next dev`-only artifact (a known category of dev-server SSR/hydration race), not
a defect in the PR's code. Confirmed via a locally-merged preview (main + this PR's branch,
never pushed) before merging the real PR.
**Impact: low** (docs/marketing-site content only, no code behavior change). **Risk:
near-zero.**

- Fixes stale "pre-implementation" status headers on `LIB_V1_WORKERS_CONTEXT.md`/
  `LIB_V1_WORKERS_PLAN.md` (M0–M6 actually shipped, `compresso.js/pool` has been live on
  npm since 1.0.0) and adds the missing "Batch & Workers" section + `maxInputPixels` to
  the `/docs` page, across all 7 locales.
- Vercel preview already deployed and green; PR body says locale JSON parse and
  screenshot/DOM checks were already done.
- **Session scope:** spot-check the live preview once more, merge. Should be quick.

---

## Tier 2 — Real correctness bug, already live on npm

### 4. ✅ DONE (pending merge) — Fix issue #6 — never-bigger guarantee can be violated

**PR opened 2026-08-04:** [#20](https://github.com/iziuqo/compresso/pull/20), branch
`fix/never-bigger-guarantee`. Not yet merged or published to npm.

**What this session found:** the actual fix already existed on `main`, landed as a
side effect of the M1 test-suite commit (`4e1401e`, merged the same day this plan was
written) — `compress()`'s outer check (`blob.size > originalSize` → fall back to the
source's own bytes, honestly relabeled as their real format) already neutralizes
`shrinkToFit`'s unconditional `encode(canvas, mimeType, 0.1)` quality-floor fallback.
That commit landed *after* 1.0.1 was published, so the bug described in #6 is still
live on npm today even though `main` already has the fix.
- What was actually missing: a regression test pinning this behavior directly against
  `shrinkToFit`'s own fallback path (the existing coverage only exercised it
  incidentally, via the AVIF/WebKit fixture test). Added
  `packages/compresso/test/compress-never-bigger.test.js` — mocked `encode()`, no
  image fixture needed — covering the incompressible-source case, a normal
  quality-search win (proving the fallback doesn't shadow it), and PNG's documented
  exemption.
- Bumped `compresso.js` to 1.0.2 with a CHANGELOG entry, since this is a real,
  previously-undelivered correctness fix.
- Verified: unit suite 83/83 (new suite 3/3), browser suite (Chromium/Firefox/WebKit)
  82 passing/11 skipped (pre-existing WebKit pool skip, unrelated), lib build clean.
- **Not done in this session:** merging the PR, and `npm publish` — left as a deliberate,
  separate release step for the repo owner rather than run automatically.

---

## Tier 3 — Major-version migrations (one at a time, independently verified)

Do these only after Tier 1 is merged. Each is its own session — do not combine.

### 5. Next.js 14→16 + React 18→19 (PRs #16 and #15)
**Impact: high** (website's framework + rendering runtime). **Risk: medium** — CI is
green on both individually, but CI didn't catch the Tailwind v4 breakage last time either
(the actual failure only showed up on a later PR's merge). Treat green CI as necessary,
not sufficient.

- Handle these as **one coordinated migration**, not two separate PRs merged
  independently — Next 16 requires React 19 as a peer anyway, and verifying them
  separately just means verifying the same rendered pages twice.
- **Session scope:** read Next 16's and React 19's actual breaking-changes docs (don't
  assume from the version number), re-verify every page renders and every interactive
  path on the site still works (this is exactly what the original bundled bump skipped),
  full visual QA on the preview deploy, then merge both.
- Sequencing note: do this *after* item 1 (Tailwind v4) is live and stable, so any
  regression found is unambiguously attributable to Next/React, not Tailwind.

### 6. ✅ DONE — Fix `@rollup/plugin-terser` 1.0.0 build failure (PR #14)

**Merged 2026-08-05** (updated the existing Dependabot branch in place, same approach
as item 1's Tailwind PR — preserved PR #14 rather than opening a fresh one).

**Impact: low-medium** (lib build tooling only — doesn't touch shipped runtime code).
**Risk: low.**
- Root cause confirmed, not assumed: `@rollup/plugin-terser` 1.0.0 and its
  `serialize-javascript@7` dependency both **declare** `engines.node: ">=20.0.0"` in
  their own `package.json` — this was never a polyfillable bug, it's an explicit
  upstream floor. `build (18)` failed with `ReferenceError: crypto is not defined`
  (`serialize-javascript`'s `generateUID` assumes Node 20's stable global WebCrypto).
- Decided to **drop Node 18 from the build matrix**, matching the precedent the test
  matrix already set (excluded there for an unrelated rolldown/vitest engines floor).
  Updated both matrices' comments in `.github/workflows/ci.yml` to stay accurate — the
  test matrix's old comment specifically said "build (18) above still proves the
  library builds fine on Node 18," which stopped being true once build dropped it too.
- The dependabot branch was 9 commits stale (predated the Tailwind v4, Next 16/React 19,
  and Tier 4 merges) — merged latest `main` in first, then added the one-commit fix on
  top; fast-forward-pushed back onto the same branch so PR #14 stayed the same PR.
- Verified before merging: `build:lib`, `test:lib` (83/83), `test:lib:browser` (97
  passed/11 skipped, same baseline), `size:lib`, and `build:web` all clean locally on
  the merged branch; all 8 GitHub Actions checks green after push, including the new
  2-entry (20/22) build matrix with no `build (18)` job at all.

---

## Tier 4 — Low-risk community/docs issues

### 7. ✅ DONE (pending merge) — Add missing framework examples + CSP doc (issues #1, #2, #3, #5)

**PR opened 2026-08-05:** [#22](https://github.com/iziuqo/compresso/pull/22), branch
`docs/framework-examples-and-csp`. Not yet merged.

**Impact: low** (docs/examples only, all labeled "good first issue"). **Risk:
near-zero.**
- #1 Svelte usage example — `examples/svelte/App.svelte` + README collapsible snippet.
- #2 Next.js App Router upload recipe — `examples/nextjs/UploadForm.jsx` (client
  component) + `examples/nextjs/route.js` (route handler) + README recipe.
- #3 Angular usage example — `examples/angular/app.component.ts` (standalone component).
- #5 CSP setup for the HEIC decoder — new README "Content-Security-Policy (CSP)"
  section + FAQ entry. Sourced directly from the code rather than assumed from WASM/CSP
  conventions: the `wasm-unsafe-eval` requirement is `heic.js`'s own documented
  error-path comment, and the `worker-src 'self'` guidance follows from how `pool.js`
  actually constructs its Worker (same-origin module URL via `import.meta.url`, no
  third-party origin ever involved).
- All four examples mirror the existing single-file style of `examples/react/App.jsx`
  and `examples/vue/App.vue`. Confirmed `examples/` isn't in the root `package.json`
  workspaces list, so none of this touches the `build`/`test` CI jobs — no library or
  website code was touched.
- **Merged 2026-08-05** (PR #22). CI (build ×3, website, test ×2, test-browser, size)
  all green before merge.

### 8. ✅ DONE — Expand the benchmark corpus (issue #4)

**Merged 2026-08-05** (PR #23, branch `docs/benchmark-corpus`).

**Impact: low** (improves benchmark credibility, no shipped behavior change). **Risk:
near-zero.**
- Found there was no existing "benchmark tooling" to wire into (the plan's original
  assumption) — only `_assets/` (gitignored, personal, local-only) and the README's
  hand-written Comparison table. Built the minimum needed instead: `benchmark/corpus/`
  (~470 KB, synthetic, non-personal images covering high-resolution JPEG, transparent
  PNG, text-heavy screenshot, already-optimized WebP, plus HEIC reused from the
  existing test fixture) + `packages/compresso/scripts/generate-benchmark-corpus.mjs`
  (regenerates them via a real Chromium canvas, using Playwright — already a
  devDependency, no new one added) + `packages/compresso/test/browser/benchmark.test.js`
  (runs `compress()` against the corpus every CI run/engine, asserting the
  never-bigger guarantee and logging real before/after numbers).
- Synthetic rather than sourced from the web, deliberately: sidesteps the
  license/attribution question the issue raises entirely, and avoids downloading
  external files or committing large binaries without the maintainer conversation the
  issue itself asks for first.
- Verified thoroughly before merging, not just green CI: `npm pack --dry-run` confirmed
  the new files never reach the published npm tarball; Rollup's explicit input list
  means the build is untouched; no lint CI job exists to break; and the actual branch
  was built + served locally (Vercel's own `buildCommand`) with a real end-to-end
  compression run on `/tool` (42.1 KB → 26.8 KB) plus `/docs` and homepage checks, all
  clean — since this plan's own "why this order" section warns that green CI didn't
  catch the original Tailwind breakage either.
- **Open gap, documented in `benchmark/README.md`:** these are synthetic stand-ins, not
  real photos. Genuine CC0 contributions (especially real HEIC and true
  high-megapixel JPEGs) are still welcome per the issue's own text — it also asks
  contributors to comment before adding large files to agree on storage, which this
  PR doesn't attempt to settle.

---

## Tier 5 — Housekeeping (no dedicated session needed, near-zero risk)

**✅ DONE — 2026-08-05.**

- **Deleted stale local branches with no unique commits vs `main`:**
  `claude/infallible-sammet-5615d4`, `claude/modest-robinson-36ce11`,
  `fable5-v1-context-plan`, `marketing/site-compliance-and-header-fix`. Re-confirmed via
  `git log main..<branch>` (all empty) immediately before deleting.
  - `claude/infallible-sammet-5615d4`'s worktree
    (`.claude/worktrees/infallible-sammet-5615d4`) removed cleanly.
  - `claude/modest-robinson-36ce11`'s worktree
    (`/Users/izaias/Projects/OpenSource/compresso/.claude/worktrees/modest-robinson-36ce11`)
    had one untracked file (`.claude/settings.local.json`, same harmless per-user
    artifact as elsewhere) — confirmed with the repo owner before force-removing;
    turned out to already be gone by the time of the force-remove (git had pruned its
    registration during an earlier attempt blocked by the permission classifier).
  - `fable5-v1-context-plan`'s worktree, at
    `/Users/izaias/conductor/workspaces/compresso/basseterre`, could **not** be removed
    — permission denied, since it lives under izaias's home directory and this session
    ran as ethan. Left in place; izaias should run `git worktree remove` on it
    themselves (the branch itself is already deleted here, so it'll show as a stale/
    orphaned worktree on their side — `git worktree prune` or a manual `rm` +
    `git worktree remove` will clean it up).
- **`.gitignore` gap fixed:** added `.claude/settings.local.json` to `.gitignore`.
  Committed directly to `main` (no PR — trivial, low-risk, explicit repo-owner
  go-ahead) as `1f6d72e` and pushed.

---

## Explicitly checked, no action needed

- **npm publish state:** `packages/compresso/package.json` (`compresso.js`) is at
  `1.0.1`, matches `CHANGELOG.md`'s latest entry, matches what's live on npm
  (`npm view compresso.js version` → `1.0.1`). *(An earlier check of `npm view compresso
  version` returned `1.6.1` — that's an unrelated third-party package with a
  name collision, not this project. Don't reuse that command without the `.js` suffix.)*
- **PWA initiative** — confirmed out of scope for this plan (see top).

---

## Suggested session order

1. Tier 1, item 1 (Tailwind v4 → PR #13)
2. Tier 1, item 2 (WebKit CI flake fix)
3. Tier 1, item 3 (M9 docs → PR #17)
4. Tier 2, item 4 (never-bigger guarantee bug)
5. Tier 3, item 5 (Next 16 + React 19, coordinated)
6. Tier 3, item 6 (terser 1.0.0 build fix)
7. Tier 4, item 7 (framework examples + CSP doc)
8. Tier 4, item 8 (benchmark corpus)
9. Tier 5 housekeeping — whenever, doesn't need to be last, doesn't need its own session
