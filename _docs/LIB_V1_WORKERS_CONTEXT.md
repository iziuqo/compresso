# compresso.js v1 — Worker Backend Context

**Status:** research + framing only. No plan, no code. Written 2026-08-03 to be the input
for the next planning session (a separate session, a different model), per this project's
established multi-model-handoff workflow (see `PRODUCT_CONTEXT.md` / `PWA_PLAN.md`, same
pattern).

**The ask, restated:** ship compresso.js v1 — "fully implemented workers, as advertised
earlier." The code must stay clear, clean, lean, DRY, SOLID, cohesive, readable, and
maintainable by the most junior engineer on the team. It must be modular enough to
gracefully degrade depending on the environment it runs in: workers allowed or not, HEIC
support or not, Safari or not, mobile or not, hardware-accelerated or not.

Everything under "What exists today" was read from the current tree on 2026-08-03. Ideas
are kept separate from verified facts on purpose — same convention as the two companion
docs in this folder.

---

## 0. tl;dr for whoever plans this next

The worker **seam** (decode/canvas/encode branching on `typeof document`) already shipped
in the library and is sitting in git as **v0.4.0, committed but never `npm publish`ed**
(registry still serves 0.3.2). It cost +231 B gzipped and, by itself, does **not** give a
consumer parallelism — `compressMultiple` is still a strict serial `for…await` loop today.

A **full, working, offline-verified worker pool already exists** — but it lives one repo
over, hand-built inside `compresso-app` (`src/engine/{pool.ts,worker.ts,types.ts}`, ~247
lines), consuming the library's primitives from a **vendored, unpublished copy** of the lib
source. That pool is the de facto reference implementation for what "fully implemented
workers" should look like. The central open question for planning is not *whether* to build
a pool — it's *where the weight goes* relative to the ~2.5 KB core-size claim that is this
library's entire market position, and *what shape* the public API takes. See §2.6.

---

## 1. What exists today (verified, current tree)

### 1.1 Three consumers now, not two — an update to `PRODUCT_CONTEXT.md` §1.1

That earlier doc named two artifacts with different constraints. A third now exists:

| | `packages/compresso` (npm `compresso.js`) | `website/tool` (Next.js `/tool` route) | `compresso-app` (standalone PWA) |
|---|---|---|---|
| Constraint | ~2.5 KB gzip, zero required deps | none — it's an app | none — it's an app |
| Consumer | third-party devs | end users, single-file only | end users, full batch |
| Uses the lib how | is the lib | imports `compresso.js` from the npm workspace (single-file `compress()` only, no batch, no workers) | **vendors** the lib's 6 source files locally (`src/engine/core/`), because the worker-capable version isn't on npm yet |
| Worker usage | seam exists, unused by any public API | none | full `Pool` + `PreviewWorker`, shipped and offline-verified |

`website/src/lib/compress.js` confirms the middle column: `import { compress, decodeHeic,
formatBytes, isFormatSupported, isHeicSource } from 'compresso.js'` — a thin, single-file
consumer, unchanged in shape since `PRODUCT_CONTEXT.md` was written. It still has its own
`/tool` route (`website/src/app/tool/`, `website/src/components/tool/*`) — this was **not**
removed when `compresso-app` shipped; two live surfaces with the same brand now exist (this
is also flagged as open in `PWA_PLAN.md` §15.3).

### 1.2 Library source (`packages/compresso/src`, 482 lines, 6 files) — read in full this session

- **`index.js`** (53 lines) — public surface: `compress`, `compressFile` (alias),
  `compressMultiple`, `createCompressor`, `formatBytes`, plus re-exports of
  `isFormatSupported`/`getBestFormat`/`detectFormat` (from `utils.js`), `isHeicSource`/
  `decodeHeic` (from `heic.js`), and `__setCapabilities`/`__resetCapabilities` (from
  `platform.js`) — the last two explicitly commented as "capability injection — lets a
  worker reuse the main thread's format detection."
