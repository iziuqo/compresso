# Compresso PWA — Product Context

**Status:** research + framing only. No plan, no code. Written 2026-07-31 to be the input
for the next planning session.
**Goal being framed:** turn the `/tool` page into a standalone PWA that does what native
image-optimizer apps (ImageOptim, Optimage, Compresto, Zipic, ImageCrush) do — but better,
and much faster.

Everything under "What exists today" was read from the current tree. Everything under
"Capability matrix" is tagged verified/unverified. Ideas are separated from facts on purpose.

---

## 1. What exists today (verified, current tree)

### 1.1 Two artifacts, two different constraint sets

This distinction is load-bearing and has not been written down before:

| | `packages/compresso` (npm `compresso.js` 0.3.2) | `website` (Next 14 static export) |
|---|---|---|
| Constraint | ~2 KB gzip, zero required deps | none — it's an app |
| Consumer | third-party devs | end users |
| Success metric | bundle size, API surface, stars | output quality, speed, feel |
| Deps allowed | `heic-to` (optional, lazy) only | anything lazy-loadable |

`website/src/lib/compress.js` is a *thin consumer* of the published lib (imports `compress`,
`decodeHeic`, `formatBytes`, `isFormatSupported`, `isHeicSource`). **The 2 KB budget governs
the library, not the app.** Conflating the two is the single biggest risk to this product —
it would cap the app's compression quality at whatever `canvas.toBlob` can do.

### 1.2 Library (`packages/compresso/src`, ~447 lines, 6 files)

- `index.js` — `compress`, `compressFile`, `compressMultiple`, `createCompressor`,
  `formatBytes`, `isFormatSupported`, `getBestFormat`, `detectFormat`, `isHeicSource`,
  `decodeHeic`, `__setCapabilities` / `__resetCapabilities`.
- `compress.js` — pipeline: resolve format → decode → dimensions → draw → encode →
  `shrinkToFit` binary search (≤10 steps) → result object.
- `platform.js` — the **only** module touching host I/O. Currently DOM-bound:
  `new Image()`, `document.createElement('canvas')`, `toBlob`/`convertToBlob`,
  `toDataURL` capability probe (memoized).
- `resize.js` — `calculateDimensions` + step-down `renderToCanvas`,
  `imageSmoothingQuality: 'high'`.
- `heic.js` — lazy WASM `heic-to` decode.
- `utils.js` — mime/name helpers, format detection.

