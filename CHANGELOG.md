# Changelog

All notable changes to `compresso.js` are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Resource-exhaustion guard (`maxInputPixels`).** A crafted file can declare pixel
  dimensions that make the browser attempt an enormous allocation from a handful of
  bytes. `compress()` now rejects input above 100 MP by default (configurable,
  `Infinity` to disable) — checked twice: cheaply, from the file header alone
  before the expensive decode, for JPEG/PNG/WebP; and again after decode, for
  every format, as the only guard for HEIC/AVIF/URL sources and as
  defense-in-depth otherwise.
- **HEIC decode-path hardening.** The one Blob-source case `isHeicSource()` treats
  permissively (no MIME type, no filename) now requires a cheap magic-byte
  confirmation of the file's HEIC/HEIF `ftyp` box before it's handed to the WASM
  decoder, so an arbitrary untyped, unnamed blob can no longer reach it unconfirmed.
- **Clear error in non-browser environments.** Calling `compress()` where neither
  `Image` nor `OffscreenCanvas` exists (Node.js, or a framework's SSR pass) now
  throws immediately with an actionable message, instead of failing deep inside
  the pipeline.
- `decodeHeic()` surfaces a specific, actionable error when WASM compilation is
  blocked by a page's Content-Security-Policy (needs `'wasm-unsafe-eval'` in
  `script-src`), instead of an opaque WASM failure.

### Fixed
- **The never-bigger guarantee could be violated on WebKit.** `format: 'auto'`
  falls back to JPEG there (WebKit can't encode AVIF/WebP from canvas —
  invariant #3), and `shrinkToFit()`'s quality search had no fallback for "even
  the lowest-quality re-encode still doesn't fit under the ceiling" — it
  silently returned that oversized result. This wasn't a search-precision bug:
  a source already encoded in a materially more efficient format (AVIF, or a
  well-compressed JPEG already near JPEG's own container-overhead floor) can
  have no achievable JPEG re-encode, at any quality, that beats it. `compress()`
  now falls back to the source's own bytes — honestly relabeled to the
  source's actual format rather than mislabeled as the originally-requested
  one — whenever nothing achievable in the target format fits under the
  source's size. PNG stays exempt, unaffected (unchanged, deliberate — PNG
  ignores quality, so a size search was never expected to help it). Found by
  the new browser test suite (below) on both a synthetic fixture and a real
  photo; both now pass with no test-side workaround.

### Testing
- Added a real test suite for the first time: Vitest for pure-logic unit tests
  (byte parsing, dimension math, format tables — plain Node, no browser needed)
  and Playwright-backed browser integration tests across Chromium, Firefox, and
  WebKit for anything touching real decode/encode. `size-limit` gates the main
  entry's gzipped size in CI. See `packages/compresso/test/browser/README.md`.
- Added four tiny (64×64), synthetic, non-personal fixtures
  (`test/fixtures/sample.{png,jpg,heic,avif}`) so the browser suite has real
  coverage in CI independent of the personal-photo corpus at `_assets/`
  (gitignored, local-only, used as additional coverage on top of these). This
  suite is what found the never-bigger fix above — on a real device/engine
  matrix, not something Node-only testing could have caught.

### Added
- **Worker pool (`pool.js` + `worker.js`).** New internal modules implementing
  a fixed-size worker pool for parallel, off-main-thread batch compression —
  `createPool()`, `isPoolSupported()`, `defaultPoolSize()`, and a
  `compressMany()` whose results are `Promise.allSettled`-shaped (a failure in
  one file never fails the batch). `createPool()` never throws for lack of
  Worker/OffscreenCanvas support, or when a page's CSP blocks worker
  construction — it falls back to a correct, serial, main-thread
  implementation with the exact same shape, so a host never branches on which
  one it got. Includes crash/timeout resilience: a worker that crashes
  natively, or is silently suspended by the OS (e.g. iOS backgrounding a tab),
  is detected and replaced automatically instead of hanging a batch forever —
  visible via `pool.stats()` (`{ size, busy, queued, recoveries }`). Generalized
  from `compresso-app`'s proven `engine/pool.ts`/`engine/worker.ts`.

### Fixed
- **Cancelling an in-flight pool job no longer strands its worker slot.** The
  reference implementation this was generalized from posts an abort message to
  the worker but otherwise leaves the slot marked busy until a response
  arrives — and a worker that observes its own abort deliberately sends
  nothing back, so that slot would stay marked busy forever after any
  in-flight cancellation. That was a rare, silently-absorbed timing window for
  the one narrow internal use the reference implementation had; it's a real
  defect for a public `cancel()`/`AbortSignal` API a host is expected to call
  by design (a live-updating batch preview is the obvious case). `pool.js` now
  settles the task and frees the slot locally the moment cancellation is
  requested, relying on the existing stale-message guard to safely discard any
  late response the aborted job's worker sends afterward.

### Testing
- Added `test/pool.test.js` (35 unit tests, a dependency-injected mock
  `Worker`, plain Node) covering scheduling, queueing, cancellation — including
  the in-flight-cancel-frees-the-slot-immediately fix above —
  `maxQueueLength`, crash/timeout recovery, and `compressMany`'s
  partial-failure contract. Added `test/browser/pool.test.js`
  (Chromium/Firefox/WebKit) covering real concurrent dispatch, a real
  cancellation mid-flight, a real per-job timeout, and the fallback path
  forced on by removing `OffscreenCanvas`. This is what found that a tiny
  fixture's whole compression can complete in single-digit milliseconds —
  faster than a naively-polled assertion can reliably observe — informing how
  those specific tests poll for in-flight state.

### Added
- **`compresso.js/pool` is now a real, publicly importable subpath.** `rollup.config.mjs`
  gains two ESM-only build inputs: `src/pool.js` → `dist/compresso.pool.mjs`
  (**4.67 kB gzipped**, ceiling set to 5.25 kB) and `src/worker.js` →
  `dist/worker.js` (**3.50 kB gzipped**, ceiling set to 4 kB) — both new
  `size-limit` entries alongside the unaffected main entry (still 3.56 kB / 4
  kB). The worker is deliberately named `dist/worker.js`, not
  `dist/compresso.worker.mjs`: `pool.js`'s worker discovery is the literal
  string `new URL('./worker.js', import.meta.url)`, unchanged from `src/` so
  Vite's dev-mode resolution (what the unit/browser test suites exercise)
  keeps working — the built output has to match that literal name for the
  same relative resolution to hold at runtime, or the pool would silently try
  to fetch a worker file that doesn't exist. `package.json` gets a
  `"./pool"` entry in `exports` (`import` → `dist/compresso.pool.mjs`,
  `types` → `types/pool.d.ts`; no `require` condition — real module workers
  and `import.meta.url`-relative worker discovery are ESM-only concepts, and
  a CJS consumer needing this is already using a bundler that can consume the
  ESM build directly). Verified two ways, not just built: an `npm pack`
  tarball installed into a scratch project resolves `compresso.js/pool`
  through Node's real ESM resolver (the same exports-map algorithm a
  bundler uses) and exposes the correct fallback-pool shape; and a genuine
  `<script type="module">` page, served with no bundler at all (mimicking
  raw unpkg/jsdelivr CDN usage), imports `dist/compresso.pool.mjs` directly
  by URL, runs a real 4-file parallel batch through real spawned Web Workers
  in Chromium, and confirms every result is `fulfilled` with a real
  compressed `Blob` — network trace confirms `dist/worker.js` was actually
  fetched, not silently skipped by a caught error.