- **`compress.js`** (129 lines) — the pipeline: resolve capabilities (now **awaited**,
  see below) → resolve format → decode → compute dimensions → draw → encode →
  `shrinkToFit` binary search (≤10 steps, `AbortSignal`-aware) → result object. Contains
  the Safari-2048px-cap logic and the never-bigger ceiling logic.
- **`platform.js`** (165 lines) — **the only module touching host I/O**, and the one
  that already branches on environment:
  ```js
  const isWorker = typeof document === 'undefined';
  ```
  Two backends: main thread (`new Image()` + `<canvas>` + `toBlob`) vs. worker
  (`createImageBitmap` + `OffscreenCanvas` + `convertToBlob`). `decode()` picks the
  branch; `createCanvas()`/`encode()` handle both canvas types already.
  Capability probing (`avif`/`webp` encodability) has a **sync** path (`toDataURL`,
  main thread only) and an **async** path (`convertToBlob` round-trip, because
  `OffscreenCanvas` has no `toDataURL`) — `ensureCapabilities()` is what the pipeline
  now `await`s before picking a format, so `format: 'auto'` resolves correctly inside a
  worker. `__setCapabilities`/`__resetCapabilities` let a host inject a known result
  instead of probing (this is exactly what `compresso-app`'s `Pool` does — probes once
  on the main thread, hands the same result to every spawned worker).
- **`resize.js`** (42 lines) — `calculateDimensions` (aspect-preserving, never-upscale)
  + `renderToCanvas` (step-down halving for large downscales, `imageSmoothingQuality:
  'high'`). No host-I/O branching needed here — it already takes a drawable + a
  `createCanvas` factory and doesn't care which backend produced them.
- **`heic.js`** (37 lines) — heuristic `isHeicSource` (MIME/extension sniff, no bytes
  read) + `decodeHeic`, which lazily `import('heic-to')` and throws a clear, actionable
  error if the optional package isn't installed. Works identically on both backends —
  `heic-to` itself doesn't touch the DOM.
- **`utils.js`** (56 lines) — MIME/extension tables, `formatToMime`, `detectFormat`,
  `generateFileName`, `isFormatSupported`, `getBestFormat` (AVIF → WebP → JPEG priority).

**Public API surface** (from `types/index.d.ts`, TypeScript types are hand-maintained
separately from JS source per `CONTRIBUTING.md` — "no TypeScript in the library source"):
`compress`, `compressFile`, `compressMultiple`, `createCompressor`, `isFormatSupported`,
`getBestFormat`, `detectFormat`, `isHeicSource`, `decodeHeic`, `formatBytes`. No worker- or
pool-shaped API exists in the public types today. `__setCapabilities`/`__resetCapabilities`
exist in the JS but are **not** in `types/index.d.ts` — they're an internal/advanced seam,
undocumented publicly (worth deciding whether v1 formalizes or keeps them "advanced use").