**Invariants that must not break** (they are the product's trust):
1. `format:'auto'` = AVIF → WebP → JPEG (best the browser can *encode*).
2. **Never-bigger guarantee**: lossy output ≤ source size, always. PNG is *exempt* — see §4.
3. Safari-only quirk: when auto falls back to JPEG **and** the caller set neither
   `maxWidth` nor `maxHeight`, the long edge is capped at **2048 px** (prevents a 12 MP
   re-encode inflating). Explicit dims or explicit format opt out.
4. HEIC input works everywhere.
5. `AbortSignal`, `onProgress`, `compressMultiple`.

**Known structural facts:**
- `compressMultiple` is a strict serial `for … await` loop. There is no concurrency anywhere.
- The 0.3.2 refactor *prepared* the worker seam (`platform.js` + `__setCapabilities`) but
  **the worker backend was never shipped**. All compression runs on the main thread.

### 1.3 The app (`website/src`, ~1,490 lines across `components/tool` + hook)

Already built — do **not** propose these as new features:

- `/tool` route with its own layout; also embedded as a demo on the landing page
  (`variant: 'tool' | 'embed'`), plus a fullscreen mode.
- `Dropzone` — drag/drop, click, keyboard (Enter/Space), example loader.
- **Clipboard paste** — window-level `paste` handler in `CompressorApp.jsx`.
- `ControlPanel` — quality slider, format segmented control (Auto/WebP/JPEG/PNG, +AVIF when
  supported), maxWidth, maxHeight, maxSizeMB.
- `PreviewWorkspace` — compare / original / optimized view modes ("drag to compare").
- `StatsBar` + `FileChip` — size before → after, signed savings (`−80%` / `+37%`).
- `AutoInfo.jsx` — **`AutoSummary`** explains what Auto resolved to (format · WxH · quality)
  and shows "resized from WxH" when the 2048 cap fired; **`OptimizedWarning`** alerts when
  output grew and offers a one-tap "Switch to Auto". So the Safari 2048 cap and the PNG
  inflation case are *already surfaced in the UI* — they are capability gaps, not UI gaps.
- Debounced (200 ms) live re-compression on every parameter change; `time` is already
  measured in `lib/compress.js` (`performance.now()` around `compress`) but not displayed.
- Mobile: `ProMobileLayout`, `ToolMobileSheet` (expandable), `EmbedMobileLayout`.
- **i18n**: `en` / `es` / `pt-br` with a locale switcher.
- **PWA basics**: `manifest.json` (standalone, `start_url: /tool/`, theme `#494fdf`, maskable
  icons, categories `utilities`/`photo`), `sw.js` v4 (precache + navigation fallback),
  `ServiceWorker.jsx`, `InstallBanner.jsx` (`beforeinstallprompt` + iOS standalone detection).
- Fonts: Plus Jakarta Sans (display) + Geist Sans/Mono. `globals.css` is 1,905 lines with a
  `pro-*` design language and `--ease-spring: cubic-bezier(0.16,1,0.3,1)`.

**What the app cannot do today:** one file at a time (`useCompressor` holds a single `file`,
not a list), no queue, no presets, no history, no folder access, no OS integration, no
worker, no undo, no keyboard shortcuts beyond the dropzone, no metadata/EXIF control,
no crop, no real PNG optimization.

---

## 2. Competitive landscape (verified via search)

| Tool | Platform | Price | Engine / notes | Weakness to attack |
|---|---|---|---|---|
| **ImageOptim** | macOS | Free, OSS | chains MozJPEG, PNGOUT, Pngcrush, Gifsicle | JPEG/PNG/GIF/SVG only — **no WebP, AVIF, HEIC, JPEG-XL**; no lossy control; no resize; slow (serial CPU chain); Mac-only |
| **Squoosh** | Web | Free | WASM codecs (mozjpeg, oxipng, libavif, webp) | **one image at a time**; no batch, no queue, no presets, no OS integration; effectively unmaintained-feeling |
| **Optimage** | macOS | Paid | automatic quality targeting, wide formats incl. video/PDF | Mac-only, paid, opinionated/opaque |
| **Compresto** | macOS | Freemium | hardware-accelerated local, images+video+PDF | Mac-only |
| **ImageCrush** | macOS | $14.99 one-time | resize/crop/convert/batch-rename/preset sequences | Mac-only, paid |
| **JPEGmini** | Mac/Win | ~$60 | perceptual JPEG only | JPEG-only, expensive |
| **TinyPNG / TinyJPG** | Web | Freemium | server-side smart lossy | **uploads your images**; 20 files, 5 MB cap; PNG/JPEG only |
| **iLoveIMG / Compressor.io / Kraken / ShortPixel** | Web | Freemium | server-side | uploads; batch/size/monthly caps; privacy cost |
| **Caesium / FileOptimizer / RIOT** | Desktop | Free | CPU chains | dated UI, Windows/Linux-flavoured |

**The shape of the gap.** Nobody occupies the intersection of: *free · install-free · private
(never uploads) · batch · modern formats (AVIF/WebP/HEIC-in) · cross-platform · fast · beautiful.*
Squoosh has the codecs and the privacy but not the batch or the polish. ImageOptim has the
Mac-native feel but neither modern formats nor lossy control. TinyPNG has the batch but takes
your files to a server. That intersection is the product.

---

## 3. Decision A (taken) — the app ships WASM codecs; the library stays 2 KB

**Position:** `packages/compresso` remains a ~2 KB, zero-required-dep canvas compressor.
The **app** lazy-loads WASM codecs (the jSquash family: mozjpeg / oxipng / webp / libavif,
already the same encoders Squoosh and ImageOptim use) behind an explicit engine choice.

**Why this is not optional.** `canvas.toBlob` is materially worse bytes-per-visual-quality
than mozjpeg/libavif, and it cannot quantize PNG at all. Every native app we are trying to
beat uses these encoders. **We cannot claim "10x better output" while losing on compression
ratio to the free incumbent.** Meanwhile the WASM download costs the npm package literally
nothing, because the app is a separate artifact (§1.1).

**Shape of it:** two engines, one honest label.
- **Instant** (canvas / current path) — zero download, runs immediately, great for previews
  and for the live-slider feedback loop.
- **Maximum** (WASM) — lazy-fetched on first use, cached by the service worker, used for the
  final encode. Bigger savings, real PNG quantization, and — critically — **WebP/AVIF encode
  on Safari**, which dissolves the 2048 px fallback cap entirely (§1.2 invariant 3).

A natural default: preview with Instant while the slider moves, final-encode with Maximum.
That is also the answer to "10x better *and* feels faster" — most tools make you choose.

**If we reject this:** the product is a nicer Squoosh-shaped UI over canvas output. Still
useful (privacy + batch + polish), but the "beats ImageOptim on bytes" claim must be dropped
from all copy, and PNG (§4) stays permanently broken.

### 3.1 The unresolved tension: WASM quality vs. the speed claim

**Do not hand this to planning as if the two wins compose.** They run through the same
component and pull against each other:

- Canvas encode is **hardware-backed** — the browser's native encoder, often GPU-assisted.
- WASM encode is **software, single-threaded per worker**. `mozjpeg` and `oxipng` are
  tolerable (tens to low hundreds of ms for typical photos). **`libavif` encode is the
  outlier — plausibly seconds per megapixel.** A 200-photo batch through WASM AVIF could be
  *slower* than today's canvas path, not faster.

So "Instant vs. Maximum" cannot be one global toggle at batch scale, and §8's animated
savings counter assumes a throughput the AVIF path may not deliver. Candidate resolutions
for the planning session to pick between (do not assume one here):

- **Per-codec engine selection** — WASM for JPEG and PNG (where it's the clear, cheap win),
  canvas for WebP/AVIF wherever the browser can encode them natively.
- **AVIF as single-image-only** — offered for the "one hero image, squeeze it hard" job,
  disabled or warned-on for large batches.
- **Effort/speed dial on the AVIF encoder** — libavif exposes a speed parameter; a fast
  preset may still beat canvas on bytes at acceptable cost. Needs measurement.
- **Budgeted batches** — estimate total encode time up front and tell the user before they
  commit ("~4 min for 200 files at Maximum · ~20 s at Instant").

This is the one place where "10x better" and "100x faster" are in direct conflict. Measure
before deciding (§6.2) — the `_assets/` corpus and the existing `time` instrumentation make
it cheap.

---

## 4. Decision B (forced) — PNG is a hole, and it's the strongest argument for A

`compress.js` exempts `image/png` from the never-bigger ceiling, with an accurate comment:
PNG ignores `quality`, so the size search can't help. In practice, canvas PNG re-encode is a
no-op that frequently **inflates** the file — which is why `OptimizedWarning` exists.

PNG and screenshots are ImageOptim's and TinyPNG's entire reputation. A "10x better image
optimizer" that can make PNGs *bigger* fails the first thing a skeptical user will try
(drag a screenshot in). `oxipng` (lossless) + `imagequant`-style palette reduction (lossy)
fixes this and only exists via WASM.

**Open sub-question for planning:** does the app also want *lossless* mode as a first-class
concept ("never touch a pixel, just shrink the container"), which is ImageOptim's core
promise and something we currently have no notion of?

---

## 5. Decision C (forced) — batch is a rewrite, not a list view

Two facts make this non-negotiable to name up front:

1. `compressMultiple` is a serial `for … await` loop — no parallelism.
2. `useCompressor` models exactly one file: `file`, `originalUrl`, `result`, one set of
   params. A queue is a different state machine (per-item status, per-item overrides,
   cancellation, partial failure, retry, ordering, memory pressure).

So "add batch" = new state model + a **worker pool** + a results/queue UI + a zip/download-all
path. It is the largest chunk of work in the product and should be scoped as such, not as
"render an array."

---

## 6. What "100x faster" and "10x better" must mean (anchored, not vibes)

### 6.1 Faster — the mechanism is the worker pool, and it is genuinely unclaimed

`platform.js` was refactored in 0.3.2 *precisely* to make this swappable, and the swap was
never done. The move: `createImageBitmap` + `OffscreenCanvas` + `convertToBlob`, N workers
sized off `navigator.hardwareConcurrency`, with `__setCapabilities` used to hand each worker
the main thread's probe result instead of re-probing per worker.

Effects: main thread never blocks (UI stays at 60fps while 200 photos process), and
throughput scales with cores. **EXIF orientation is the correctness landmine** when moving
from `new Image()` (which auto-orients) to `createImageBitmap` — must be handled explicitly
(`imageOrientation: 'from-image'` and/or manual EXIF parse). Portrait HEIC test assets exist
at `_assets/heic/`.

### 6.2 Faster *than what* — pick the baseline and say it in the copy

- **vs. upload tools (TinyPNG, iLoveIMG, Kraken, ShortPixel):** the win is the network round
  trip, and it's honest and enormous. 50 photos × upload + queue + download vs. zero bytes
  leaving the device. This is where a "100x" claim is defensible.
- **vs. ImageOptim:** the win is parallel GPU/hardware-backed decode + encode vs. a serial
  chain of CPU optimizers. Real but smaller — needs a measurement before it's claimed.
- **vs. Squoosh:** the win is batch existing at all.

`lib/compress.js` already records `time` per compression, and `_assets/{heic,jpg,png}/` holds
a test corpus. **A real benchmark is cheap and should be a planned deliverable** — do not ship
a numeric claim without it.

### 6.3 Better — the 10x is OS integration + trust, not nicer sliders

What native apps own and web tools don't:

- **Optimize a folder in place** (`showDirectoryPicker` + write back) — this is the
  ImageOptim-killer. ImageOptim's entire workflow is "drag a folder, files get smaller."
- **"Open with Compresso"** from the OS file manager (`file_handlers` + `launch_queue`).
- **Share-to-app** from the mobile photo library (`share_target`).
- **Drag optimized files back out** to Finder/Explorer (`DataTransfer` drag-out).
- **Presets** ("Web hero 1600px WebP q80", "Email ≤5 MB", "Discord ≤10 MB") — this is what
  turns a tool into a habit, and it's what ImageCrush charges $14.99 for.

Plus the trust differentiators no native app can match: **install-free, cross-platform, free,
and provably never uploads** (a "0 bytes sent" indicator is a real feature, not a slogan —
it can be made literally verifiable in devtools).

---

## 7. Platform capability matrix

| Capability | Purpose | Status |
|---|---|---|
| Web Workers + `OffscreenCanvas` + `createImageBitmap` | the speed story | ✅ **verified** — `OffscreenCanvas`/`convertToBlob` is Baseline widely-available since **March 2023** (Chrome 69+, Firefox 105+, **Safari 16.4+ incl. iOS**). Available in worker contexts. Not yet used by us. |
| WASM codecs (mozjpeg/oxipng/webp/avif) | the quality story | ⚠️ WASM itself is universal (safe). **Unverified:** per-codec bundle sizes, current jSquash package health, and encode throughput — all three need a spike (§3.1) |
| `navigator.hardwareConcurrency` | pool sizing | ⚠️ **assumed** universal; Safari is known to report a conservative number. Cheap to confirm at build time. |
| **File System Access** (`showDirectoryPicker`, `showSaveFilePicker`) | folder-in-place, save-as | ⚠️ **verified Chromium-only** (Chrome/Edge/Opera desktop). Firefox and Safari expose **only OPFS**, no local-disk pickers. → must be a progressive enhancement with a `<input webkitdirectory>` + download-zip fallback |
| **`file_handlers` + `launch_queue`** ("Open with") | OS integration | ⚠️ **verified Chromium desktop only**. iOS/Safari: no. |
| **`share_target`** (inbound share from photo library) | the mobile hook | ❌ **verified NOT supported on iOS Safari**. Android/Chromium only. **This is the highest-risk assumption and it fails** — the iOS mobile entry point must be the file picker / paste / `navigator.share` outbound, not inbound share. Plan mobile accordingly. |
| `navigator.share({ files })` (outbound) | "share result to Messages/Mail" | ✅ works on iOS — this is the mobile *exit*, and it's a good one |
| **OPFS** (`navigator.storage.getDirectory`) | spool large batches without holding blobs in RAM | ✅ **verified** — Safari and Firefox implement the File System API as an *origin-private sandbox only*, which is exactly OPFS; Chromium has both. The cross-browser answer for big-batch memory pressure. |
| `beforeinstallprompt` | install banner | ✅ already implemented; Chromium only, iOS needs the manual A2HS hint (already handled) |
| Canvas AVIF/WebP encode | current `auto` path | ⚠️ Safari cannot encode WebP/AVIF from canvas → the 2048 px JPEG cap. **Decision A dissolves this.** |

**Design consequence:** the product cannot be architected around File System Access or
`share_target`. Those are *desktop-Chromium delighters*. The universal spine must be:
drop / pick / paste → worker pool → download (single or zip) / `navigator.share`.

---

## 8. Product concept (the thing to argue about next session)

**One-line:** *the fastest way to make images smaller — batch, private, install-free, and
better than the Mac apps you'd pay for.*

Three surfaces, one engine:

1. **The Deck (desktop).** Drop 200 files. A queue fills, workers chew through it in
   parallel, savings tick up live in an aggregate readout ("saved 412 MB of 1.2 GB · 66%").
   Left rail = inspector/params + presets; center = grid or the compare view for the
   selected item; bottom = status bar with throughput, engine, and "0 bytes uploaded."
   Select-all overrides, per-file overrides, download-all as zip, drag-out to Finder.
2. **The Pocket (mobile PWA).** Photo-picker-first, not dropzone-first. Multi-select grid →
   a preset chip row (Email · Message · Upload · Max) → one primary action → results with
   `navigator.share`. Standalone display mode, thumb-reachable controls, existing sheet
   layout is the right bone structure.
3. **The Watcher (desktop Chromium only, progressive enhancement).** Point it at a folder;
   it optimizes in place. This is the ImageOptim replacement and the reason someone stops
   opening a native app.

**Signature moments worth designing deliberately** (this is where "feels 10x better" lives):
- The live compare handle that stays *responsive during* compression, not after.
- A savings counter that animates as the batch completes — the dopamine ImageOptim's plain
  file list never gives you.
- Instant→Maximum handoff visible as a quality "settling" rather than a spinner.
- An honest byte counter for network: `0 B sent`.

---

## 9. Craft references (Mobbin — reviewed, with the specific takeaway)

**Pro-tool chrome / inspector layout** — for The Deck:
- [Framer](https://mobbin.com/screens/b9342420-e6c8-4183-8194-c56791fc13f8) — right-rail
  inspector with dense collapsible groups + floating bottom toolbar over the canvas. The
  floating-toolbar-over-canvas pattern is a better fit than our current fixed footer.
- [Rive](https://mobbin.com/screens/b1186b2d-7292-44de-b10f-8ff4cc56223b) — three-pane
  (tree · canvas · properties) with tight numeric steppers; the numeric-input density we
  want for dimensions.
- [Leonardo AI — Realtime Canvas](https://mobbin.com/screens/e35088fe-a074-4482-8c3e-3f3bf812b518)
  — dark, split input/output canvases with a persistent bottom control bar.
- [Leonardo AI — Upscaler](https://mobbin.com/screens/705397a7-62de-43c5-a9f2-f56d6b7c511f)
  — **closest analogue to our exact problem**: source thumbnail + settings stack on the left,
  before/after wipe handle on a big viewport, filmstrip of queued images along the bottom,
  zoom % in the corner. The filmstrip is the batch pattern we're missing.
- [Ditto](https://mobbin.com/screens/339e80a4-4653-484a-b62c-b5e037f699aa) — left frame list
  + right metadata panel; good model for per-item status in a queue.

**Batch queue / progress** — for the state we don't have yet:
- [AWS S3 upload status](https://mobbin.com/screens/d0b2a1fa-99a9-4c29-ba83-f77a3f850d40) —
  the rigorous version: aggregate banner (remaining, %, ETA, throughput) *plus* a per-file
  table with Succeeded / In progress (58%) / Pending / Failed + error column. Our aggregate
  readout should carry throughput and ETA like this.
- [Proton Drive](https://mobbin.com/screens/12f6528d-e78a-4540-9087-784c0baa9172) — dockable,
  minimizable transfer panel with All/Active/Completed/Failed tabs. The right pattern for
  keeping a long batch out of the way without hiding it.
- [PandaDoc](https://mobbin.com/screens/6e7783c1-2ce2-4ba2-832d-bab89ec45f67) — "Imported 0 of
  4 files" + a warning not to leave the page. We'll need that warning too (worker teardown).
- [Air](https://mobbin.com/screens/8bd82e1c-8a69-4487-8c06-b73a8d26eb6e) — "Apply to all
  items" toggle in a side panel over a processing grid — **exactly** the batch-override
  affordance we need for params.
- [Savee](https://mobbin.com/screens/4d67f791-bef4-48c9-ab56-944975517ebb) — full-bleed dark
  "Uploading 2 of 3" with per-tile Waiting/Uploading state painted onto the thumbnails
  themselves. Closer to the emotional register we want than a table.

**Mobile multi-select** — for The Pocket:
- [Apple Photos](https://mobbin.com/screens/d55c8518-c10c-4dc4-a83b-5da9531f741b) —
  "3 Photos Selected" as a floating pill between two action buttons; the platform-native
  grammar users already know.
- [Lapse](https://mobbin.com/screens/d6197cfe-24f4-435f-9c03-b9440ee9e974) — "4 selected ✕"
  chip + a horizontal icon-row action sheet (Export/Save/…) — our preset row should look
  like this, not like a form.
- [Google Photos](https://mobbin.com/screens/a0249152-98cb-466e-863c-f7a8e3baff9c) — bottom
  action bar with labeled icons; date-group select-all checkmarks.

**Note:** we cannot use the OS photo picker's own multi-select UI on the web — a
`<input type="file" multiple accept="image/*">` hands off to the native picker and returns
a list. So The Pocket's grid is *our* grid, rendered after selection. Design accordingly.

---

## 10. Feature ledger — exists vs. missing

| | Today | Needed for the product |
|---|---|---|
| Drop / click / paste input | ✅ | keep |
| Multi-file / queue | ❌ single file | ✅ core (§5) |
| Quality / format / maxW / maxH / maxSizeMB | ✅ | keep; add per-item override |
| Compare / before-after | ✅ | keep; add zoom + pixel-peep |
| Live re-compress on param change | ✅ 200 ms debounce | keep; move off main thread |
| Savings readout, signed | ✅ | add aggregate + animated total |
| Inflation warning + Auto explainer | ✅ (`AutoInfo`) | keep — genuinely good |
| HEIC input | ✅ | keep |
| Parallel workers | ❌ | ✅ core (§6.1) |
| WASM codecs / real PNG opt | ❌ | ✅ core (§3, §4) |
| Lossless mode | ❌ | decide (§4) |
| Presets | ❌ | ✅ high value / low cost |
| Download all (zip) | ❌ | ✅ core |
| Folder in place | ❌ | Chromium-only enhancement |
| "Open with" file handler | ❌ | Chromium-only enhancement |
| Outbound `navigator.share` | ❌ | ✅ mobile exit path |
| Drag-out to Finder | ❌ | desktop delighter |
| Keyboard shortcuts / command palette | ❌ | pro-feel, cheap |
| EXIF/metadata strip toggle | ❌ | privacy angle — also a size win |
| Crop / rotate | ❌ | scope question — probably out |
| History / recent | ❌ | scope question |
| Offline (SW) | ✅ basics | must cover WASM binaries |
| i18n en/es/pt-br | ✅ | keep |
| Install banner | ✅ | keep |

---

## 11. Open questions for the planning session

1. **Scope of the split.** Does the PWA stay at `/tool` inside the Next site, or become its
   own route group / deploy? (`start_url` is already `/tool/`; the landing page embeds the
   same component via `variant`.) This decides how much of `globals.css`'s 1,905 lines the
   app inherits.
2. **Engine UX.** Is Instant/Maximum a user-facing toggle, an automatic preview→final
   handoff, or hidden entirely behind "Auto"? (Compresso's existing brand promise is that
   Auto is smart and explains itself — `AutoSummary` sets that precedent.)
3. **Lossless as a first-class mode?** (§4)
4. **Does the library get any of this?** A `compresso.js` v1.0 with a worker backend is the
   Phase-3 growth-plan item and would benefit the npm package independently. Same work,
   different artifact — sequence it deliberately.
5. **Batch ceiling.** 50 files? 500? Memory strategy (OPFS spooling vs. in-RAM blobs) follows
   from the answer.
6. **Monetization / positioning.** Free forever vs. a paid tier. Everything here works
   offline with no server, so there's no marginal cost — which is itself a strategic weapon
   against $15–60 native apps.
7. **Name/brand.** Does the PWA stay "Compresso" (shared with the library) or get its own
   identity? Affects the manifest, icons, and the SEO work already done in Phase 1.

---

## 12. Non-goals / guardrails

- Do not add dependencies to `packages/compresso`. Ever. The 2 KB claim is the library's
  entire positioning.
- Do not break the five invariants in §1.2 — especially never-bigger.
- Do not upload. Not for "just analytics", not for a server-side codec fallback. "Never
  leaves your device" is the moat against every web competitor in §2.
- Do not ship a numeric speed claim without the benchmark from §6.2.
- Do not architect around File System Access or `share_target` (§7).
