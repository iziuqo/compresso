# compresso.js v1 — Worker Backend: Implementation Plan

**Companion to** [`LIB_V1_WORKERS_CONTEXT.md`](./LIB_V1_WORKERS_CONTEXT.md) (read that first —
it's the verified-facts research this plan is built on: current source, git/publish state,
the proven reference implementation in `compresso-app`, and the open questions this plan now
answers).

**Status:** done, 2026-08-04. M0 through M6 all implemented and shipped same-day (git log
`6959348`..`47f82d6`) — see §9's milestone table for the row-by-row done state, and §13–§17
for implementation notes left by each milestone for the next. `compresso.js` promoted to
`1.0.0`/`latest` on npm, since bumped to `1.0.1` (docs/metadata only, no code changes —
`CHANGELOG.md`). **M7 is the only remaining row, explicitly on hold**: its own stated
criterion is "informed by real `1.0.0` usage," and there's been no time yet for real adoption
to accrue — check `npm view compresso.js` and the repo's issue tracker for an actual usage
signal before starting it, not just elapsed calendar time. A process gap surfaced right after
M6 shipped — batching all seven milestone commits to `main` meant CI's `push` trigger never
evaluated M0–M5 individually, so their "green CI" done-when criteria went unverified until
the M6 promotion commit came back red in three places (fixed in
[PR #8](https://github.com/iziuqo/compresso/pull/8)) — worth remembering before trusting a
"done" claim from a fast, batched, single-session push again.

Original plan kept as-written below for the historical record of what was decided *before*
implementation — the adversarial-review findings in §11 held up as designed, and the
outcome notes above (plus §13–§17) are what actually happened.

---

**Status (original, pre-implementation):** implementation plan, revised after a three-angle
adversarial review (independent backend/systems, frontend/mobile-performance, and
application-security passes — full findings and resolutions in §11). Two of those findings
changed the actual design, not just the copy — read §11 before implementing anything, it
explains *why* the design looks the way it does in a few places that would otherwise look
over-engineered. Ready to hand to an implementation session. Written 2026-08-03.

**Handoff:** per this project's multi-model-handoff workflow. This plan is written to be
executed by a separate, lower-capability model in a later session, with no architectural
judgment calls left open. Every decision the context doc left as "open question" is closed
here, with a stated reason. Where a step is ambiguous enough to need judgment, it's called out
explicitly as **JUDGMENT CALL** with the recommended default — implement the default unless
told otherwise.

**The ambition, stated plainly, once, so it doesn't need repeating in every section:** this
library should be built as if it is a feasibility prototype for a future native browser API —
not as marketing language, but as an actual design discipline (§1). We are doing the work of
proving an opinionated, high-level, batch-capable image-compression primitive is the right
shape for the platform to eventually own natively, the same way `pako.js`/`zlib.js` proved
`CompressionStream` was worth shipping. That means the API surface must read like something a
browser vendor could adopt almost unchanged, not like a library with a personality — and it
means the plan has to survive exactly the kind of adversarial scrutiny a real API review would
apply. §11 is that scrutiny, applied before implementation instead of after.

---

## 0. tl;dr

- **`compressMultiple` does not change.** No behavior risk, no breaking change, zero size
  regression on the path every existing consumer already depends on.
- **A new subpath, `compresso.js/pool`, ships the worker pool** — generalized, de-TypeScripted
  from `compresso-app`'s proven `pool.ts`/`worker.ts`/`types.ts` (already offline-verified in
  production), **plus real crash/timeout recovery and observability the reference
  implementation didn't need for a single app but a published library does** (§3.6 — added
  after red-team review found the original design could hang silently with no recourse).
- **`createPool()` never throws for lack of Worker support.** It feature-detects and silently
  falls back to the existing main-thread serial path. Same API, environment-appropriate
  implementation — this is the concrete answer to "gracefully degrades depending on the
  environment."
- **The resource-exhaustion guard is now two-stage, not one.** A cheap, header-only pixel-count
  probe runs *before* the expensive decode for JPEG/PNG/WebP sources (§3.5) — red-team review
  found the original single post-decode check ran too late to matter on exactly the path this
  plan exists to ship. HEIC/AVIF/URL sources still get the post-decode check as a documented,
  narrower residual — stated honestly, not glossed over.
- **The HEIC decode fallback is narrowed to files that are actually HEIC-shaped** (a cheap
  magic-byte confirmation, §3.5) — red-team review found the existing heuristic silently routed
  *any* untyped, unnamed blob into the one real native-decoder risk in the codebase.
- **Zero required dependencies, unchanged.** Testing/tooling additions are devDependencies only
  and never ship to consumers.
- **Version target: `1.0.0`, reached via a `1.0.0-rc.1` pre-release soaked inside
  `compresso-app`'s real migration, plus an independent second venue** (§8 — strengthened after
  red-team review correctly noted a single-app soak is a thin validation bar for a stability
  promise).

---

## 1. Vision: designing this as a browser-API feasibility proof

This section is framing that should shape every decision below, not a section to skim past.

### 1.1 The precedent that makes this credible, not aspirational

Browsers have already standardized exactly this class of thing once: `CompressionStream` /
`DecompressionStream` (gzip/deflate transform streams) shipped natively — Chrome 80+, Firefox
113+, Safari 16.4+ — after years of the same functionality existing only as userland libraries
(`pako.js`, `zlib.js` ports). The pattern was: prove the primitive is useful and widely needed
in userland → the platform absorbs it. `ImageDecoder` (part of WebCodecs, currently
Chromium-only — **unverified cross-browser, do not overclaim its support**) is the platform
already moving further in this direction on the decode side.

**What's different, and why compresso's job here is more specific than "prove Workers can
decode images"** — browsers already know that; `Worker` + `OffscreenCanvas` +
`createImageBitmap` + `convertToBlob` are Baseline-widely-available since March 2023 across
every major engine including iOS Safari (verified in the context doc, §1.6). The open question
a spec author would actually have is **product-shape**, not technical feasibility:

- Should format selection be automatic (`format: 'auto'` picking AVIF → WebP → JPEG by what the
  engine can encode)?
- Should there be a "never bigger than the source" guarantee as a platform-level contract?
- Should batch/parallel compression be a first-class primitive, or left entirely to userland
  worker orchestration?
- What does cancellation, progress reporting, partial-batch failure, and graceful degradation
  look like as a *stable, ergonomic, boring* API — not a clever one?

**Compresso's job is to answer those questions with a working, adopted, battle-tested
implementation** — a prollyfill in the WICG sense, not a marketing claim. That reframes "code
must be minimal, readable, obvious" from a style preference into the actual design constraint:
spec-quality APIs are minimal and obvious by necessity, because every surface is something a
standards body would eventually have to defend line by line, under exactly the kind of
adversarial review this plan was put through in §11.

### 1.2 Concrete design discipline this plan enforces because of §1.1

1. **Promise-based, `AbortSignal`-driven, structured options bags** — already true of `compress()`,
   extended identically to the new pool API. No callback-only patterns, no library-specific
   event emitters. If it doesn't look like it could be `fetch()`'s sibling, redesign it.
2. **Feature detection returns a plain, synchronous value** (`isPoolSupported(): boolean`),
   mirroring the existing `isFormatSupported()` — matches the platform's own
   `document.fonts.check()`-style conventions, not a library-invented pattern.
3. **No magic strings where a closed union already exists** (`kind: 'decode' | 'aborted' |
   'unsupported' | 'too-large' | 'queue-full' | 'timeout' | 'generic'` — enumerable, documented,
   exhaustive).