## [0.4.0] — 2026-07-31

### Added
- **Web Worker support.** The platform seam now has a second backend
  (`createImageBitmap` + `OffscreenCanvas` + `convertToBlob`) selected automatically
  when the library runs without a DOM. Hosts can now compress many images in
  parallel, off the main thread, with no API change and no pipeline change — the
  0.3.2 refactor prepared exactly this. EXIF orientation is preserved on the worker
  path via `imageOrientation: 'from-image'`.
- `ensureCapabilities()` is awaited by the pipeline before format selection, so
  `format: 'auto'` resolves correctly in a worker (where `toDataURL` does not
  exist and the probe must be asynchronous). `__setCapabilities` still short-
  circuits it, so a host that already probed on the main thread pays nothing.

### Changed
- Core grew from 2.27 KB to 2.50 KB gzipped (+231 B) for the worker backend. Kept
  in the main entry rather than split behind a subpath export: parallel compression
  is core to what the library is for, and a second entry point would make it a
  second-class path for every consumer.

## [0.3.2] — 2026-07-11

### Changed
- **Internal worker-ready refactor** (no public API change). Host I/O (image decode,
  canvas, encode, format-capability detection) is now isolated behind a single
  `platform` seam, leaving the compression pipeline free of DOM APIs — so a Web
  Worker backend can be added later with no pipeline changes. Format-support
  detection is now memoized (was re-probed on every call).

### Improved
- Higher-quality image resampling (`imageSmoothingQuality: 'high'`) — downscaled
  output is now slightly smaller *and* higher quality. Verified byte-equivalent to
  0.3.1 on all non-downscaled paths across a 75-case image matrix.

### Deprecated
- `preserveAspectRatio` option — a no-op (aspect ratio is always preserved). Kept
  in the types for compatibility; will be removed in a future major version.

## [0.3.1] — 2026-07-11

### Changed
- **Relicensed to MIT.** Compresso is now fully open source under the MIT License
  (previously MIT + Commons Clause). No code changes.

## [0.3.0] — 2026-07-11

### Fixed
- **HEIC/photo compression could inflate files on Safari.** Safari cannot encode
  WebP/AVIF from a canvas, so `format: 'auto'` falls back to JPEG; re-encoding a
  full-resolution ~12 MP photo to JPEG could end up larger than the original.

### Added
- **Never-bigger guarantee.** Lossy output (JPEG/WebP/AVIF) is now never larger than
  the source, regardless of `maxSizeMB`.
- **Smart default resolution cap** on the WebP-less JPEG fallback path (e.g. Safari):
  caps to a 2048px long edge only when the caller sets no dimensions and no modern
  format is available. Browsers with WebP/AVIF keep full resolution; opt out with
  `maxWidth: Infinity`.

## [0.2.0] — 2026-07-10

### Added
- **HEIC/HEIF image input.** Decode iPhone photos and convert them to web formats in
  any browser — Safari/iOS decode natively; other browsers lazily load an optional
  WASM decoder (`heic-to`) only on the first HEIC file. The ~2 KB core stays
  codec-free and dependency-free for every other format.

## [0.1.0] — initial release

### Added
- Browser-native image compression, resizing, and format conversion via the Canvas API.
- `compress`, `compressMultiple`, `createCompressor`, and format/size utilities.
- `format: 'auto'` (AVIF → WebP → JPEG), `maxSizeMB` target via quality binary search,
  progress callbacks, `AbortSignal` support, and TypeScript types.

[0.3.1]: https://github.com/iziuqo/compresso/releases/tag/v0.3.1
[0.3.0]: https://github.com/iziuqo/compresso/releases/tag/v0.3.0
[0.2.0]: https://github.com/iziuqo/compresso/releases/tag/v0.2.0
[0.1.0]: https://github.com/iziuqo/compresso/releases/tag/v0.1.0