**The five invariants that must not break** (carried forward from `PRODUCT_CONTEXT.md`
§1.2, re-verified against current source this session):
1. `format: 'auto'` = best the browser can *encode*, AVIF → WebP → JPEG.
2. **Never-bigger guarantee** — lossy output ≤ source size, always. PNG is exempt
   (ignores quality; a size search can't help it).
3. Safari-fallback quirk — when auto falls back to JPEG **and** neither `maxWidth` nor
   `maxHeight` was set, long edge caps at 2048 px. Explicit dims or explicit format opt out.
4. HEIC input works everywhere (native on Safari/iOS, lazy WASM elsewhere).
5. `AbortSignal`, `onProgress`, `compressMultiple` all keep working.

**The gap v1 exists to close, confirmed still open:** `compressMultiple` in `index.js` is
still a plain serial loop —
```js
for (let i = 0; i < total; i++) { results.push(await compress(files[i], fileOpts)); }
```
Zero concurrency anywhere in the published or committed library code. The worker *seam*
lets a **host** run `compress()` inside a worker it manages itself — it does not give the
library's own `compressMultiple` any parallelism, and nothing in the library spawns,
schedules, or manages workers today.

### 1.3 Git and publish state — corrects a stale claim in `PWA_PLAN.md`

`PWA_PLAN.md` (written 2026-07-31) states the worker backend was "not yet committed
upstream" at time of writing. As of this session:

- `git log` on `compresso` shows commit `2124096 "Web Worker backend (0.4.0)"` **already
  on `main`**, after `cfb5c47 "Worker-ready refactor of the library core (0.3.2)"`.
  `packages/compresso/package.json` already reads `"version": "0.4.0"`.
- `CHANGELOG.md` has a complete `[0.4.0] — 2026-07-31` entry documenting exactly this:
  Web Worker support, `ensureCapabilities()` awaited by the pipeline, core grew "2.27 KB
  → 2.50 KB gzipped (+231 B)," explicitly **kept in the main entry** rather than split
  into a subpath export, reasoning: "parallel compression is core to what the library is
  for."
- **But `npm view compresso.js version` returns `0.3.2`**, and `dist-tags` shows
  `{ latest: '0.3.2' }`. So the actual, current, simpler-than-`PWA_PLAN.md`-assumed
  blocker is just: **0.4.0 has never been published.** The code exists and is committed;
  the seam works; nobody has run `npm publish`.
- `compresso` repo working tree is otherwise clean (one unrelated local-only diff to
  `.claude/launch.json`, one untracked `.claude/settings.local.json` — both editor/tooling
  config, not product code). There is also a stale worktree at
  `.claude/worktrees/modest-robinson-36ce11/` containing an older snapshot of the repo
  (predates the marketing-page rebuild) — leftover from a previous session, not current
  state; don't source facts from it.

### 1.4 No test suite, no bundle-size guard

- `find packages/compresso -iname '*test*' -o -iname '*spec*'` returns nothing. There are
  zero test files anywhere in the library.
- `.github/workflows/ci.yml` has two jobs: `build` (matrix Node 18/20/22, runs `npm run
  build:lib` only) and `website` (`build:lib` + `build:web`). No test step. No lint step
  for the library (the website has `npm run lint`, the library does not).
- No `size-limit`, `bundlesize`, or equivalent config exists. The 2.5 KB claim is
  currently enforced by hand — someone runs a build and reads the gzip size, as the
  CHANGELOG entries show ("2.27 KB → 2.50 KB (+231 B)").
- `CONTRIBUTING.md`'s only correctness guidance is "test across browsers when touching
  compression logic" — manual, not automated.

This matters specifically for v1: a worker pool introduces real concurrency and
cancellation logic (race conditions, stale-result handling, worker lifecycle) — a strictly
harder correctness surface than the current synchronous, single-threaded pipeline. The
project has, so far, gotten away with no automated tests because there was nothing
concurrent to get wrong.

### 1.5 The reference implementation: `compresso-app`'s vendored worker pool

This is the single most load-bearing artifact for planning v1 — a working, shipped,
**offline-verified** worker pool, built by the app team on top of the library's primitives,
because the library itself doesn't expose one yet.

Location: `compresso-app/src/engine/`:

- **`pool.ts`** (133 lines) — `class Pool`: fixed set of `Worker` instances ("slots"),
  a FIFO task queue, `pump()` dispatch loop, `run(id, file, params, onProgress)` →
  `Promise<CompressOutput>`, `cancel(id)` / `cancelAll()`, `destroy()`. Sizing:
  ```ts
  static defaultSize() {
    const cores = navigator.hardwareConcurrency || 4;
    return Math.max(1, Math.min(cores, 8) - 1);   // −1 reserves room for the preview worker
  }
  ```
  Explicitly memory-bound, not CPU-bound, by comment: "every busy worker can be holding a
  decoded 12 MP bitmap." Also `class PreviewWorker` — one dedicated single-worker `Pool`
  for live-preview re-compression, sequence-numbered (`this.seq`) so only the most recent
  request's result is used; older in-flight results are silently dropped.
- **`worker.ts`** (73 lines) — the actual `Worker` script. Imports `compress` and
  `__setCapabilities` from the vendored core (`./core/index.js`), holds an
  `AbortController` map keyed by job id, handles `{type:'run'}` / `{type:'abort'}`
  messages, posts `{type:'progress'|'done'|'error'}` back. Notably strips the
  library's `result.url` (a main-thread object URL, meaningless in a worker) before
  posting, sending only the `Blob`.
- **`types.ts`** (41 lines) — `Params`, `Caps`, `CompressOutput`, `WorkerRequest`,
  `WorkerResponse` — the full postMessage protocol as TypeScript discriminated unions.
- **`engine/core/README.md`** — documents the vendoring itself: the six lib source files
  are copied in **as source** (not a built bundle) "so Vite can tree-shake it and so the
  worker backend in `platform.js` compiles into the worker chunk directly," with sha256
  checksums recorded as a drift guard, and an explicit removal recipe once 0.4.0 ships to
  npm: `rm -rf src/engine/core && npm i compresso.js@^0.4.0`, then repoint two import
  sites — "**nothing else changes**."

  That last claim is worth flagging precisely: it's true for the six vendored *pipeline*
  files, but `pool.ts`/`worker.ts`/`types.ts` — the actual worker **orchestration** — are
  not part of what gets replaced by `npm i compresso.js`. They're app-level code today and
  would stay app-level code even after 0.4.0 publishes, **unless v1 decides to absorb an
  equivalent into the library itself**, which is exactly what "fully implemented workers"
  in the current ask seems to be asking for.

- **Consumption pattern** (`compresso-app/src/state/queue.ts`, the `useQueue` hook): probes
  capabilities once (`isFormatSupported('avif'|'webp')`) on the main thread, lazily
  creates the `Pool`/`PreviewWorker` (guards against React StrictMode's mount → unmount →
  remount destroying and reusing a pool), the **selected** job always runs on the
  dedicated preview worker (so the slider never queues behind a batch), every other job
  runs through the shared pool, params changes debounce 180 ms then cancel-all and re-run
  every job with a monotonic `runToken` to discard stale results.

- **Real bugs this design already found and fixed** (from `PWA_PLAN.md` §14 — a preview of
  what a library-level implementation will also have to get right):
  1. Pool created once, destroyed on unmount, but its `ref` survived remount — a
     remounted component reused a pool whose workers were all already `.terminate()`d,
     and nothing ever finished. (Fixed via lazy `??=` recreation, see `getPool` above.)
  2. EXIF orientation divergence risk between `new Image()` (auto-orients) and raw
     `createImageBitmap` (does not) — resolved with `imageOrientation: 'from-image'`,
     and **empirically verified** against a real fixture (`_assets/jpg/exif-orient-6.jpg`,
     stored 1280×768 Orientation 6, confirmed to come back 768×1280 upright from the
     worker path). The HEIC decode path was separately verified for the same concern.
  3. Safari's `OffscreenCanvas`/`convertToBlob` support was verified Baseline since
     March 2023, Safari 16.4+ including iOS — the worker backend is not a
     Chromium-only feature.

### 1.6 Environment / capability matrix — product-level facts that bound the library's own design

`PRODUCT_CONTEXT.md` §7 already built this matrix at the *product* level; the parts
relevant to the *library's* own internal capability detection:

| Capability | Status |
|---|---|
| Web Workers + `OffscreenCanvas` + `createImageBitmap` | ✅ Baseline since March 2023 (Chrome 69+, Firefox 105+, Safari 16.4+ incl. iOS). This is what the 0.4.0 seam already relies on. |
| `navigator.hardwareConcurrency` (pool sizing) | ⚠️ assumed universal; Safari is known to report a conservative number — unverified, flagged as "confirm at build time" in `PWA_PLAN.md`, never actually done. |
| Canvas AVIF/WebP encode | ⚠️ Safari cannot encode WebP/AVIF from canvas at all → triggers the 2048 px JPEG fallback cap (invariant #3, §1.2). This is a *format* capability gap, orthogonal to whether workers are available. |
| HEIC decode | ✅ native on Safari/iOS; lazy WASM (`heic-to`) everywhere else, optional dependency. |

**Gaps in this matrix not previously written down, surfaced this session, specific to the
library (not the app):**

- **Node/SSR misdetection.** `platform.js`'s `isWorker = typeof document === 'undefined'`
  is a binary test: "no DOM ⇒ must be a worker." That's correct inside an actual Worker,
  but it is *also* true in Node.js / SSR (e.g., a Next.js server component accidentally
  importing `compress()`), where neither the DOM branch nor the worker branch's globals
  (`OffscreenCanvas`, `createImageBitmap`) exist either. Today this would silently pick
  the worker branch and then throw on a missing global, not fail with a clear "this only
  runs in a browser" message. Whether the library should special-case and clearly reject
  non-browser environments, or is fine leaving this as an implicit boundary, is an open
  question for planning (§3, item 5).
- **No feature-detection export for "can this environment actually run a worker pool."**
  `isFormatSupported()` already lets a host ask "can I encode AVIF here?" and branch its
  UI accordingly. Nothing analogous exists for "are workers usable here" (covers: `Worker`
  constructor present, not blocked by CSP `worker-src none`, `OffscreenCanvas` present).
  A host wanting to gracefully degrade its own UI (e.g., "batch mode unavailable, falling
  back to one-at-a-time") currently has no library-provided way to ask.
- **Hardware acceleration is a different axis than workers, and the two are easy to
  conflate.** `PRODUCT_CONTEXT.md` §3.1's "hardware-backed canvas encode vs. software WASM
  encode" tension is about *codec choice* (canvas vs. a future WASM "Maximum" engine) —
  it has nothing to do with worker-pool concurrency, which is purely about running today's
  *existing* canvas encode off the main thread, in parallel. The user's framing ("hardware
  accelerated or not") should map, for this v1 scope, to *the existing AVIF/WebP-vs-JPEG
  capability probe* — the library has no other signal for GPU-backed encoding and
  shouldn't invent one just because the phrase was used.

### 1.7 What "v1" plausibly means — currently undecided by anything in the repo

- `package.json` is already at `0.4.0` (pre-1.0 semver — anything can still change).
  Nothing in the repo has decided whether "v1" means literally bumping to `1.0.0` (an
  explicit API-stability commitment) or is being used loosely to mean "the release where
  workers actually work."
- "As advertised earlier" has a specific, narrow paper trail: the `[0.4.0]` CHANGELOG
  entry (which frames the seam as *enabling* parallel compression, not *being* it) and the
  two internal planning docs in this folder (`PRODUCT_CONTEXT.md` §6.1: "the mechanism is
  the worker pool, and it is genuinely unclaimed"; `PWA_PLAN.md` §1: "Phase 3 of the
  existing library growth plan"). There is **no public, external claim** — the library's
  own `README.md` doesn't mention workers or batch at all today, and the website's `/tool`
  UI is still single-file. So there's no live, broken promise to a real npm consumer yet —
  useful context so the planning session doesn't overweight urgency that isn't externally
  visible yet.

---

## 2. The central tension for planning

### 2.1 Bundle size vs. a genuinely useful worker API

The 0.4.0 seam cost +231 B and, alone, gives a consumer nothing they can call to get
parallelism — they'd still have to hand-write their own `pool.ts` + `worker.ts` +
`types.ts`, exactly as `compresso-app` did (247 lines, non-trivial scheduling and
cancellation logic). Shipping an equivalent, generalized pool **unconditionally, in the
main entry**, would multiply the core's size several times over the ~2.5 KB figure that
both this library's and the app's `README.md` use as a headline claim (`compresso-app`'s
own README: "The compression core is compresso.js — a ~2.5 KB, zero-required-dependency
library... The app runs it inside a pool of Web Workers"). That sentence already implies a
separation the code doesn't yet have: the ~2.5 KB core vs. the pool that runs it.

This is the real open question — not *whether* workers should be fully implemented
(already proven valuable, already built once), but **what shape the public API takes, and
where its weight is allowed to live relative to the size budget.**

Candidate shapes (not decided here — for the planning session to weigh):

- **(a) Subpath export.** Main entry stays exactly as-is (primitives + serial
  `compressMultiple`); a new entry point (e.g. `compresso.js/pool` or `compresso.js/batch`)
  ships a generalized `Pool`/`worker` script, closely modeled on `compresso-app`'s
  existing, proven design. Default import stays ~2.5 KB; only pool consumers pay for it.
  This mirrors the option the 0.4.0 CHANGELOG *considered and rejected for the seam itself*
  ("kept in the main entry rather than split behind a subpath export") — worth planning
  explicitly deciding whether that same reasoning extends to a much heavier pool, or
  whether the seam and the pool deserve different answers.
- **(b) `compressMultiple` becomes worker-aware automatically.** Detects Worker/
  `OffscreenCanvas` support and internally fans out across a small pool when available,
  silently falling back to today's serial loop otherwise. No new public API surface, but
  the main entry unconditionally absorbs the pool's weight. Also changes
  `compressMultiple`'s existing behavior contract — see §3, item 3.
- **(c) A new opt-in call in the main entry** (e.g. `createPool()` / `compressBatch()`),
  written so a bundler can tree-shake it away for consumers who only ever call
  `compress()`. Needs verifying tree-shaking actually achieves this in practice for
  compresso's rollup ESM/CJS/UMD triple output — not something to assume.
- **(d) Ship only the worker *script* as a subpath asset** (closer to what
  `compresso-app/src/engine/worker.ts` already is) — the library provides a ready
  `new Worker(...)`-able entry point plus a documented recipe, but leaves scheduling/
  pooling to the host. Thinnest possible library addition, closest to the existing
  zero-dependency philosophy, but a weaker claim on "fully implemented" than what
  `compresso-app` already runs in production.

---

## 3. Open questions for the planning session (compiled, not answered here)

1. **API shape** — which of §2.1's candidate shapes (or another), and why. This is the
   one decision everything else hangs off.
2. **Version number** — does v1 mean `1.0.0` (stability commitment) or just "first release
   with real worker support" at whatever version follows `0.4.0`?
3. **`compressMultiple`'s behavior contract under parallelism.** Today it's strictly
   serial, and its `onProgress` callback reports a deterministic `fileIndex`/
   `overallProgress` sequence. If it becomes parallel (§2.1-b), completion order — and
   thus the shape of progress events — becomes non-deterministic. Any existing consumer
   depending on strict ordering (none known today, but it's public API) would see a
   breaking behavior change even without a signature change. Decide whether this requires
   a major-version bump regardless of the API-shape choice.
4. **Bundle-size measurement, not estimation.** `compresso-app`'s pool/worker/types code is
   ~247 lines of non-trivial TypeScript; nobody has measured what the equivalent compiles
   to gzipped. Get a real number before choosing between §2.1's options — this project's
   own convention, repeated in both companion docs, is "measure first, decide by
   measurement, not preference."
5. **Non-browser environments.** Does the library need to detect and clearly reject
   Node/SSR contexts (§1.6), or is "browser-only, worker-or-main-thread" an acceptable,
   simply-documented boundary that v1 doesn't need to solve?
6. **A capability-detection export for workers**, mirroring `isFormatSupported()` — e.g.
   `isWorkerSupported()` — so a host can build its own degrade-gracefully UI the same way
   it already can for format support. Worth it, or unnecessary surface area?
7. **Test strategy.** No test infra exists today (§1.4) and none is currently planned.
   Concurrency/cancellation bugs are qualitatively different from the synchronous
   pipeline's bugs — `compresso-app` already found and fixed three real ones (§1.5). What's
   the minimum viable automated coverage for a junior-engineer-maintainable v1: unit tests
   for the scheduler/cancellation logic in isolation? An EXIF-orientation fixture test
   (`compresso-app` already has the fixture and the empirical answer — reusable)? Real
   multi-worker integration tests, and if so, in what runner (no test runner is currently
   installed anywhere in this repo)?
8. **Does `compresso-app` actually get to delete its vendored copy after this**, per the
   removal recipe already written in its own `engine/core/README.md`? That recipe assumes
   the six *pipeline* files are all that changes. If v1's pool design differs materially
   from `compresso-app`'s current `Pool`/`PreviewWorker` (e.g., different sizing formula,
   different cancellation semantics, no built-in preview-worker concept), the app would
   need real migration work, not just a `rm -rf` + repoint. Worth checking early whether
   `compresso-app`'s specific design choices (preview-worker-counted-inside-the-cap,
   memory-bound sizing formula, lazy StrictMode-safe pool creation) are meant to become
   the library's own defaults, or are app-specific opinions that shouldn't be forced into
   a general-purpose library API.
9. **`__setCapabilities`/`__resetCapabilities` — formalize or keep "advanced/undocumented"?**
   They're already double-underscore-prefixed (implying "not really public") and absent
   from `types/index.d.ts`, yet they're exactly the mechanism any worker-pool design would
   need a host (or the library's own pool implementation) to call. Decide whether v1
   documents them properly as a supported low-level seam, or wraps them entirely inside
   whichever high-level pool API gets built so consumers never need to touch them directly.

---

## 4. Non-goals / guardrails carried forward

These are all still binding, per `PRODUCT_CONTEXT.md` §12 and this project's history —
listed here so the planning session doesn't have to re-derive them:

- **Do not add required dependencies to `packages/compresso`.** `heic-to` stays optional
  and lazily imported. The zero-required-dependency claim is the library's entire
  positioning, independent of whatever the worker-pool bundle-size number turns out to be.
- **Do not break the five invariants** in §1.2 — especially the never-bigger guarantee.
  A parallel pipeline must produce byte-identical results to the serial one for the same
  inputs; workers must not become a second, subtly-different code path with its own bugs
  in these guarantees.
- **Do not conflate this with `compresso-app`'s WASM "Maximum engine" work**
  (`PRODUCT_CONTEXT.md` §3). That's a different axis entirely — codec quality, not
  concurrency — scoped to the app, not the library, and explicitly sequenced as
  `compresso-app` v1.1, not part of this ask.
- **Do not ship a size number without measuring it.** Repeated project convention, stated
  plainly in both companion docs: measure, then decide.

---

## 5. File index — for the planning session to jump straight to source

| File | Lines | Role |
|---|---|---|
| `packages/compresso/src/index.js` | 53 | Public API surface, re-exports, `compressMultiple` (serial today) |
| `packages/compresso/src/compress.js` | 129 | Pipeline: format → decode → resize → encode → shrink-to-fit |
| `packages/compresso/src/platform.js` | 165 | The only host-I/O seam; already branches main-thread vs. worker |
| `packages/compresso/src/resize.js` | 42 | Dimension math + step-down canvas draw |
| `packages/compresso/src/heic.js` | 37 | HEIC detection + lazy `heic-to` decode |
| `packages/compresso/src/utils.js` | 56 | MIME/format helpers |
| `packages/compresso/types/index.d.ts` | 153 | Hand-maintained TS types for the public API |
| `packages/compresso/CHANGELOG.md` | — | 0.4.0 entry documents the seam's intent and cost precisely |
| `compresso-app/src/engine/pool.ts` | 133 | **Reference implementation** — `Pool` + `PreviewWorker` |
| `compresso-app/src/engine/worker.ts` | 73 | **Reference implementation** — the worker script itself |
| `compresso-app/src/engine/types.ts` | 41 | **Reference implementation** — postMessage protocol types |
| `compresso-app/src/engine/core/README.md` | — | Vendoring rationale + the (partial) removal recipe |
| `compresso-app/src/state/queue.ts` | 226 | **Reference implementation** — how a real host consumes the pool |
| `compresso/_docs/PRODUCT_CONTEXT.md` | — | Product-level capability matrix, competitive landscape, decisions A/B/C |
| `compresso/_docs/PWA_PLAN.md` | — | Names 0.4.0 as a hard blocker (§1), documents the real bugs found (§14) |