4. **Partial batch failure follows an existing platform pattern, not an invented one**
   (`Promise.allSettled`'s shape — §3.1/2.10) — reuse over invention, same discipline as point 1.
5. **Graceful degradation is structural, not a documented caveat.** `createPool()` works in
   every environment; it just does less work in parallel where the platform can't offer more.
   A spec could adopt this exact contract unchanged.

### 1.3 What this plan explicitly does *not* attempt (so ambition stays credible)

- **No WICG explainer or spec proposal is written as part of this plan.** That's the honest
  next step *if* v1 ships and gets real adoption — named as milestone M7, deliberately deferred,
  not attempted prematurely on an unshipped, unvalidated API.
- **No claim that compresso today is "as fast as native," and no claim of byte-for-byte output
  reproducibility across browser engines** (§5.1 point 4 — a claim the original draft of this
  plan implicitly made and red-team review correctly rejected). The performance section (§6) is
  about proving *specific, falsifiable* numbers, not asserting superiority.
- **No conflation with `compresso-app`'s future WASM "Maximum engine.**" That's a codec-quality
  question (a completely different axis — see `PRODUCT_CONTEXT.md` §3), scoped to the app, and
  explicitly out of scope here, same as it was in the exploration doc's non-goals.
- **No claim of full pre-decode resource-exhaustion protection for every source type.** §3.5's
  header-only probe covers JPEG/PNG/WebP `Blob`/`File` sources specifically. HEIC, AVIF, and
  string-URL sources rely on the post-decode check only — a documented, narrower guarantee, not
  silently assumed to be as strong.

---

## 2. Decisions (every open question from the context doc, closed)

Each decision below corresponds to an item in `LIB_V1_WORKERS_CONTEXT.md` §3 (numbered to
match) or a design axis raised there. §2.10–2.12 are new, added in response to red-team
findings (§11) — the original draft didn't need them because it hadn't yet been asked the
questions that made them necessary.

### 2.1 API shape → **subpath export, `compresso.js/pool`**

Chosen over the three alternatives the context doc listed, for a specific reason each
alternative fails:

- Rejected **(b) auto-parallel `compressMultiple`**: silently changes an existing public
  function's behavior contract (completion order, progress-event shape) with no signature
  change — a breaking change disguised as a patch. Also unconditionally taxes the main entry's
  bundle size for a feature not every consumer needs.
- Rejected **(c) tree-shakeable opt-in export in the main entry**: depends on the *consumer's*
  bundler correctly eliminating dead code across a package boundary — true for some modern
  bundlers, not guaranteed, and not something to bet the 2.5 KB headline claim on without
  bundler-matrix verification this plan has no room to run. A real subpath is unconditional and
  requires no trust in a downstream tool.
- Rejected **(d) worker-script-only, host-owns-the-pool**: this is what `compresso-app` already
  had to build by hand (247 lines). Shipping only the worker script and asking every consumer to
  re-derive scheduling/cancellation/sizing is not "fully implemented workers" — it's the status
  quo with extra steps.
- **(a) wins**: main entry (`import { compress } from 'compresso.js'`) is completely unchanged —
  same file, same size, same behavior, zero risk to the ~2.5 KB claim, **except the two small,
  deliberate pipeline additions in §3.5** (the pixel guard and the HEIC-fallback narrowing),
  which apply to every consumer, not just pool users, because both close real gaps in the
  existing single-file path too. `compresso.js/pool` is a new, separate build artifact, imported
  only by consumers who want it, containing the generalized version of `compresso-app`'s proven
  `Pool`.

### 2.2 Versioning → **`1.0.0`, via `1.0.0-rc.1` soak, not a straight-to-`latest` tag**

The user has already decided to call this v1 — that's respected as-is. The plan's job is
making that a *credible* 1.0.0, not relitigating whether to call it v1. Concretely:
`1.0.0-rc.1` publishes to npm's `next` dist-tag first, `compresso-app` migrates onto it for real
(§8), and only after that migration re-passes its existing offline/EXIF verification — **plus
the independent second validation venue added in §8 after red-team review** — does `1.0.0`
promote to `latest`. This is the most real-world validation available before a stability
promise goes out to third-party consumers, stated honestly rather than oversold (§8's closing
note).

### 2.3 `compressMultiple`'s behavior contract → **untouched, unconditionally**

Directly follows from §2.1. This resolves the non-determinism/breaking-change risk the context
doc flagged (its §3 item 3) by simply not touching the thing that would have caused it. New
capability = new function at a new import path. Existing consumers (the website's `/tool`,
every third-party npm consumer) see zero behavior change even after upgrading to 1.0.0.

### 2.4 Bundle-size measurement → **measured in CI, gated, not estimated** (§7)

### 2.5 Non-browser (Node/SSR) environments → **detect and throw a clear, actionable error**

`compress()` gets one small addition (§3.7): if neither browser-main-thread nor worker-thread
primitives exist at all (`typeof Image === 'undefined' && typeof OffscreenCanvas ===
'undefined'`), throw immediately with a message naming the actual problem
("compresso.js requires a browser or Web Worker environment... guard calls with `typeof window
!== 'undefined'`") instead of failing deep inside the pipeline with a confusing "X is not a
function." Cheap (a few bytes, one guard clause), removes a real footgun for anyone using
compresso inside a framework with SSR (Next.js, Nuxt, SvelteKit all default to SSR-rendering
first-load code).

### 2.6 A capability-detection export for workers → **yes, `isPoolSupported()`**

Mirrors `isFormatSupported()` exactly. Lives in `pool.js`, not the main entry (so checking it
doesn't require paying for the pool's weight).

### 2.7 Test strategy → **Vitest (unit) + Playwright-backed browser tests (integration) +
size-limit (bundle guard)**, detailed in §7. One test runner family, not several — matches
"code must be minimal" applied to tooling, not just source. **Browser-matrix coverage for
Firefox/Safari, not just Chromium, is now required (not "periodic/manual") for the specific
suites that exercise worker lifecycle and backgrounding** — the original draft under-covered
exactly the engine (Safari) most likely to exhibit the failure modes §3.6 now defends against;
red-team review caught this mismatch.

### 2.8 `compresso-app`'s vendored copy → **fully retired**, per the migration in §8. The app's
specific policy choices (pool-size-minus-one for a reserved preview worker, "only the latest
preview request matters") stay at the app layer as ~15 lines of host code wrapping the generic
`createPool()`, rather than being baked into the library as defaults that only make sense for
one specific consumer.

### 2.9 `__setCapabilities`/`__resetCapabilities` → **stay private/advanced, undocumented in the
public README, but now genuinely optional** — `createPool()` calls `ensureCapabilities()`
internally and never requires the host to call `__setCapabilities` manually.

### 2.10 (new) `compressMany`'s partial-failure contract → **`Promise.allSettled`-shaped, never a
whole-batch rejection**

Red-team finding (backend review, §11): the original draft left this undefined — a genuine gap
for a function whose entire purpose is running many independent jobs where some will fail
independently of others. Resolved by reusing an existing, already-standard platform pattern
(§1.2 point 4): `compressMany` resolves to an array of `{ status: 'fulfilled', value:
CompressResult } | { status: 'rejected', reason: Error }`, one entry per input file, in input
order, and only rejects the outer promise for a caller error (e.g., a non-array argument) — never
because one of N files failed to decode. See §3.1 for the exact shape.

### 2.11 (new) Pool resilience: crash and timeout recovery → **both added, as a named
subsystem (§3.6), not left implicit**

Red-team findings (backend review finding #1, frontend review finding #4) independently
converged on the same gap from two different angles: the original design had no answer for a
worker that crashes natively (OOM, driver fault) or one that's silently suspended by the OS
(iOS backgrounding a tab) — both leave a job, and a pool slot, permanently stuck with no signal.
§3.6 adds native `onerror`/`onmessageerror` handling (catches the crash case) and a per-job
timeout with worker replacement (catches the silent-suspension case, and doubles as a defense
against the CPU-exhaustion DoS the security review separately identified — one mechanism, two
independent justifications, which is itself evidence it's the right fix rather than a
one-off patch).

### 2.12 (new) Resource-exhaustion guard → **two-stage: pre-decode probe (JPEG/PNG/WebP) +
post-decode check (all formats)**, not one post-decode check alone

The single strongest finding across all three reviews (security review finding #1): a
post-decode pixel check cannot prevent the resource exhaustion it's meant to prevent, because
`createImageBitmap`/`new Image()` have already fully materialized the pixel buffer by the time
`compress.js` reads `width`/`height`. §3.5 details the fix: a new, small, dependency-free
header-parsing module (`probe.js`) reads just the fixed-offset dimension fields of JPEG/PNG/WebP
headers — never decoding pixels — and rejects grossly oversized files *before* the expensive
decode call happens at all. The post-decode check stays too, as defense-in-depth and as the only
guard for HEIC/AVIF/URL sources, where header-only probing is materially harder (ISOBMFF box
parsing) and out of scope for this plan — stated as a documented residual limitation, not
solved.

---

## 3. Detailed technical design

Files touched, updated after §11's review (the original draft claimed a smaller diff than
turned out to be justified — three existing pipeline files need small, targeted changes, not
zero):

| File | Status |
|---|---|
| `src/index.js` | unchanged |
| `src/compress.js` | **small addition** — two-stage guard wiring (§3.5) |
| `src/platform.js` | **small addition** — HEIC-fallback magic-byte confirmation (§3.5) |
| `src/heic.js` | **small addition** — exports the magic-byte sniff helper (§3.5) |
| `src/resize.js` | unchanged |
| `src/utils.js` | unchanged |
| `src/probe.js` | **new** (§3.5) — header-only dimension probing |
| `src/pool.js` | **new** (§3.1, §3.6) |
| `src/worker.js` | **new** (§3.3) |

Every "small addition" is deliberately minimal and isolated — each is a guard clause or a new
exported helper, none restructure existing control flow. This keeps the risk profile close to
the original "nothing existing changes" intent even though, honestly, that intent didn't survive
contact with adversarial review.

### 3.1 NEW `packages/compresso/src/pool.js`

Generalizes `compresso-app/src/engine/pool.ts` (133 lines, proven, offline-verified), **plus
the resilience subsystem in §3.6**, which the reference implementation didn't have because a
single internal app could tolerate a rare silent hang in a way a published library cannot.
Target: under 150 lines (the resilience logic adds real lines over the original ~100-line
estimate — accepted, because it's fixing findings, not gold-plating).

```js
// pool.js — sketch of the required shape, not final code.

export function isPoolSupported() {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
}

export function defaultPoolSize() {
  // Memory-bound, not CPU-bound: every busy worker can hold a decoded ~12 MP bitmap.
  // hardwareConcurrency is a compute signal, not a memory one — see §3.6 note on why
  // this is a documented, known-imperfect default rather than a solved problem.
  const cores = Math.max(1, Math.min(navigator.hardwareConcurrency || 4, 8));
  // navigator.deviceMemory (Chromium-family only, GB, coarse-bucketed) refines the
  // estimate where available; where it isn't (Safari, Firefox), the core-based cap
  // alone is the — imperfect, documented — answer. A host targeting known low-RAM,
  // high-core-count hardware should pass an explicit lower `size`.
  const mem = /** @type {any} */ (navigator).deviceMemory;
  return mem && mem <= 4 ? Math.min(cores, 4) : cores;
}

export function createPool({ size, workerUrl, maxQueueLength, timeoutMs = 30_000 } = {}) {
  if (!isPoolSupported()) return createFallbackPool();
  return createWorkerPool({ size, workerUrl, maxQueueLength, timeoutMs }); // §3.1 body, §3.6 resilience
}
```

Both `createFallbackPool()` and `createWorkerPool()` return the **same shape**:

```ts
{
  compress(file, options?): Promise<CompressResult>;
  compressMany(files, options?, onProgress?): Promise<PromiseSettledResult<CompressResult>[]>; // §2.10
  cancel(id: string): void;
  destroy(): void;
  stats(): { size: number; busy: number; queued: number; recoveries: number }; // §3.6
}
```

Same return shape on both paths is the whole point — a host never branches on which one it got.

`compressMany`'s implementation (both paths) is a thin wrapper that runs every file's
`compress()` call, collects each as a settled result rather than propagating the first
rejection, and preserves input order — on the worker path this is `Promise.allSettled` over N
calls to the pool's own `compress()`; on the fallback path it's the same wrapper around
`compress.js`'s `compress()` directly, still fully serial, still `allSettled`-shaped for
contract consistency between the two paths (§2.10).

`createWorkerPool()`'s scheduling internals are `compresso-app`'s `Pool` class, generalized —
fixed set of `size` (default `defaultPoolSize()`) spawned workers, a FIFO task queue, a `pump()`
dispatch loop, capabilities probed once via `ensureCapabilities()` and handed to every worker
(host never touches `__setCapabilities`, §2.9). **One detail carried over unchanged and called
out explicitly so it doesn't get dropped during generalization**: the reference implementation's
message-receive handler already guards against stale/mismatched results —
`if (!slot?.task || slot.task.id !== msg.id) return;` — before accepting any `done`/`error`/
`progress` message. This is what prevents a late message from a just-cancelled or
just-timed-out job being misattributed to whatever new job that worker slot picks up next.
**Preserve this guard exactly; it is load-bearing, not incidental**, per the security review's
scrutiny of cross-job message attribution (§11, security finding #5). Job IDs are generated as a
per-pool-instance monotonic counter (`\`job-${++seq}\``) rather than the reference
implementation's `Math.random().toString(36)` — strictly safer (zero collision probability
within a pool's lifetime, not just low-probability) at no extra cost, and one line simpler than
justifying a random-string collision argument in code review.

`maxQueueLength` (optional, default `Infinity`): if set and exceeded, `compress()`/
`compressMany()` reject new work with `kind: 'queue-full'` instead of growing the queue
unboundedly. Opt-in, default behavior unchanged from the reference implementation.

`workerUrl` override (default `new URL('./worker.js', import.meta.url)`, resolved relative to
`pool.js`'s own built location — see §3.4) — the escape hatch for legacy bundlers or custom
worker hosting/CSP-nonce setups (§4.5).

### 3.2 The fallback path, precisely

This is the concrete implementation of "gracefully degrades depending on the environment":

```js
function createFallbackPool() {
  return {
    compress: (file, options) => compress(file, options),               // from ./compress.js
    compressMany: async (files, options, onProgress) => {
      const out = [];
      for (let i = 0; i < files.length; i++) {
        try {
          const value = await compress(files[i], { ...options, onProgress: /* wrap with fileIndex, mirrors index.js's compressMultiple */ });
          out.push({ status: 'fulfilled', value });
        } catch (reason) {
          out.push({ status: 'rejected', reason });
        }
      }
      return out;
    },
    cancel() {},
    destroy() {},
    stats: () => ({ size: 0, busy: 0, queued: 0, recoveries: 0 }),
  };
}
```

A host that always calls `createPool()` — never branching on environment itself — gets real
parallelism where the platform supports it and correct, unblocked, serial behavior everywhere
else, with **zero application-level `if` statements**. This is the single most important
property for the "modular, gracefully degrades" requirement in the original ask: the
degradation lives entirely inside the library, once, instead of being re-implemented by every
consumer.

### 3.3 NEW `packages/compresso/src/worker.js`

Generalizes `compresso-app/src/engine/worker.ts` (73 lines, proven). De-TypeScripted, imports
from the sibling main entry:

```js
import { compress, __setCapabilities } from './index.js';
// postMessage protocol, unchanged in shape from the reference implementation:
// { type: 'run', id, file, params, caps } / { type: 'abort', id }
// { type: 'progress', id, progress } / { type: 'done', id, result } / { type: 'error', id, message, kind }
```

Behavior is a direct, mechanical port: same `AbortController`-per-job map, same error-kind
classification (`decode` vs. `generic`, now joined by `too-large`, `timeout` — see §3.6), same
stripping of the main-thread-only `url` field before posting the result back. **What worker.js
does *not* handle — deliberately** — is its own crash or hang; that's out of scope for code
running *inside* the worker by construction (a worker that has crashed cannot run its own
recovery code). Crash and timeout handling live entirely on the pool side, watching the worker
from outside (§3.6) — this separation of concerns is why the resilience subsystem is a `pool.js`
addition, not a `worker.js` one.

### 3.4 Build wiring

Unchanged from the original plan, still the correct approach after review (none of the three
reviews found an issue here):

- `rollup.config.mjs` gets two new build inputs: `src/pool.js` → `dist/compresso.pool.mjs`,
  `src/worker.js` → `dist/compresso.worker.mjs`. Both ESM-only — real module workers and
  `import.meta.url`-relative worker discovery are fundamentally ESM concepts; a CJS/UMD consumer
  needing batch parallelism is, definitionally, already using a bundler, which can consume the
  ESM build directly.
- `pool.js`'s default worker discovery, `new URL('./worker.js', import.meta.url)`, resolves
  correctly at runtime because both built files ship as siblings in `dist/` — the same mechanism
  `compresso-app`'s own `pool.ts` already relies on in production, just shipped pre-built instead
  of raw source. This also means unpkg/jsdelivr CDN consumers get correct resolution with no
  bundler at all — verify explicitly during M3 with a real `<script type="module">` smoke test
  against a local `npm pack` tarball, not assumed.
- **Never** construct the worker via an inlined Blob URL, even as a "simpler" alternative — see
  §4.5 for why this is a deliberate, permanent rejection, not a style preference to revisit.

### 3.5 The resource-exhaustion guard, two-stage (§2.12)

**NEW `packages/compresso/src/probe.js`** — header-only dimension sniffing, no pixel decode,
zero dependencies, small enough to review by eye in one sitting (a real, load-bearing security
property in its own right — this code being short and simple is *why* it's trustworthy):

```js
// probe.js — cheap, header-only dimension sniff for JPEG/PNG/WebP. Reads a small byte
// prefix and returns declared dimensions without decoding a single pixel, so a crafted
// file with a huge declared resolution can be rejected before the expensive full decode
// (createImageBitmap / new Image()) even starts. HEIC and AVIF (ISOBMFF-based containers)
// are not covered here — see compress.js's post-decode check, which still applies to
// every format including these two. This is a documented, narrower guarantee for those
// formats, not a gap papered over.

export async function probeDimensions(blob) {
  const head = new Uint8Array(await blob.slice(0, 65536).arrayBuffer());
  return probePng(head) ?? probeJpeg(head) ?? probeWebp(head) ?? null;
}

// PNG: signature bytes 0-7, then the IHDR chunk's width/height at a fixed offset (16-23,
// big-endian). https://www.w3.org/TR/png/#11IHDR
function probePng(b) { /* ... */ }

// JPEG: walk marker segments looking for a Start-Of-Frame marker (0xFFC0-0xFFCF, excluding
// the DHT/JPG markers 0xC4/0xC8/0xCC), height/width follow at a fixed offset within it.
function probeJpeg(b) { /* ... */ }

// WebP: RIFF/"WEBP" container, then VP8/VP8L/VP8X sub-chunk-specific dimension encoding.
function probeWebp(b) { /* ... */ }
```

Wired into `compress.js`, immediately after the existing capability/format resolution and
*before* `decode()` is called:

```js
report(opts, 0.1, 'loading');
const maxPixels = opts.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS;

if (source instanceof Blob) {
  // Pre-decode: catches JPEG/PNG/WebP before the expensive decode allocates anything.
  // Scoped to Blob/File sources — probing a remote URL cheaply would need a ranged
  // fetch not every server honors; URL sources rely on the post-decode check below.
  const probed = await probeDimensions(source).catch(() => null); // a probe failure must
  if (probed && probed.width * probed.height > maxPixels) {       // never block a valid file
    throw Object.assign(new Error('Image exceeds the maximum decodable size'), { kind: 'too-large' });
  }
}

const { image, width: originalWidth, height: originalHeight } = await decode(source);
throwIfAborted(opts.signal);

// Post-decode: defense-in-depth for everything the pre-decode probe doesn't cover
// (HEIC, AVIF, string-URL sources, or a header that lied about its own dimensions).
if (originalWidth * originalHeight > maxPixels) {
  throw Object.assign(new Error('Image exceeds the maximum decodable size'), { kind: 'too-large' });
}
```

`DEFAULT_MAX_INPUT_PIXELS = 100_000_000` (100 MP — roughly 4× a 45 MP full-frame camera image).
New option `maxInputPixels` added to `CompressOptions` in `types/index.d.ts` and the README
options table. Applies on both the main-thread and pool/worker paths identically, since it's in
the shared pipeline — every existing consumer gets this defense for free on upgrade, not just
new pool users.

**The HEIC-fallback narrowing** (closing security review finding #2 — the existing
`isHeicSource()` heuristic's untyped/unnamed-blob branch was silently routing *any* mystery blob
into the WASM HEIC decoder, not just actually-HEIC-shaped ones):

`isHeicSource()` itself, in `heic.js`, **stays exactly as-is** — it's public API, documented as
a deliberately cheap, synchronous, no-bytes-read heuristic, and useful on its own for UI
purposes (its own doc comment already says so). Changing its signature to async to read magic
bytes would be a public breaking change this plan has no reason to make. Instead, `heic.js`
gains one new, small, exported (but not part of the public README-documented surface) helper:

```js
// heic.js — new export, used only by platform.js's decode() fallback (see below). Confirms
// a blob is actually HEIC/HEIF-shaped by its ISOBMFF `ftyp` box, rather than trusting
// isHeicSource()'s untyped/unnamed-blob heuristic alone to gate the WASM decode path.
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);

export async function sniffHeicMagic(blob) {
  const b = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (b.length < 12) return false;
  const isFtyp = String.fromCharCode(b[4], b[5], b[6], b[7]) === 'ftyp';
  return isFtyp && HEIC_BRANDS.has(String.fromCharCode(b[8], b[9], b[10], b[11]));
}
```

`platform.js`'s `decode()` (both the main-thread and worker branches) currently does, on native
decode failure: `if (!isHeicSource(blob)) throw err; image = await loadBitmap(await
decodeHeic(blob));`. That becomes: if `isHeicSource(blob)` is true **and** it's a typed/named
blob whose type or extension actually matched HEIC (the common, correctly-typed case — no
change needed there), proceed as today. If `isHeicSource(blob)` returned true *only* via the
untyped/unnamed fallback branch, additionally require `await sniffHeicMagic(blob)` before
calling `decodeHeic()` — if the magic bytes don't confirm it, re-throw the original native-decode
error instead of routing an arbitrary blob into the WASM decoder. Factor this into one small
shared helper both branches of `decode()` call, to keep the two nearly-duplicate branches DRY
rather than pasting the same check twice.

**What this two-part fix does and does not claim**: it closes the specific gap red-team review
found (arbitrary untyped blobs no longer reach the WASM decoder unconfirmed). It does not, and
cannot, add pre-decode *dimension* probing for HEIC itself (ISOBMFF box parsing for dimensions
is materially more involved than JPEG/PNG/WebP's fixed-offset headers, and out of scope for this
plan) — HEIC inputs still rely on the post-decode pixel check only, same as before. Stated
plainly per §1.3's non-goals, not implied to be fully solved.

**What this plan does *not* solve, stated honestly**: a pathologically-structured file that
decodes slowly *without* tripping the pixel-count guard (adversarial entropy coding, deeply
nested container structures) is a CPU-time exhaustion vector, not a memory one, and no
dimension check — pre- or post-decode — catches it. That's a different resource axis, addressed
by §3.6's per-job timeout instead, not by this section. The two mechanisms are complementary,
not redundant, and both are needed.

### 3.6 (new) Pool resilience: crash and timeout recovery

This subsystem exists entirely because of red-team review — two independent reviewers (backend,
frontend) converged on the same underlying gap from different angles, and the security reviewer
identified a third, related failure mode the same mechanism also fixes. See §11 for the full
findings; this section is the resolution.

**The gap, restated precisely**: the reference implementation's pool has no way to detect (a) a
worker that crashes natively — OOM kill, GPU driver fault mid-`convertToBlob`, a browser
bug — which never posts a cooperative `error` message because the worker is simply gone; (b) a
worker silently suspended by the OS/browser — most concretely, iOS Safari backgrounding a tab —
which also posts nothing, indefinitely; or (c) a job that's simply slow enough to starve a pool
slot regardless of cause (including the CPU-exhaustion scenario in §3.5's closing note). All
three present identically from the caller's side: a promise that never resolves.

**The fix, two independent, complementary mechanisms:**

1. **Native crash detection.** Each spawned `Worker` instance gets `worker.onerror` and
   `worker.onmessageerror` handlers (set once, at spawn time, in addition to the existing
   cooperative `onmessage` handler) — these fire for exactly the failures a cooperative
   postMessage protocol cannot self-report. On either event: reject that worker's in-flight job
   with `kind: 'generic'`, `.terminate()` the dead worker, spawn a fresh replacement in the same
   pool slot, and resume `pump()`. This is the direct fix for "batch compression hung" with no
   recourse — the pool now self-heals instead of silently losing a slot forever.
2. **Per-job timeout, `timeoutMs`** (default `30_000`, override via `createPool({ timeoutMs })`,
   `Infinity` to disable). A timer starts when a job is dispatched to a worker; if neither
   `done` nor `error` arrives before it fires, treat it exactly like a crash — reject with
   `kind: 'timeout'`, terminate and replace that worker (a worker that's been silent for 30s on
   a bounded-size image is not trusted to still be making progress; replacing it is cheap
   insurance), resume `pump()`. This is what catches the silent-suspension case (a) native error
   events don't fire for, and independently bounds the CPU-exhaustion DoS scenario from §3.5.

**Observability**: `pool.stats()` (§3.1's returned shape) exposes `{ size, busy, queued,
recoveries }` — `recoveries` is a running count of crash/timeout-triggered worker replacements
since the pool was created. This is deliberately minimal (a counter, not a logging/telemetry
system — matches "code must be minimal") but gives a host something concrete to attach to a bug
report ("3 recoveries out of 40 jobs" is a real, actionable signal) without the library taking
on an opinionated telemetry stack it has no business owning.

**What this deliberately does not do**: no automatic pause/resume tied to `visibilitychange`,
and no attempt to distinguish "genuinely crashed" from "OS-suspended, will resume shortly" —
the library cannot reliably tell those apart, and guessing wrong in either direction is worse
than a consistent, simple rule (timeout → replace, always). A host that wants
backgrounding-aware behavior (e.g., pausing new dispatch while `document.hidden`, not just
recovering after the fact) can build that at the host layer using `pool.stats()` and the
existing `cancel()`/`destroy()` primitives — this is host UI policy, not a generic library
concern, same reasoning already applied elsewhere in this plan (§2.8).

### 3.7 Non-browser environment guard (§2.5)

One small addition, in `compress.js`, at the very top of the pipeline:

```js
if (typeof Image === 'undefined' && typeof OffscreenCanvas === 'undefined') {
  throw new Error(
    'compresso.js requires a browser or Web Worker environment; it cannot run in ' +
    'Node.js or during server-side rendering. Guard calls with `typeof window !== ' +
    "\"undefined\"` or a dynamic import."
  );
}
```

### 3.8 `types/pool.d.ts` (NEW) + `types/index.d.ts` (UNCHANGED)

New file, not an edit to the existing types file — keeps the main entry's public type surface
byte-for-byte unchanged. Generalizes `compresso-app/src/engine/types.ts`: `PoolOptions` (now
including `timeoutMs`, `maxQueueLength`, `workerUrl`), `Pool` (the §3.1 shape, including
`stats()`), `WorkerRequest`/`WorkerResponse` (kept internal, not exported), and the extended
error `kind` union: `'decode' | 'aborted' | 'unsupported' | 'too-large' | 'queue-full' |
'timeout' | 'generic'`.

---

## 4. Security — deep dive

Security was named explicitly as a first-class concern, equal to speed/size/performance. This
section survived an independent adversarial security review (§11) — three of its six original
sub-claims needed real strengthening, not just polish, and are marked below where that happened.

### 4.1 Threat model

Compresso runs **untrusted, attacker-controllable input** as a matter of course: any web app
using it to handle a user-uploaded image is, by construction, handing compresso
attacker-influenceable bytes. "Malicious image file" is the primary, realistic threat class this
section addresses — not a hypothetical.

Assets to protect, in priority order: (1) the user's device — no crash, no unbounded resource
consumption, no code execution outside the existing sandbox; (2) the user's data — no
exfiltration, which the library's zero-network architecture already guarantees structurally;
(3) the host application's integrity — no way for a crafted image to affect anything outside the
compression call itself.

### 4.2 Decoder attack surface — real, but narrower than originally claimed

Compresso implements **zero custom image-parsing code** for JPEG/PNG/WebP/AVIF. Every decode for
those formats goes through the browser's own native `Image`/`createImageBitmap`/
`OffscreenCanvas` pipeline — the same, already-hardened, already-fuzzed-for-years code path that
renders every `<img>` tag on the web. There is no compresso-specific parsing vulnerability
surface for these formats, because there is no compresso-specific parsing code.

The highest-profile recent image-format CVE, **CVE-2023-4863** (a `libwebp` heap buffer
overflow, exploited in the wild via a malicious WebP), illustrates the point: it affected every
piece of software bundling its own copy of `libwebp` — including browsers' own decoders at the
time, patched centrally. **Bundling your own codec means carrying that codec's vulnerabilities
on your own release cadence; delegating to the browser means inheriting the vendor's larger,
faster security response instead.**

**This claim was originally overstated, and red-team review caught it (security finding #2)**:
`heic.js`'s `isHeicSource()` heuristic treats *any* untyped, unnamed blob as a HEIC candidate,
and `platform.js`'s `decode()` fallback used to route such a blob into the WASM HEIC decoder
unconditionally on native-decode failure — meaning the "zero custom parsing surface" claim was
true for correctly-typed files but silently false for the untyped-blob edge case, which actively
*widened*, not narrowed, what could reach the one real native-decode risk in the codebase. §3.5
closes this with a cheap magic-byte confirmation before that fallback fires. With that fix in
place, the claim in this paragraph holds as stated; without it, it didn't, and this document
should not have said otherwise in its first draft.

### 4.3 Resource exhaustion via crafted dimensions — now genuinely closed for the common case

The most realistic compresso-specific risk is not a decode *vulnerability* (§4.2) — it's
**resource exhaustion via a decoder faithfully doing what a tiny, valid-looking file tells it
to**: a file of a few KB can declare pixel dimensions in the tens of thousands per side, and a
faithful decoder will attempt to allocate the resulting raw-pixel buffer — a "pixel flood," the
image analogue of a decompression bomb.

**The original draft of this plan checked for this only after calling `decode()`** — and
`createImageBitmap`/`new Image()` fully materialize the pixel buffer as part of resolving, so a
post-decode check runs *after* the expensive, potentially-OOM-triggering allocation has already
happened. Security review caught this precisely (finding #1) and it was the single strongest
finding across all three independent reviews. §3.5's fix is now two-stage: a header-only,
zero-decode dimension probe (`probe.js`) runs *before* `decode()` for JPEG/PNG/WebP `Blob`/`File`
sources — the common case, user-uploaded files — rejecting grossly oversized files before any
expensive allocation happens at all. The post-decode check remains as defense-in-depth and as
the *only* guard for HEIC, AVIF, and string-URL sources, where cheap header-only probing is
materially harder or (for remote URLs) requires cooperation the library can't guarantee. That
narrower coverage is stated explicitly (§1.3, §3.5's closing note), not implied to be uniform
across every source type.

**Time, not just memory, is a resource an attacker can exhaust**, and no dimension check —
before or after decode — catches a file that's merely slow to decode or re-encode regardless of
final pixel count (adversarial entropy coding, pathological container structures). §3.6's
per-job `timeoutMs` is the actual mitigation for this axis; it is a genuinely separate mechanism
from the pixel guard, not a restatement of it, and both are necessary.

**Batch-level exhaustion** (many files queued concurrently) is bounded independently: pool size
caps at a memory-aware default (§3.1), and the optional `maxQueueLength` lets a host cap pending
jobs. Left `Infinity` by default — this is host policy, not something the library should
silently enforce for everyone.

### 4.4 Output cannot itself become a resource-exhaustion vector

Unchanged from the original review — none of the three red-team passes found an issue here. The
never-bigger guarantee (existing invariant, unmodified by this plan) means lossy output
(JPEG/WebP/AVIF) is provably ≤ source size. PNG is exempt from that guarantee, but PNG output
still comes from the browser's own encoder operating on already-decoded, already-bounded pixel
data — there is no attacker-controlled path to hand-craft PNG byte structure, so PNG output size
is bounded by pixel count the same way any normal PNG encode is, not amplifiable.

### 4.5 CSP and worker construction

`new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })` requires the host
page's CSP to permit the worker's origin via `worker-src` (or the `script-src`/`default-src`
fallback chain) — same-origin, since the worker file ships alongside the app's own bundle.
Documented in the README's new "Batch & Workers" section (§9, M4), with a clear error surfaced
if worker construction is blocked (the pool's construction path catches that specific failure
and falls back to `createFallbackPool()`'s behavior rather than throwing uncaught, so a
CSP-restricted host still gets correct — just serial — behavior).

**Gap red-team review found and this plan now closes (security finding #4)**: the original CSP
guidance covered `worker-src` but never mentioned that `heic-to`/libheif's
`WebAssembly.instantiate()` requires either `'wasm-unsafe-eval'` (the dedicated, narrower CSP
source for WASM) or the broader `'unsafe-eval'` under a strict `script-src`. A
security-conscious host that locks down CSP per this plan's *original* `worker-src`-only
guidance would see HEIC support silently break with no documented cause. Fixed two ways: the
README explicitly documents the `'wasm-unsafe-eval'` requirement alongside `worker-src`, and
`heic.js`'s `decodeHeic()` gets a try/catch around the WASM instantiation path so a CSP-blocked
instantiation surfaces as a clear, actionable error (pointing at the CSP requirement) instead of
an opaque WASM failure.

**Deliberate, permanent rejection, stated explicitly so it isn't "simplified" back in during
implementation**: never construct the worker via an inlined Blob URL, even though it would
sidestep relative-URL resolution questions. That approach requires the broader `worker-src
blob:` CSP allowance (a strictly less secure default many security-conscious hosts deliberately
omit), and an inlined worker's source is harder to audit, harder to Subresource-Integrity-pin,
and harder to reason about than a real, separately-addressable file. Real files, real CSP, real
auditability — chosen deliberately over cleverness. None of the three reviews challenged this
choice; it stands unchanged.

### 4.6 postMessage protocol trust boundary — strengthened after review

The `WorkerRequest`/`WorkerResponse` protocol is a private implementation detail, constructed
exclusively by `pool.js`, never by host code directly — there is no attacker-reachable injection
path into it beyond the file-input threat model §4.1/§4.3 already cover. That much survived
review unchanged.

**What review correctly pushed on (security finding #5)**: "not a trust boundary" answers
*injection*, but not *scheduling-bug cross-job leakage* — could a late or stale message from an
aborted/timed-out worker be misattributed to a different, newer job occupying that same pool
slot, delivering job A's result to job B's caller? §3.1 now states explicitly that the reference
implementation's existing stale-message guard (`slot.task.id !== msg.id` before accepting any
message) must be preserved exactly during generalization, paired with monotonic (not
random-string) job IDs for a stronger, easier-to-reason-about collision guarantee. This was
already correct in the reference implementation; the risk was losing it silently while
generalizing the code, not a defect in the design being copied from. Naming it explicitly in the
plan is the fix.

### 4.7 Supply chain

`heic-to` (the one place compresso carries real native-decoder-class risk, wrapping compiled
`libheif`) stays an optional, lazily-imported dependency, unchanged. **Review correctly noted
(security finding #6)**: because it's optional, the *host's* lockfile — not compresso's —
resolves the actually-installed version, so compresso pinning a reviewed range in its own
`package.json` only governs compresso's own tests/CI, not what ships to a given consumer's
users. Stated honestly rather than oversold: the real, available mitigation is that §3.5's
magic-byte narrowing shrinks *how much untrusted input reaches `heic-to` at all*, regardless of
which version a given host has installed — a reduction in exposure, not a version-pinning
guarantee this plan cannot actually make on a host's behalf. Recommend (low-effort, not blocking
M0–M6): enabling GitHub Dependabot security alerts on the repo if not already on, verified during
M0.

New devDependencies (Vitest, Playwright, size-limit) never ship to consumers — stated explicitly
so this is never conflated with the zero-required-runtime-dependency promise, which is
unaffected.

**Re-assert the zero-network-calls invariant as a checkable property, not just a claim**: a
trivial CI guard (grep the built `dist/` output for `fetch(`, `XMLHttpRequest`, `WebSocket`
outside the known, optional, lazy `heic-to` import path) — cheap, concrete, catches an accidental
regression before it ships.

Update `SECURITY.md` to name, explicitly: the no-custom-native-decoders architecture with its
now-accurate scope (§4.2), the two-stage pixel-dimension guard (§4.3), and the
`wasm-unsafe-eval` CSP requirement for HEIC support (§4.5) — these are documented, load-bearing
security properties of the design, not implementation details a reader would have to infer.

---

## 5. Objections, addressed directly

Both subsections below were independently red-teamed (§11). Each objection's response is marked
where review found the original rebuttal incomplete and required a real rewrite, not just
softer language.

### 5.1 "This kind of work belongs on the backend" (the systems/backend engineer's objection)

**Steelmanned:** important, expensive computation belongs on infrastructure you control —
consistent hardware, consistent codec versions and output, the ability to apply server-side
business logic, rate-limiting, and audit trails. Client-side execution means every user's device
is a different, uncontrolled, unaudited execution environment. "Run it in the browser" has also
historically been how crypto-mining malware hides — unbounded background CPU stolen from
unsuspecting users via exactly this Worker+WASM pattern.

**Response, point by point:**

1. **Privacy is architectural, not a feature you add to a backend design — it's the one thing a
   backend design structurally cannot offer.** Every backend-based competitor surveyed in
   `PRODUCT_CONTEXT.md`'s competitive landscape uploads the user's file as a precondition of
   working at all. Client-side isn't a worse version of the backend approach for this problem —
   it's the only architecture where the answer to "who else saw my photo" is provably "no one."
2. **The economics run the other way.** A backend service costs money per image and per byte
   transferred, scales operational cost with usage, and needs its own security posture. A
   client-side library costs the maintainer nothing per use, scales to unlimited users for free,
   and its "backend" is the browser vendor's own native codec team — already funded, already
   running on every device.
3. **Latency isn't close.** Even a fast backend round-trip is bounded by upload bandwidth for a
   full-resolution photo plus network RTT, before processing even starts. Client-side has zero
   network component in the critical path.
4. **On "consistent codec versions" — this was answered with the wrong argument in the original
   draft, and review caught it (backend finding #3).** The original response argued codec
   *quality* ("browsers' native encoders are already extremely mature"), which doesn't address
   what the objection is actually about: *determinism*. Answered honestly instead: **compresso
   does not, and cannot, guarantee byte-for-byte identical output across different browser
   engines or versions for the same input and options** — different native encoders will
   produce different compressed bytes even when every documented guarantee (never-bigger, format
   priority order, dimension math) holds identically. This was already implicitly true of the
   single-file `compress()` path before this plan; the pool doesn't change it, it just makes the
   property more visible (§6.1's benchmark methodology already runs three separate device
   classes precisely because of this). **For a use case that genuinely needs reproducible,
   content-hashable output — a server-side cache keyed by output bytes, a compliance requirement
   for deterministic artifacts — a backend pinned to one codec binary is the correct tool, and
   this plan says so plainly rather than force-fitting compresso's positioning onto a requirement
   it doesn't serve.** What compresso *does* guarantee consistently, across every environment, is
   the *contract* — the never-bigger promise, the format-priority order, the dimension math —
   not the exact output bytes. That's a real, defensible, narrower claim, and it's the honest one.
5. **The crypto-mining comparison, examined honestly, argues for this design rather than against
   it.** What makes that pattern alarming is that it's *unbounded, hidden, unauthorized*
   background computation, run for someone else's benefit, without the user's knowledge.
   Compresso is the structural opposite on every axis: explicitly user-initiated, bounded (a
   fixed, small worker pool, always explicitly torn down via `destroy()`, now with the crash/
   timeout resilience in §3.6 actively preventing the "stuck forever" failure mode that would be
   the closest thing to this objection's real fear), transparent (MIT-licensed, auditable,
   `probe.js`'s brevity in §3.5 is itself part of that auditability), and value-returning.
6. **Operational debuggability — a gap the original draft genuinely had, and review caught it
   (backend finding #2).** "Trust the client" is a much weaker claim if a maintainer has no way
   to diagnose a field report of "batch compression hung" with no server logs. §3.6's
   `pool.stats()` (`{ size, busy, queued, recoveries }`) exists specifically so a host has
   something concrete to capture and attach to a bug report — deliberately minimal (a counter,
   not a telemetry pipeline), but real, and previously absent.
7. **Where the objection is simply correct, concede it plainly:** backend processing is the
   right call when you need server-enforced business logic the client can't be trusted with,
   when the workload needs models too large to ship to a browser, when a guaranteed
   client-independent audit trail is a hard requirement, or (per point 4) when byte-for-byte
   reproducible output is itself the requirement. Compresso's problem — shrink a file the user
   already trusts the host app with, for the user's own benefit — is not one of those.

### 5.2 "This will be too heavy for the browser, impractical on real devices" (the frontend/perf engineer's objection)

**Steelmanned:** Workers plus `OffscreenCanvas` plus large batches will jank the page, drain
battery, and choke on low-end mobile hardware; JS/WASM is inherently slower than native code;
shipping this will make host apps feel slow and bloated, not fast.

**Response, point by point:**

1. **Bundle weight is quantified and gated, not asserted.** The main entry stays ~2.5 KB gzip
   regardless of the pool feature (plus the two small, deliberate pipeline additions in §3.5,
   which are the only main-entry size cost this plan carries, and get measured like everything
   else). A developer who never imports `compresso.js/pool` pays nothing beyond what §3.5 adds,
   provably, because CI fails the build if it drifts (§7).
2. **Workers separate total CPU work from main-thread janking — this is real and mechanical, but
   review correctly pushed back on how it was originally stated (frontend finding #1).** The
   original draft claimed the interface "stays at 60fps whether background CPU usage is 10% or
   100%" as settled fact. That overstates it: sustained multi-core load can cause package-level
   thermal throttling on real mobile SoCs that downclocks *every* core, including whatever core
   the main thread happens to be scheduled on — the phone has no isolated per-thread thermal
   budget. Structured-clone marshaling of results back through `postMessage` is also real, if
   small and bounded, main-thread work, not free. What's true and stays true: workers eliminate
   the *specific* mechanism (synchronous decode/encode calls blocking the event loop) by which
   this exact library previously janked the main thread — that's mechanical, not asserted. Where
   it's genuinely unproven is sustained thermal behavior on constrained hardware, which §6.1's
   benchmark plan now explicitly measures rather than assumes (§6.1's extended device/duration
   matrix, added after this same review).
3. **Memory bounding — real, but review correctly identified it as a compute-count heuristic
   wearing a memory-bound justification (frontend finding #2), and it's been strengthened.**
   The original `Math.min(hardwareConcurrency, 8)` formula reads core count, not RAM — a cheap
   octa-core, 2–3 GB-RAM "Go edition" Android device (exactly the privacy-conscious,
   no-upload-needed audience this library targets) would size a pool to 8 despite having no
   memory headroom for it. §3.1's revised `defaultPoolSize()` additionally consults
   `navigator.deviceMemory` where available (Chromium-family) and caps lower on
   detected-low-memory devices; where no such signal exists (Safari, Firefox — the majority of
   iOS), the core-based cap remains a **documented, known-imperfect default**, not a solved
   problem, and `size` stays fully overridable for a host that knows its target hardware better
   than a generic heuristic can. §3.5's `maxInputPixels` guard bounds the worst case per
   individual image on top of this, independent of pool size.
4. **Battery cost is bounded by the pool being fixed-size and finite-duration** — it processes
   only what's explicitly queued, then idles or terminates. **The original draft's comparison to
   "scrolling a media-heavy feed" was an unsupported analogy and review correctly flagged it
   (frontend finding #5) — it's removed.** No comparative battery claim is made without a
   measurement to back it; §6.1 is where that measurement, if pursued, belongs.
5. **None of this is exotic technology.** `Worker`, `OffscreenCanvas`, `createImageBitmap`,
   `convertToBlob` are Baseline-widely-available since March 2023 across Chrome, Firefox, and
   Safari including iOS 16.4+. This is evidence the *API exists and is broadly shipped* — not, by
   itself, evidence it behaves identically under real iOS tab-lifecycle conditions (background
   suspension), which is a different question §3.6's timeout/crash recovery now answers
   structurally rather than by assuming the API's mere existence is sufficient (frontend finding
   #4).
6. **"JS/WASM is slower than native" is true and doesn't apply to this plan's scope.** Compresso
   ships **no WASM codec** for JPEG/PNG/WebP/AVIF — it calls the browser's own native encoder
   (`canvas.convertToBlob`), the same compiled, often hardware-assisted code path a native
   desktop app would use. This objection applies to `compresso-app`'s *hypothetical future* WASM
   "Maximum engine," explicitly out of scope here.
7. **Where the objection is simply correct, concede it plainly:** a low-end device processing a
   very large batch of very large photos at once will feel it — that's real work, not overhead.
   This plan's honest answer is making the cost visible and boundable (`onProgress`,
   cancellation, `maxQueueLength`, `pool.stats()`) and documenting, not hiding, the tradeoff for
   hosts building very-large-batch UIs.

---

## 6. Performance & benchmarking

Speed claims get made in this space constantly and rarely get measured. This plan requires a
number before any claim ships in copy. **§6.1's device and measurement matrix was extended after
red-team review found the original plan's fleet ("a recent desktop, a mid-range Android phone,
an older iPhone") would validate the memory-bound sizing claim without ever testing the device
tier most likely to break it, and would report clean single-run timings that a sustained,
thermally-realistic batch would not reproduce (frontend findings #1, #3).**

### 6.1 What gets measured, and against what baseline

Using the existing `_assets/{heic,jpg,png}/` test corpus and the already-instrumented `time`
field (`website/src/lib/compress.js` already measures `performance.now()` around `compress()` —
reusable, not new instrumentation):

1. **Pool vs. serial, same corpus, same machine.** N files (N = 20, 50, 200) through
   `compressMultiple` (serial) vs. `createPool().compressMany` (parallel), wall-clock time, on
   **four** device classes, not three — the fourth, added after review, is a genuinely
   low-end/low-RAM device (an Android "Go edition" or ≤3 GB RAM device), specifically because
   that's the tier §3.1's `deviceMemory`-aware sizing claims to protect, and an unfalsified claim
   isn't a validated one.
2. **Sustained-batch thermal behavior, not just a single clean run.** Run the largest batch (200
   files) to completion and record per-chunk timing throughout, not just a total — a phone that
   throttles partway through a long batch should show it in this data, not be hidden by
   averaging into one number.
3. **Cold-start worker-spawn cost, isolated.** `size` × `new Worker()` context creation/module
   load, measured and reported separately from the parallelism multiplier — added after review
   noted this cost was previously uncounted and could make small batches *slower* than serial on
   some devices (frontend finding #6), a real possibility this plan should measure rather than
   assume away.
4. **Main-thread responsiveness under load.** While a large batch runs through the pool, measure
   input-to-paint latency for an unrelated UI interaction (e.g., a slider drag) — the falsifiable
   version of "the UI stays responsive," now stated without the overclaimed "60fps regardless"
   framing §5.2 point 2 corrected.
5. **Memory ceiling, empirically**, across all four device classes including the low-end tier.
6. **Fallback-path parity.** Confirm `createPool()`'s fallback path produces byte-identical
   output to calling `compress()`/`compressMultiple` directly.

### 6.2 What claims are and aren't licensed by this data

- "N× faster than the same batch run serially" — licensed once §6.1.1 produces a real number,
  **per device class, including the low-end tier** — do not average across device classes into
  one headline number; state the range, and state plainly if the low-end tier shows a smaller
  multiplier or a regression on small batches (§6.1.3's cold-start cost could produce exactly
  that on a slow device with a small batch — report it if so, rather than cherry-picking the
  device class that looks best).
- "100x faster than upload-based tools" (the existing product-level claim) is a *different*,
  already-defensible comparison (network round-trip vs. none) — this benchmark doesn't re-prove
  that one.
- **No byte-for-byte output reproducibility claim across browsers or versions** — §5.1 point 4
  now states explicitly why this can't be promised.
- "Beats ImageOptim" or similar native-app comparisons are explicitly **not** addressed by this
  plan — a codec-quality question, not a worker-pool-parallelism one.

---

## 7. Testing & CI

No test infrastructure exists today. This plan adds one test runner family, not several.

### 7.1 Tooling choice: Vitest + Playwright provider, size-limit

- **Vitest** for everything — jsdom for pure logic (fast, no browser needed); the same runner's
  browser mode (`@vitest/browser`, Playwright provider) for anything touching `Worker`,
  `OffscreenCanvas`, `createImageBitmap` (jsdom doesn't implement these).
- **size-limit** (`@size-limit/preset-small-lib`) for the bundle-size gate.
- All devDependencies only — §4.7 covers why this doesn't affect the zero-required-dependency
  promise.

### 7.2 What gets tested, concretely

**Unit (jsdom, fast, run on every push):**
- `utils.js`, `resize.js` — as originally planned, unchanged by review.
- **`probe.js`** (new, per §3.5) — a small fixture set of real-format header bytes (a valid
  small JPEG/PNG/WebP header, plus a synthetic header declaring an oversized resolution for
  each format) confirms correct dimension extraction and correct rejection, without needing any
  real oversized file on disk.
- **`heic.js`'s `sniffHeicMagic`** (new, per §3.5) — a fixture confirming a real HEIC `ftyp` box
  passes and an arbitrary untyped/unnamed non-HEIC blob does not — this is the direct regression
  test for security finding #2.
- `pool.js`'s scheduling logic — `pump()`/queue/cancel behavior with a dependency-injected mock
  `Worker`, **now including**:
  - a mock worker that never responds (timeout path) — confirms `kind: 'timeout'`, worker
    replacement, and `pool.stats().recoveries` incrementing (§3.6).
  - a mock worker whose `onerror` fires mid-job (crash path) — same assertions.
  - `compressMany`'s `Promise.allSettled` shape — a batch with a deliberately failing input
    confirms the batch promise still resolves, with the correct per-item `status`/`reason`
    (§2.10).

**Browser integration (Playwright-backed, real engine):**
- Chromium on every push. **Firefox and Safari are now required for the worker-lifecycle and
  crash/timeout suites specifically** (not "periodic/manual," per §2.7's revision) — review
  correctly noted the original plan under-covered exactly the engine (Safari) most likely to
  exhibit the backgrounding/suspension behavior §3.6 exists to handle.
- `compress()` end-to-end against the real `_assets/` corpus: JPEG, PNG, WebP, AVIF, HEIC.
- The EXIF orientation fixture test, reusing `_assets/jpg/exif-orient-6.jpg`.
- Never-bigger property test across the whole `_assets/` corpus.
- Pool actually parallelizes — timing-based smoke test.
- Cancellation actually stops work.
- Fallback path exercised directly (force `isPoolSupported()` false).
- `maxInputPixels` guard, both stages — a synthetic oversized-header fixture confirms the
  pre-decode rejection fires (and that decode is never called — assert via a spy/mock, not just
  the error), and a mocked post-decode result confirms the second-stage check independently.

### 7.3 Known bugs to write regression tests for, specifically

Carried over from the reference implementation's own history (`PWA_PLAN.md` §14), each still
gets a named regression test during M2:
1. Pool recreated after unmount reusing already-terminated workers.
2. EXIF orientation divergence between decode paths.
3. Any pool-size/timing assumption resurfacing as a race — now additionally covered by the
   crash/timeout mock-worker tests above, which didn't exist in the original test plan.

### 7.4 CI changes to `.github/workflows/ci.yml`

Three new jobs, additive to the existing `build`/`website` jobs: `test` (Vitest unit, jsdom,
existing Node matrix), `test-browser` (Vitest + Playwright, **now running the worker-lifecycle
suite across Chromium, Firefox, and Safari**, not Chromium-only), `size` (size-limit, ceilings
set ~10% above the real numbers measured during M3).

`CONTRIBUTING.md`'s "test across browsers when touching compression logic" line is replaced with
the concrete `npm test` / `npm run test:browser` instructions.

---

## 8. Migration: retiring `compresso-app`'s vendored copy

Sequenced steps, in the `compresso-app` repo, after `1.0.0-rc.1` publishes. **This soak was the
subject of the one finding all three reviews touched on from different angles (backend finding
#6 most directly): validating that the extraction didn't regress the app it came from is not the
same as independent validation.** Step 8 below is new, added specifically to address that.

1. `npm i compresso.js@^1.0.0-rc.1` (later re-run against the final `1.0.0` tag).
2. Delete `src/engine/core/`, `src/engine/pool.ts`, `src/engine/worker.ts`, `src/engine/types.ts`.
3. Repoint the two call sites `engine/core/README.md` already names to
   `import { createPool, isPoolSupported } from 'compresso.js/pool'`.
4. Recreate the app's "only the latest preview request matters" policy as a ~15–20 line
   host-level wrapper around `createPool({ size: 1 })` — exactly what the reference
   implementation's `PreviewWorker` already was internally.
5. Re-run the app's own existing offline/EXIF verification steps against the new import,
   confirming zero regression.
6. Delete `src/engine/core/README.md` (no longer applicable).
7. **New, independent second validation venue**: extend one of `compresso/examples/`
   (`vue`/`react`/`vanilla` — `vanilla` is the lowest-effort choice, no framework build step
   needed) with a minimal batch example using `compresso.js/pool`, and manually exercise it
   across at least Chromium and Safari, independently of `compresso-app`'s own CI. This is a
   deliberately small addition — not a second production app — whose entire purpose is
   confirming the library behaves correctly for *a* consumer that isn't the one it was extracted
   from, which the compresso-app-only soak alone cannot demonstrate.
8. **State the validation scope honestly in the `1.0.0` release notes**, rather than implying
   broader coverage than actually exists: "battle-tested in production inside `compresso-app`;
   validated independently against the `examples/vanilla` batch sample across Chromium and
   Safari; broader third-party validation will come from real-world usage post-release." This is
   a true, bounded claim — a single migrated app plus one independent example across two engines
   is meaningfully more than the original plan's bare compresso-app-only soak, but it is still
   not equivalent to diverse third-party production usage, and the release notes should not
   imply otherwise.
9. Only after steps 1–8 pass cleanly does `1.0.0` promote from `next` to `latest` (§2.2).

---

## 9. Milestones

Each row's "Done when" is an objectively checkable condition. **M0's and M2's criteria expanded
after red-team review** — the original milestones didn't yet account for the two-stage guard,
the HEIC-fallback fix, or the resilience subsystem, all of which didn't exist until review
surfaced the need for them.

| # | Deliverable | Done when |
|---|---|---|
| **M0** | Security baseline: two-stage `maxInputPixels` guard (`probe.js` + post-decode check, §3.5), HEIC-fallback magic-byte narrowing (§3.5), `SECURITY.md` updated (§4.7), confirm Dependabot/security-alert status | Both guard stages have passing unit tests (§7.2); the two-stage guard runs false-positive-free against the full `_assets/` corpus; the `sniffHeicMagic` regression test passes; `SECURITY.md` names all three documented properties (§4.2, §4.3, §4.5's `wasm-unsafe-eval` note) |
| **M1** | Test & tooling foundation: Vitest + Playwright (Chromium/Firefox/Safari) + size-limit wired into CI, before any pool code lands | CI has green `test`, `test-browser` (all three engines), `size` jobs with zero pool code present yet |
| **M2** | `pool.js` + `worker.js` + `probe.js` (§3.1–3.7), including the resilience subsystem (§3.6) and `Promise.allSettled`-shaped `compressMany` (§2.10) | All §7.2/§7.3 tests pass, including the fallback-path test, the crash/timeout mock-worker tests, and the `compressMany` partial-failure test |
| **M3** | Build & packaging: rollup multi-entry, `exports` subpath, `dist/compresso.pool.mjs` + `dist/compresso.worker.mjs` sibling resolution verified | A `npm pack` tarball, installed in a scratch project, successfully imports `compresso.js/pool` and runs a real parallel batch; a plain `<script type="module">` CDN-style smoke test also succeeds; bundle sizes recorded in `CHANGELOG.md`, size-limit ceilings set from the real numbers |
| **M4** | Documentation: README "Batch & Workers" section (including `maxInputPixels`, the CSP `worker-src`/`wasm-unsafe-eval` notes, `pool.stats()`), migration guide pointer to §8 | A reader with no source access can wire up `compresso.js/pool` correctly from docs alone |
| **M5** | Publish `1.0.0-rc.1` to npm's `next` tag; execute the full `compresso-app` migration including the new §8 step 7 independent example venue | `compresso-app` fully migrated off its vendored copy, its own offline/EXIF verification re-passes; the `examples/vanilla` batch sample works across Chromium and Safari; zero regressions found |
| **M6** | Promote to `1.0.0` / `latest` | `npm view compresso.js version` returns `1.0.0`; release notes include §8 step 8's honest validation-scope statement |
| **M7** *(stretch, non-blocking)* | Standardization groundwork: a public, WICG-style explainer document, informed by real `1.0.0` usage | Explicitly deferred until after M6 ships and accrues real adoption |

M0 and M1 both block M2. M0 grew relative to the original draft specifically because red-team
review found the security guard it was meant to ship was incomplete — this is the milestone
table reflecting that finding, not scope creep for its own sake.

---

## 10. Non-goals / guardrails (carried forward, and extended)

- Every guardrail from `LIB_V1_WORKERS_CONTEXT.md` §4 still applies unchanged: no required
  dependencies added to `packages/compresso`; the five existing pipeline invariants stay intact;
  do not conflate this work with `compresso-app`'s WASM "Maximum engine"; do not ship a size
  number without measuring it.
- Do not add a blob-URL-inlined worker construction path, ever (§4.5).
- Do not let `compressMultiple`'s existing behavior change without a major-version bump
  considered explicitly (§2.3).
- M7 does not start before M6 ships (§9).
- **New, from review**: do not claim byte-for-byte output reproducibility across browser engines
  or versions, in any documentation, marketing copy, or code comment (§5.1 point 4). The
  guarantee compresso makes is about the *contract* (never-bigger, format priority, dimension
  math), never the exact output bytes.
- **New, from review**: do not present the two-stage resource guard (§3.5) as covering every
  source type equally — HEIC/AVIF/URL sources rely on the post-decode check only, and any future
  documentation or copy describing this feature must say so.
- **New, from review**: do not skip the §8 step 7 independent example-based validation when
  preparing the `1.0.0` promotion, even under time pressure — it is the one piece of validation
  in this plan that isn't just "confirm the extraction didn't regress the app it came from."
- **Deferred decision (recorded 2026-08-03, during M0 implementation, not resolved):** M0's
  `probe.js` shipped with all three WebP sub-format parsers (`VP8 `/`VP8L`/`VP8X`), and the
  measured cost of M0 as a whole was real — main entry grew 2.50 KB → 3.46 KB gzipped (+996 B,
  ~40%), more than this document's "small addition" framing implied before it was actually
  measured (see the M0 implementation's own CHANGELOG entry). One available trim, not taken:
  drop `VP8X`/`VP8L` pre-decode probing and keep only the common lossy `VP8 ` case — the
  post-decode check still catches what pre-decode probing would then miss, so this is a
  bundle-size/coverage tradeoff, not a security regression either way. Explicitly punted to a
  future version rather than decided now — do not silently cut this during a later pass without
  raising it as its own decision first.

---

## 11. Red-team review — findings and resolutions

Three independent adversarial reviews were run against the plan's first draft (before the
revisions integrated throughout this document): a systems/backend-engineering skeptic, a
frontend/mobile-performance skeptic, and an application-security reviewer. Each was given only
the exploration doc and the (then-unrevised) plan, asked to find the strongest concrete
objections, not generic feedback. All findings below were substantive; none were dismissed.

### Backend/systems review

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | No recovery from a worker that crashes or never responds — "batch compression hung" has no fix | High | §3.6, new resilience subsystem: native `onerror`/`onmessageerror` handling + worker replacement |
| 2 | Zero production observability — no diagnostic surface for a field bug report | Medium-High | §3.6, `pool.stats()` (`size`/`busy`/`queued`/`recoveries`) |
| 3 | §5.1 point 4's "consistent quality" rebuttal doesn't address the actual objection (determinism/reproducibility) | Medium-High | §5.1 point 4, rewritten to concede no byte-for-byte reproducibility is guaranteed, and name when a backend genuinely is the right tool |
| 4 | Mobile tab-backgrounding/suspension unaddressed on the platform (Safari) the plan leans on hardest | Medium-High | §3.6's timeout mechanism (shared resolution with frontend finding #4) |
| 5 | `compressMany`'s partial-failure contract was unspecified | Medium | §2.10/§3.1, `Promise.allSettled`-shaped result array |
| 6 | Soak plan (single-app migration) validates the extraction, not independent generalization | Medium | §8, new step 7 (independent `examples/` venue) + step 8 (honest release-notes scope statement) |

### Frontend/mobile-performance review

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | "60fps regardless of background CPU load" stated as settled fact; ignores thermal throttling and postMessage marshaling cost | High | §5.2 point 2, rewritten to claim only the mechanical, provable part; §6.1 extended to actually measure the rest |
| 2 | Pool-sizing formula is a core-count heuristic with no real memory signal — dangerous on low-RAM, high-core-count Android | High | §3.1, `navigator.deviceMemory`-aware sizing where available, documented as imperfect where not |
| 3 | Benchmark device matrix never included a genuinely low-end/low-RAM device — the exact tier the memory-bound claim needed to prove itself against | Medium-High | §6.1, fourth device tier added, required not optional |
| 4 | No handling for iOS background-tab worker suspension, no per-job timeout | Medium-High | §3.6 (shared resolution with backend finding #1/#4) |
| 5 | Unsupported battery/thermal analogy ("less work than scrolling a feed") | Medium | §5.2 point 4, analogy removed, no comparative claim made without data |
| 6 | Worker spawn/init cost (paid up to 8×) never isolated or counted in benchmarks | Medium | §6.1, cold-start cost now a separately measured, separately reported number |

### Security review

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | The pixel-dimension guard ran *after* `createImageBitmap`/`new Image()` had already fully decoded the pixel buffer — too late on exactly the pool/worker path this plan exists to ship | High | §3.5/§2.12, new two-stage guard: header-only `probe.js` pre-decode check (JPEG/PNG/WebP) + post-decode check retained for the rest |
| 2 | `isHeicSource()`'s untyped/unnamed-blob fallback silently routed *any* mystery blob into the WASM HEIC decoder, undercutting the "no custom decoder surface" claim | High | §3.5, new `sniffHeicMagic()` confirmation before the fallback decode path fires |
| 3 | No time budget — a pathologically slow-to-decode file (small pixel count, adversarial structure) can starve pool slots indefinitely; a pure memory-axis guard doesn't catch this | Medium-High | §3.6's `timeoutMs` (shared resolution with backend finding #4 / frontend finding #4) |
| 4 | CSP guidance covered `worker-src` but omitted `'wasm-unsafe-eval'`, required for `heic-to`'s WASM instantiation under a strict `script-src` | Medium | §4.5, documented explicitly; `decodeHeic()` gets a try/catch surfacing a clear, actionable error on CSP-blocked instantiation |
| 5 | "postMessage isn't a trust boundary" didn't address possible stale-message cross-job result misattribution under the pool's async, id-keyed dispatch | Medium | §3.1/§4.6, the reference implementation's existing stale-message guard named explicitly as load-bearing and required to survive generalization, paired with monotonic job IDs |
| 6 | `heic-to` pinning is advisory only — it's host-lockfile-resolved, not compresso-controlled | Medium-Low | §4.7, stated honestly; real mitigation is the exposure reduction from fixing finding #2, not a version-pinning guarantee this plan can't actually make |

**What this process changed, in one sentence each:** the backend review forced this plan to take
its own reliability and debuggability seriously, not just its economic argument; the frontend
review forced every performance claim to either come with a measurement plan or get removed; the
security review found that the plan's two most confidently-stated claims (decoder surface,
resource-exhaustion protection) both had a concrete, source-verified hole on the exact code path
the plan exists to ship, not a theoretical one. All three reviews are why this document looks
different, and more defensible, than its first draft.

---

## 12. File index — for the implementation session to jump straight to source

| File | Status | Role |
|---|---|---|
| `packages/compresso/src/index.js` | **unchanged** | Main entry; zero size/behavior change |
| `packages/compresso/src/compress.js` | **two additions** (§3.5, §3.7) | Two-stage pixel guard wiring + non-browser-environment guard |
| `packages/compresso/src/platform.js` | **one addition** (§3.5) | HEIC-fallback magic-byte confirmation before `decodeHeic()` |
| `packages/compresso/src/heic.js` | **one addition** (§3.5) | New `sniffHeicMagic()` export |
| `packages/compresso/src/resize.js` | **unchanged** | — |
| `packages/compresso/src/utils.js` | **unchanged** | — |
| `packages/compresso/src/probe.js` | **new** (§3.5) | Header-only JPEG/PNG/WebP dimension probing, zero decode |
| `packages/compresso/src/pool.js` | **new** (§3.1, §3.2, §3.6) | `createPool`, `isPoolSupported`, `defaultPoolSize`, fallback path, crash/timeout resilience, `stats()` |
| `packages/compresso/src/worker.js` | **new** (§3.3) | The worker script, generalized from `compresso-app`'s `worker.ts` |
| `packages/compresso/types/index.d.ts` | **unchanged** | Main entry types untouched |
| `packages/compresso/types/pool.d.ts` | **new** (§3.8) | Pool-related types, including the extended `kind` union |
| `packages/compresso/rollup.config.mjs` | **extended** (§3.4) | Two new build inputs |
| `packages/compresso/package.json` | **extended** | New `./pool` exports subpath |
| `packages/compresso/README.md` | **extended** (§9 M4) | "Batch & Workers" section, incl. CSP notes |
| `packages/compresso/SECURITY.md` | **extended** (§4.7) | Three documented security properties |
| `packages/compresso/CHANGELOG.md` | **extended** | `1.0.0-rc.1` / `1.0.0` entries with real measured size deltas |
| `.github/workflows/ci.yml` | **extended** (§7.4) | `test`, `test-browser` (3 engines), `size` jobs |
| `CONTRIBUTING.md` | **extended** | Concrete test commands replace manual-testing guidance |
| `examples/vanilla/` | **extended** (§8 step 7) | New batch example using `compresso.js/pool` |
| `compresso-app/src/engine/*` | **deleted** (§8) | Retired once migrated to `compresso.js/pool` |

---

## 13. Implementation notes from M0/M1 (added 2026-08-04, for whoever picks up M2)

**Status as of this note**: M0 and M1 are implemented and verified — uncommitted, sitting in the
working tree. Unit suite: 44 passing (plain Node). Browser suite: 66 passing, 0 failures, 0
skips, across real Chromium/Firefox/WebKit via Playwright — the WebKit never-bigger bug mentioned
below is now fixed, so nothing in this suite is a tracked/expected failure anymore. Build
succeeds. `size-limit` passes at 3.56 KB / 4 KB gzip on the main entry. If you're starting M2
cold, read the actual current source (`compress.js`, `platform.js`, `heic.js`,
`probe.js`, `test/`) before this plan's earlier sections — they describe the *design*, the repo
now has the *ground truth*.

**Tooling gotchas already paid for — don't rediscover these:**
- Vitest 4.x's browser provider config is not the string `'playwright'` (shown in older
  tutorials/docs) — it needs `import { playwright } from '@vitest/browser-playwright'` and
  `browser: { provider: playwright(), ... }`.
- `searchForWorkspaceRoot` is exported from `'vite'`, not `'vitest/config'`. Needed in
  `vitest.config.js`'s `server.fs.allow` so Vite will serve the gitignored `_assets/` corpus
  (outside the package root) to browser tests.
- `@size-limit/preset-small-lib` re-bundles the entry via esbuild for measurement — which
  incorrectly resolves and inlines the library's lazy `import('heic-to')`, producing a wildly
  wrong number (493 KB, not 3.5 KB). Use `@size-limit/file` instead: it measures the
  already-built rollup output directly, no re-bundling, no false inflation.
- macOS's `sips` writes JPEG/HEIC/AVIF but not WebP. `test/fixtures/` has no real,
  browser-decodable WebP sample as a result — `probe.js`'s WebP path is covered only by
  header-only synthetic bytes in the unit suite (`test/probe.test.js`), a real gap, noted in
  `test/fixtures/README.md`, not silently assumed covered.

**A bug M2 will NOT see — fixed 2026-08-04, after this note was first written, so don't be
surprised the history here mentions it as once-open:** `compress.js`'s `shrinkToFit()` used to
violate the never-bigger guarantee on WebKit specifically, when `format:'auto'` fell back to JPEG
(WebKit can't encode AVIF/WebP from canvas) and the source was encoded in a materially more
efficient format than JPEG could match at any quality. `compress()` now falls back to the
source's own bytes (honestly relabeled to the source's actual format) whenever nothing achievable
in the target format beats the source's size — see `CHANGELOG.md`'s `[Unreleased]` → `Fixed`
entry for the full writeup, and `compress.js`'s inline comment at the fallback itself. Both
previously-tracked test cases (`test/browser/compress.test.js`'s AVIF case, `corpus.test.js`'s
JPEG sweep) now pass as plain, unconditional assertions — no `it.fails`/`skipIf` workaround
remains in either file. Mentioned here specifically because `worker.js` (M2) calls the exact same
`compress()`, so the pool's own WebKit tests exercise this same, now-fixed path — if a similar
symptom reappears there, it's a *new* regression worth its own investigation, not this bug
resurfacing (the fix is in the shared pipeline both paths call, not something worker-specific).

**Effort-level guidance, if running M2–M6 as separate sessions to save tokens:** milestones that
are largely "faithfully transcribe an already-fully-specified design" — M3 (build wiring, and
even its one fiddly part, worker-URL resolution, is fully spelled out in §3.4), M4 (docs), M6
(publish) — are low-risk for reduced reasoning effort. M2 (the pool's crash/timeout/cancellation
logic — genuine concurrency correctness, exactly the class of thing that produced real,
non-obvious findings when this session tested it) and M5 (the real `compresso-app` migration and
its cross-consumer validation) are where unexpected findings are more likely, going by this
session's actual experience. A reasonable default is high effort throughout, with a bias toward
thinking harder — not pattern-matching to the plan and moving on — the moment something doesn't
behave as the plan predicted (an unexpected test failure, a gap the plan didn't anticipate). That
moment is what actually determines whether split-session quality matches single-session quality;
it's never the well-specified parts that drift.

---

## 14. Implementation notes from M2 (added 2026-08-04, for whoever picks up M3)

**Status as of this note**: M2 is implemented and verified — uncommitted, sitting in the working
tree alongside M0/M1. Unit suite: 79 passing (44 from M0/M1 + 35 new in `test/pool.test.js`, a
dependency-injected mock `Worker`, plain Node). Browser suite: 90 passing, 0 failures, 0 skips
(66 from M0/M1 + 24 new — `test/browser/pool.test.js`'s 8 tests × Chromium/Firefox/WebKit). Build
and `size-limit` are unaffected (still 3.56 KB / 4 KB gzip on the main entry) — confirms
`pool.js`/`worker.js` are correctly invisible to the main entry's bundle. Neither file is wired
into `rollup.config.mjs` or `package.json`'s `exports` yet — that's M3's job, untouched here.

**One real deviation from a literal port of the reference implementation — read this before
touching `cancel()`:** `compresso-app`'s `Pool.cancel()`, for an in-flight job, only posts
`{type: 'abort', id}` to the worker and leaves the slot's `task` reference untouched — it relies
on a response message to clear it. But `worker.ts`'s abort handling deliberately posts *nothing*
back for an aborted job (the AbortError is caught and silently swallowed). Traced carefully, this
means the reference implementation's slot stays marked busy *forever* after any in-flight
cancellation — `pump()` never revisits it, since nothing ever clears `slot.task`. This is
survivable in the app's actual usage (a single-worker preview pool, cancelled-and-immediately-
resubmitted on every slider tick) only because the failure is silent, not because it isn't
happening. Whether that's actually latent in production or masked by request timing wasn't
verified against the app itself (out of scope this session — `compresso-app` isn't touched until
M5's migration). Either way, it isn't acceptable for a *public* `cancel()`/`AbortSignal` API,
where "cancel, then immediately submit new work" is an obvious, expected batch-UI pattern.
`pool.js` now settles the task and frees the slot **locally, immediately**, the moment `cancel()`
runs — safe specifically because the pre-existing stale-message guard (`slot.task.id !== msg.id`)
discards whatever the aborted worker eventually sends. `destroy()` got the same fix for the same
reason (in-flight tasks are now rejected, not just queued ones). See `test/pool.test.js`'s
`cancel()` describe block, specifically "for an in-flight task: tells the worker to abort AND
immediately frees the slot" — that test fails against a literal port of the original behavior.

**Two small, deliberate generalizations beyond the reference implementation, both worth knowing
about:**
1. Progress messages now carry `stage` alongside `progress` (the reference implementation's
   `worker.ts` only ever sent the bare number). `pool.compress()`'s `onProgress` callback receives
   the same `{ progress, stage }` shape as the main-thread `compress()` — kept consistent with
   that existing public contract rather than the narrower shape the app's own internal usage
   happened to need.
2. `worker.js`'s error-kind classification now prefers an already-set `err.kind` (e.g.
   `'too-large'` from M0's pixel guard) over the message-text regex heuristic, which only ever
   covered plain decode failures. The reference implementation predates the pixel guard, so it
   never had to make this choice — a literal port would silently reclassify every `'too-large'`
   rejection as `'decode'`.

**Tooling/testing gotcha, in the same spirit as M0/M1's list — don't rediscover this one:** the
committed 64×64 fixtures compress through a real worker in single-digit-to-low-double-digit
milliseconds (measured via a throwaway instrumented test: ~5–37ms end to end across engines,
dispatch itself landing within the first microtask flush after the pool's one-time capability
probe). That's *faster than `vi.waitFor`'s default poll interval*, which then only ever samples
before dispatch and after completion — never inside the real (but brief) busy window — making a
default-interval `vi.waitFor(() => expect(pool.stats().busy)...)` reliably, deterministically fail
despite the pool behaving correctly. Pass `{ interval: 2 }` (or similar) on any `vi.waitFor`
checking transient in-flight pool state in the browser suite. Worth reconstructing that
instrumented-test approach again — rather than guessing from first principles — if a similar
"this should obviously work but the assertion never passes" situation shows up elsewhere; guessing
about it first cost real time this session before the actual (non-)explanation was confirmed.

**`types/pool.d.ts` was written now, in M2, not deferred.** The milestone table's `(§3.1–3.7)` for
M2 technically excludes §3.8 (types), which reads as intentionally deferring it to M3's
"packaging" work. Judgment call: wrote it anyway, alongside the implementation it documents, on
the theory that typing `pool.js`'s public shape while designing it is cheap and reduces drift
risk, and doesn't preclude M3 still doing the actual `package.json` `exports`/`types` wiring. If
this was meant to stay deferred, the file is small and easy to move or ignore.

**What M3 needs to know, concretely:** two new rollup inputs (`src/pool.js` →
`dist/compresso.pool.mjs`, `src/worker.js` → `dist/compresso.worker.mjs`, both ESM-only per §3.4
— already true, nothing changed there); `pool.js`'s default worker URL is `new URL('./worker.js',
import.meta.url)`, so the two built files must ship as siblings in `dist/` for that resolution to
hold at runtime, exactly as §3.4 already specified. **Untested by this session**: the actual
built/packaged `dist/compresso.pool.mjs` + `dist/compresso.worker.mjs` pair, and CDN-style
`<script type="module">` resolution — M2's tests all import `src/pool.js` directly (Vite's dev-mode
resolution of the `new URL(...)` worker pattern), which is not proof the *built* rollup output
resolves the same way. Treat that as a real open question for M3 to actually verify, not a
formality — §3.4 already calls for exactly this check ("verify explicitly during M3 with a real
`<script type="module">` smoke test against a local `npm pack` tarball, not assumed").

---

## 15. Implementation notes from M3 (added 2026-08-04, for whoever picks up M4)

**Status as of this note**: M3 is implemented and verified — uncommitted, sitting in the working
tree alongside M0/M1/M2. `rollup.config.mjs` has two new ESM-only inputs; `package.json` has a
new `"./pool"` `exports` entry and two new `size-limit` entries. Unit suite still 79 passing,
unaffected. `size-limit` on the main entry still 3.56 kB / 4 kB — confirmed unaffected by the new
build inputs, same as M2's build-doesn't-touch-main-entry claim.

**M2's flagged open question was a real bug, not a formality — read this before assuming §3.4's
file naming was followed literally.** §3.4 (and §12's file index) named the worker's build
output `dist/compresso.worker.mjs`, matching the other dist files' `compresso.*` naming
convention. That name is wrong: `pool.js`'s worker discovery is the *literal source string*
`new URL('./worker.js', import.meta.url)`, and that string cannot change without breaking the
Vite-resolved dev-mode path M0–M2's entire test suite depends on (`src/worker.js` is what Vite
finds relative to `src/pool.js`). Once built, `import.meta.url` inside `dist/compresso.pool.mjs`
points at its own location in `dist/`, so the relative reference resolves to whatever the sibling
file is actually named there — `dist/compresso.worker.mjs` does not match `./worker.js` and the
pool would have silently 404'd fetching its worker in production, something none of M0–M2's tests
could have caught since they never touch the built output. **The fix implemented here: the build
output is named `dist/worker.js`, not `dist/compresso.worker.mjs`** — plain, undecorated, chosen
specifically to match the hardcoded source string rather than the sibling files' naming
convention. If a future change ever needs to rename it, the source string in `pool.js` and the
rollup output filename must change together, in the same commit — they are not independently
free to drift, and nothing else enforces that they stay in sync besides this note and the smoke
test below.

**Verified two ways, per §3.4's explicit instruction not to assume this**, both using a real
`npm pack` tarball (not `src/`, not a workspace symlink):
1. Installed the tarball into a scratch project and resolved `compresso.js/pool` through Node's
   own ESM resolver (the same `exports`-map algorithm a bundler like Vite/webpack/esbuild would
   apply) — confirms the `package.json` wiring itself, independent of any bundler-specific
   behavior. `isPoolSupported()` correctly returns `false` in Node (no `Worker`/
   `OffscreenCanvas`), and `createPool()` returns the fallback pool with the documented shape
   (`compress`/`compressMany`/`cancel`/`destroy`/`stats`), all without touching a real browser API
   at import time — confirms the module's top level has no accidental browser-only code running
   on load.
2. Copied the installed tarball's contents to a directory served by a plain static file server
   (no Vite, no bundler, no import map — genuinely mimicking unpkg/jsdelivr serving raw files) and
   loaded a page whose only script is `<script type="module">import { createPool } from
   './dist/compresso.pool.mjs'`. In real Chromium: `isPoolSupported()` is `true`,
   `defaultPoolSize()` returned 8 (this test machine's core count, capped), a real 4-file
   `compressMany()` batch through a 2-worker pool came back `Promise.allSettled`-fulfilled for
   every entry with real compressed `Blob`s (a JPEG→WebP conversion measured 44.8% savings on the
   sample fixture), `pool.stats().recoveries` stayed `0` (no crash/timeout path triggered on a
   trivial 64×64 fixture, as expected), and the browser's own network log confirms
   `GET /dist/worker.js` actually fired twice (once per spawned worker) — not just that the
   promise resolved, but that the sibling-file resolution this section exists to verify is what
   actually produced the result.

**Bundle sizes, measured from the real built output** (`size-limit`, ceilings set ~10% above,
matching the existing main-entry convention): `dist/compresso.pool.mjs` is **4.67 kB gzipped**
(ceiling 5.25 kB), `dist/worker.js` is **3.50 kB gzipped** (ceiling 4 kB). Both recorded in
`CHANGELOG.md`'s `[Unreleased]` entry, per §9's M3 done-when criteria and §7.4's CI note ("size"
job ceilings set from the real numbers measured during M3 — the CI job itself needed no changes,
it already runs `size-limit` generically over whatever's in `package.json`'s `size-limit` array).

**What M3 deliberately did not do, left for M4/M5**: no README "Batch & Workers" section yet
(§9 M4's job); `examples/vanilla/` still only demonstrates the single-file `compress()` path, no
batch example yet (§8 step 7, part of M5's migration); `compresso-app` itself is untouched — still
on its own vendored `engine/pool.ts`/`engine/worker.ts`, not yet migrated onto the newly-importable
`compresso.js/pool` (M5's job). The smoke-test scratch project and its throwaway tarball are not
part of this repo — nothing under `_docs/` or `packages/` should reference a `compresso.js-0.4.0.tgz`
path; that was a temporary artifact of verification, not a fixture to keep around.

---

## 16. Implementation notes from M4 (added 2026-08-04, for whoever picks up M5)

**Status as of this note**: M4 is implemented — uncommitted, sitting in the working tree alongside
M0/M1/M2/M3. No source files changed; M4 is documentation-only, per §9's row for it.

**What was added**: `packages/compresso/README.md` gained a "Batch & Workers" section (after
"Options", before "License") covering: the `createPool()`/`compressMany()` quick-start example;
why a host should call `createPool()` unconditionally rather than branch on `isPoolSupported()`
itself; a table of the five pool-instance methods including `stats()`; a table of the four
`createPool()` options (`size`, `workerUrl`, `maxQueueLength`, `timeoutMs`); the crash/timeout
resilience behavior in plain terms; a dedicated CSP subsection naming both `worker-src` (worker
construction) and `'wasm-unsafe-eval'` (HEIC's WASM decode, additionally required only when HEIC
input reaches the pool); and a short "If you've rolled your own worker pool" migration pointer.
`maxInputPixels` is not re-documented in the new section — it already has a full row in the
existing "Options" table (added during M0) and the Batch & Workers intro just links to it and
states it applies identically on the pool path, rather than duplicating the description.

**On "migration guide pointer to §8" specifically**: §9's M4 row and §12's file index both call
for this, but §8 itself is `compresso-app`-repo-specific (delete `engine/pool.ts`, re-run that
app's own offline/EXIF verification, etc.) and `compresso-app` isn't part of this repo — so §8's
literal steps have no public audience to point at from a published README. What actually shipped
is the generalized version: the new "If you've rolled your own worker pool" subsection states the
*shape* of the migration (delete your hand-rolled pool, import `createPool`/`isPoolSupported`,
re-express app-specific policy as a host-layer wrapper around `createPool({ size: 1 })`) that §8's
steps 2–4 are one concrete instance of. §8 itself remains the authoritative, repo-specific
migration checklist for the actual `compresso-app` migration — that's still M5's job, unchanged by
this note. Flagging this interpretation explicitly in case a future pass expected a literal link
into `_docs/LIB_V1_WORKERS_PLAN.md` from the public README instead: that was deliberately not
done, since this planning doc is not part of the published npm package (`package.json`'s `files`
array is `dist`/`types`/`README.md`/`LICENSE`) and linking to it from public docs would point
consumers at a 404 once this repo's `_docs/` history moves on past this plan.

**What M4 deliberately did not do, left for M5**: no changes to `examples/vanilla/` (§8 step 7,
part of M5's migration); no changes to `compresso-app` itself; no CHANGELOG version bump or
`1.0.0-rc.1` prep (M5's job, §9). A "Docs" entry was added to `CHANGELOG.md`'s `[Unreleased]`
section, consistent with M0–M3 each recording their own entry there — no new heading pattern
introduced, `### Docs` simply didn't exist as a category yet before this milestone had something
that was documentation-only rather than a code Add/Fix/Change.

---

## 17. Implementation notes from M5 (added 2026-08-04, for whoever picks up M6)

**Status as of this note**: `1.0.0-rc.1` prep, the `compresso-app` migration, and the
`examples/vanilla` batch sample are done — uncommitted, sitting in the working tree alongside
M0–M4, in both the `compresso` and `compresso-app` repos. `packages/compresso/package.json`'s
version is `1.0.0-rc.1`. Unit suite: 80 passing (79 from M0–M4 + 1 new). Browser suite: 91
passing + 2 cleanly skipped (Chromium/Firefox only, see below) = 93. `size-limit`: main entry
3.61 kB / 4 kB, pool entry 4.72 kB / 5.25 kB, worker script 3.54 kB / 4 kB — all green. **The
actual `npm publish` has *not* happened** — that's an external, hard-to-reverse action this
session correctly declined to run without explicit user confirmation (still pending as this note
is written), so M6's promotion step has a real prerequisite still open, not just a formality.

### 17.1 The migration itself, mechanically

`compresso-app`'s `src/engine/core/`, `src/engine/pool.ts`, `src/engine/worker.ts`,
`src/engine/types.ts` are deleted (the whole `src/engine/` directory is gone). `compresso.js` is
a real dependency now (installed from a local `npm pack` tarball for this session's own
verification — see §17.4 for why, and what M6 needs to do about it). `heic-to` was removed from
`compresso-app/package.json`'s own `dependencies` — it's dead there now (nothing in the app
imports it directly anymore; it still resolves, transitively, via `compresso.js`'s own
`optionalDependencies`, verified by checking `node_modules/heic-to` is still populated after the
removal).

`src/state/queue.ts` was rewritten, not just re-pointed. The reference `compress()`-shaped
options (`quality`/`format`/`maxWidth`/`maxHeight`/`maxSizeMB`) barely changed, but **cancellation
did**: the app's old hand-rolled `Pool.cancel(id)` took the *caller's own* job id; the published
`compresso.js/pool`'s `pool.compress(file, options)` generates its own internal id and never
exposes it, so the only host-facing cancellation mechanism is `AbortSignal` (§1.2's "Promise-
based, `AbortSignal`-driven" discipline, applied consistently). `queue.ts` now keeps a
`Map<jobId, AbortController>` ref for the main pool's jobs (aborted on `remove()`, on `clear()`,
and on the params-changed debounce), and the "only the latest preview request matters" policy
(§8 step 4's ~15–20 line host wrapper) is a small `createPreviewWorker()` factory at the top of
the file, wrapping `createPool({ size: 1 })`: cancel-the-previous-controller-then-run-a-new-one,
discard the result if a newer request has since superseded it — same behavior as the reference
`PreviewWorker`, expressed through `AbortController` instead of a pool-assigned id/seq pair. One
free simplification fell out of this: `pool.compress()`'s result already includes a ready-made
`url` (`URL.createObjectURL`, done once, inside the library) — `runJob()` no longer calls
`URL.createObjectURL(out.blob)` itself, it just uses `out.url` directly. The app-level `Format`/
`Params`/`DEFAULT_PARAMS`/`Caps` types, previously in the now-deleted `engine/types.ts`, moved
into `queue.ts` itself (their only real owner) and `Console.tsx` imports them from `'../state/queue'`
instead. `Chrome.tsx` needed no import changes — `poolSize: number` was always just a display
value.

### 17.2 The real finding: HEIC through the pool was broken for bundled consumers

This is the reason M5 took much longer than "faithfully transcribe an already-fully-specified
design" — and it's exactly the kind of thing §13's effort guidance predicted for this milestone
("real, non-obvious findings... the moment something doesn't behave as the plan predicted"). It
was found *by the migration itself*, not by any test written in advance — running a real HEIC
file through `compresso-app`'s real `vite build` output (not `vite dev`, not this package's own
Playwright suite, both of which mask it) is what surfaced it.

**Symptom**: a HEIC file run through `createPool()` failed with "HEIC support requires the
optional 'heic-to' package. Install it with: npm i heic-to" — `heic-to` was installed and
present. Main-thread HEIC decode (`previewUrlFor()`'s direct `decodeHeic()` call in `queue.ts`,
used for thumbnail preview) worked fine throughout; only the *pool/worker* path was affected.

**Root cause, two independent layers, found by instrumenting the actual thrown error (temporarily
rewriting `decodeHeic()`'s catch to embed the real `import()` failure's message, since a worker's
own console output isn't visible to normal page-console tooling — see §17.3 for the debugging
technique, worth reusing):**

1. `worker.js`'s `decodeHeic()` lazy-loads the codec via `import('heic-to')` — a bare specifier.
   That resolves correctly when *any* bundler processes it as part of a normally-`import`-ed
   module's graph (proven: the main-thread path, reached via a plain `import` in `queue.ts`, has
   always worked). It does **not** resolve reliably once `worker.js` ships as a pre-built file
   inside a consumer's `node_modules`, discovered only via `new Worker(new URL(...))` rather than
   a static `import` statement — Vite (confirmed; the GitHub issue trail suggests this is a
   general class of bundler behavior, not Vite-specific: search "Unable to use `new URL(…,
   import.meta.url)` inside 3rd party module") copies the worker file itself into the build
   output (content-hashed — it *looks* processed) but does not recurse into what that file itself
   imports to discover further files to bundle or copy. A bare specifier left inside it survives
   into production untouched, and the browser's own module loader then fails outright: "Failed to
   resolve module specifier 'heic-to'". This is invisible in every venue this project's own test
   suite exercises: `vitest --project browser` runs through Vite's *dev server*, which rewrites
   bare specifiers uniformly for *any* module it serves regardless of realm — masking exactly this
   gap. **First fix attempt — insufficient, kept as a real partial improvement anyway**: made
   compresso's own `rollup.config.mjs` resolve `heic-to` at *compresso's* build time instead of
   marking it external for the worker build (`@rollup/plugin-node-resolve`, new devDependency),
   producing a genuine code-split sibling chunk (`dist/heic-to.js`, fixed filename, not
   content-hashed, so it can be referenced by a static `new URL('./heic-to.js', import.meta.url)`)
   instead of a dangling bare specifier. This *does* fully fix the no-bundler/CDN consumption path
   (verified: M3's own raw-tarball-plus-static-server technique) — Vite production consumers were
   still broken, because Vite's worker-file handling doesn't discover a *relative* reference
   inside the copied worker file any more than it discovered the bare one. **Actual fix**: resolve
   the codec chunk's URL in `pool.js` instead of `worker.js` — `pool.js` (as `dist/compresso.pool.mjs`)
   *is* reached via a normal `import` statement from the consumer's own code and *is* deeply
   processed by Vite, the same reason `worker.js`'s own URL already resolved reliably everywhere.
   A new `DEFAULT_HEIC_TO_URL = new URL('./heic-to.js', import.meta.url)` constant in `pool.js`,
   plus a new, optional, documented `heicToUrl` `PoolOption` (mirroring `workerUrl`'s existing
   escape-hatch shape exactly), gets sent to each worker in every `'run'` message and applied via
   a new private `__setHeicToUrl()` setter in `heic.js` (same undocumented-but-exported-from-
   `index.js` pattern as `__setCapabilities`) before `compress()` runs. Verified: Vite's build now
   *does* discover and copy the chunk `pool.js` references (confirmed by grepping the built app
   output for the rewritten `new URL("/compresso/assets/heic-to-HASH.js", ...)` call).
2. Once that URL genuinely resolved, a *second*, deeper problem surfaced: `heic-to`'s **default**
   export throws `ReferenceError: document is not defined` inside a worker — its Emscripten glue
   code resolves its own script URL via `document.currentScript` in an unguarded path, and
   `document` doesn't exist in a worker's global scope. This was never exercised before (the first
   bug always failed before reaching `heic-to`'s own code at all). `heic-to` ships a dedicated
   worker-safe variant for exactly this — its own README, "Call heic-to in web worker":
   `import { heicTo } from 'heic-to/next'` instead of the default. Fixed by having `heic.js`
   detect `typeof document === 'undefined'` (the same `isWorker` idiom `platform.js` already uses
   — deliberately *not* imported from there, to avoid a circular `heic.js` ↔ `platform.js` import;
   duplicated as a one-line constant instead) and pick `'heic-to/next'` in that branch, `'heic-to'`
   otherwise. Both specifiers are kept as their own literal `import(...)` call sites (not a
   templated/computed string) so each build's own static analysis can still find and chunk
   whichever one actually applies to it — `rollup.config.mjs`'s three build entries each needed
   their `external` list adjusted accordingly (main entry and pool.js: both specifiers external,
   neither reachable from those graphs but Rollup can't prove that from a runtime `typeof` check;
   worker.js: only the default `'heic-to'` external — genuinely unreachable dead code there,
   left alone rather than wastefully bundled — with `'heic-to/next'` left for `nodeResolve()` to
   resolve into the `heic-to.js` chunk).

   Confirmed working end-to-end afterward, by hand, against `compresso-app`'s actual `vite build`
   output (not `vite preview`'s dev-adjacent serving — the real static `dist/` output, server
   stopped and restarted between rebuilds to rule out caching): a real 3024×4032 HEIC photo
   compresses to a 466 KB WebP through a real spawned pool worker, visually correct (upright,
   matches the EXIF-orientation invariant separately), zero console errors.

   **Known, accepted residual, not solved by this release**: the consuming app's bundler can end
   up shipping the HEIC codec more than once instead of sharing one copy. In `compresso-app`'s own
   build specifically, there are **three** ~2.85 MB chunks
   (`heic-to-D9bZt7ea.js`/`heic-to-DUESS-qi.js`/`heic-to-DV8IZESR.js`, ~8.9 MB total in
   `dist/compresso/assets/`, confirmed genuinely different content — different sha256, not exact
   duplicates) where two (main-thread default + worker `/next`) would be the logical minimum. This
   inflates the app's PWA precache (17 → 19 entries, ~3.2 MB → ~9.1 MB) — a real bundle-size cost
   for HEIC-capable Vite consumers, **not** a correctness issue (every copy is functionally
   correct), and explicitly **not chased further this session** — deprioritized once the actual
   bug (HEIC silently failing) was fixed and verified, given the remaining scope still open (this
   write-up, the examples venue, the publish gate). Worth a look before or shortly after `1.0.0`:
   likely a `manualChunks` / `optimizeDeps` tweak on `compresso-app`'s own `vite.config.ts` side,
   or possibly unavoidable given Vite's worker-handling architecture — not investigated enough to
   say which.

### 17.3 Debugging technique worth reusing: a worker's own console output isn't visible

Spent real time on this before finding the workaround, worth recording so it isn't rediscovered.
Neither `read_console_messages` nor `read_network_requests` (as exposed to this session's browser
tooling) reliably surfaces a *dedicated worker's own* `console.*` calls or the network requests it
makes internally — only the main frame's. A `console.error()` placed inside `worker.js`/`heic.js`
never showed up, even though the worker was demonstrably executing that code path. What worked:
temporarily *embed the real error into the thrown `Error`'s own message* (`throw new Error('DEBUG: '
+ (e.stack || e.message))`) instead of logging it — since error `message` strings already cross
the worker → pool `postMessage` boundary as part of the normal `{ type: 'error', ... }` protocol,
this makes the real underlying failure visible through the exact same channel already being
watched (a small main-thread `Worker` proxy that captures `'error'`-type messages into a
`window.__lastErr`, read back via a separate tool call). Both temporary debug edits were reverted
before this was committed to source — see the actual `heic.js` diff for the clean version.

### 17.4 What M6 needs to know, concretely

- **The actual `npm publish --tag next` has not run.** Everything in `compresso-app` currently
  depends on `compresso.js` via `"file:compresso.js-1.0.0-rc.1.tgz"` (a local tarball, built with
  `npm pack` from this session's own `packages/compresso`, copied into `compresso-app/`'s own
  directory — *not* committed, matches this repo's own `.gitignore`-adjacent conventions for
  throwaway verification artifacts, same spirit as M3's note about not keeping a stray `.tgz` path
  referenced anywhere). Once the real publish happens, `compresso-app/package.json` needs
  `"compresso.js": "file:compresso.js-1.0.0-rc.1.tgz"` → `"^1.0.0-rc.1"`, a real `npm install`
  against the registry, and a rebuild/re-verify — the *logic* is already fully proven against the
  exact same built artifact the real publish will contain (the tarball was built from the final,
  post-HEIC-fix source), so this should be a formality, but §8's own text already warns not to
  skip re-verification after switching to the real published version, and that guidance stands.
- **`examples/vanilla/batch.html` (§8 step 7's independent venue) is new** — a minimal
  `<script type="module">` page using `createPool()`/`compressMany()` via unpkg, styled to match
  the existing single-file `index.html` example. Manually exercised with a real 3-file batch in
  Chromium (verified against a local static server serving `packages/compresso` directly, with the
  unpkg URL temporarily swapped to a `localhost` one for the test and reverted immediately after —
  the committed file always points at unpkg). **Not yet exercised in Safari/WebKit** — the iOS
  Simulator (the only WebKit access available this session) crashed and its own error said
  retrying wouldn't help; asked the user how to proceed, and — given time already spent on the
  HEIC investigation — the user chose to defer this specific check rather than wait for the
  simulator panel to be reopened. This is real, open scope from §8 step 7, not done, explicitly
  flagged per this plan's own guardrail against silently skipping that step "even under time
  pressure" (§10). Do this before `1.0.0` promotes, not after.
- **Version bump + full CHANGELOG entry are already written** (`[1.0.0-rc.1] — 2026-08-04`,
  `packages/compresso/CHANGELOG.md`) — includes the HEIC fix, the size deltas, the new test and
  its documented Chromium/Firefox skip, and the `examples/vanilla/batch.html` addition with its
  own Safari-gap note. `README.md`'s headline size figure and its `heicToUrl` option-table row are
  both updated to match.
- §8 step 8 (the honest validation-scope statement for the `1.0.0` release notes) is still M6's
  job, unchanged — nothing this session did should be read as already covering it.
