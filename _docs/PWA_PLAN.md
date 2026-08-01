# Compresso PWA — Build Plan

**Companion to** [`PRODUCT_CONTEXT.md`](./PRODUCT_CONTEXT.md) (read that first — landscape, gaps,
capability matrix, decisions already taken).
**This doc:** how the standalone PWA gets built. Written 2026-07-31.
**Handoff:** per `multi-model-handoff-workflow` — this plan is for validation before
implementation. Nothing here has been built.

---

## 0. The brief, restated as constraints

| Requirement | Hard constraint it creates |
|---|---|
| Standalone app, fresh repo, fresh Vercel project | No code, no CSS, no components ported from `website/`. Clean break. |
| Uses compresso at its core | Consumes `compresso.js` from npm. **Blocked on 0.4.0 — see §1.** |
| 100% offline once installed | Everything in the precache. This kills lazy WASM for v1 (§3). |
| Vercel free tier | Fully static. No serverless, no edge functions, no server-side anything. |
| 7 languages, auto-detected, user-switchable | en · es · fr · de · it · pt-BR · zh-Hans. Forces CJK font strategy (§6). |
| Organic craft, stellar-designer feel, never AI-generated | §7 design system + §9 anti-generic reject-list. |
| Smooth microinteractions — **not bouncy** | §8 motion system, enforced as tokens + a ban list, not prose. |

---

## 1. BLOCKER — compresso 0.4.0 must ship first

**The finding:** `packages/compresso/src/platform.js` cannot run in a Web Worker. Three
call sites reach for the DOM:

- `loadElement()` → `new Image()`
- `createCanvas()` → `document.createElement('canvas')`
- `canEncode()` → `document.createElement('canvas').toDataURL()`

`__setCapabilities` only patches the third. Decode and canvas still throw. So **importing
compresso into a worker fails today**, and npm currently has **0.3.2**. The PWA's entire
speed story depends on a package version that does not exist yet.

### 1.1 Sequencing (non-negotiable)

```
compresso 0.4.0  (this repo)  →  npm publish  →  PWA repo depends on ^0.4.0
```

### 1.2 What 0.4.0 does

`platform.js` branches on environment (`typeof document === 'undefined'`):

| | main thread (today) | worker (new) |
|---|---|---|
| decode | `new Image()` + object URL | `createImageBitmap(blob, { imageOrientation: 'from-image' })` |
| canvas | `document.createElement('canvas')` | `new OffscreenCanvas(w, h)` |
| encode | `canvas.toBlob` | `canvas.convertToBlob` *(already handled)* |
| capabilities | `toDataURL` probe | injected via `__setCapabilities` *(already exists)* |

Verified: `OffscreenCanvas` + `convertToBlob` are Baseline since March 2023 (Chrome 69+,
Firefox 105+, **Safari 16.4+ including iOS**), available in worker contexts.

### 1.3 Two risks to resolve inside 0.4.0

1. **EXIF orientation — the correctness landmine.** `new Image()` auto-orients; raw
   `createImageBitmap` does not, unless told. Use `imageOrientation: 'from-image'`.

   **The fixture problem — resolve this before M0 starts.** I scanned `_assets/`: **every JPEG
   and HEIC there is orientation `1` or has no EXIF at all.** There is currently *no fixture
   that can fail this test*, so "portrait HEIC is upright" is not a runnable criterion. Two
   paths need separate coverage, because they behave differently:

   - **JPEG/PNG direct:** `createImageBitmap(file, { imageOrientation: 'from-image' })`.
     Needs a **JPEG with a non-1 orientation tag** (6 = rotate 90° CW is the common iPhone
     case). Create one — e.g. `exiftool -Orientation=6 -n` on a copy of an existing landscape
     fixture — and commit it as `_assets/jpg/exif-orient-6.jpg`.
   - **HEIC:** the path is `decodeHeic()` → Blob → `createImageBitmap`. **Whether `heic-to`'s
     output Blob carries an orientation tag at all is unknown** — and if it doesn't,
     `imageOrientation: 'from-image'` is a no-op and orientation must already have been baked
     in by the decoder. Determine which, empirically, before writing the code. This is the
     likeliest place a silently-sideways photo ships.

   A sideways photo is a worse regression than a slow one. Both paths get a test.
2. **Bundle budget.** The branch costs bytes against the "~2 KB" claim that is the library's
   whole positioning. **Measure first.** If the main entry grows past ~2.3 KB gzip, ship the
   worker backend as a **subpath export** (`compresso.js/worker`) so the default import stays
   at 2 KB and only worker consumers pay. Decide by measurement, not by preference.

### 1.4 Scope discipline

0.4.0 is *only* the platform seam + tests + changelog. No API changes, no new options, and
all five invariants from `PRODUCT_CONTEXT.md` §1.2 hold. This also completes Phase 3 of the
existing library growth plan — one piece of work, two payoffs.

---

## 2. Stack & repo

```
compresso-app/                  ← fresh repo, fresh Vercel project
├── index.html
├── vite.config.ts              vite-plugin-pwa (Workbox, injectManifest)
├── vercel.json                 static headers + SPA rewrite
├── public/
│   ├── icons/                  192, 512, maskable 192/512, apple-touch, favicon
│   └── fonts/                  self-hosted woff2 (see §7.3) — no Google Fonts request
└── src/
    ├── main.tsx                mounts <App/>; no router
    ├── app/
    │   ├── App.tsx             the one screen; state machine lives here
    │   └── sw.ts               custom service worker (injectManifest)
    ├── engine/
    │   ├── pool.ts             worker pool, sized off hardwareConcurrency
    │   ├── worker.ts           imports compresso.js, receives __setCapabilities
    │   └── types.ts            Job / JobResult / JobStatus
    ├── state/
    │   └── queue.ts            the queue reducer (§5)
    ├── i18n/
    │   ├── index.ts            detect · normalize · switch · Intl formatters
    │   └── locales/            en · es · fr · de · it · pt-BR · zh-Hans .json
    ├── design/
    │   ├── tokens.css          color · type · space · radius · motion
    │   ├── grain.ts            the SVG turbulence overlay (§7.4)
    │   └── motion.ts           easing + duration constants, mirrored from tokens.css
    └── ui/                     components
```

**Choices, briefly:**

- **Vite + React + TypeScript.** Next static export buys nothing here — there's no server,
  no SSR, no routes. Vite gives faster builds and full control of the SW.
- **No router.** It's one screen with states. Adding react-router would be ceremony.
- **`vite-plugin-pwa` in `injectManifest` mode** — Workbox generates the precache manifest,
  we own the SW logic.
- **CSS:** plain CSS with custom properties + CSS Modules. **Not Tailwind.** Tailwind's
  utility defaults are the single fastest route to the generic look this brief forbids
  (§9), and the design here is built on hairlines, optical spacing, and grain — not a
  spacing scale.
- **Animation:** CSS transitions/`@keyframes` first; the Web Animations API where JS
  orchestration is needed. **Reach for a motion library only if FLIP list reordering demands
  it** — and then see the bounce ban in §8.3.
- **State:** `useReducer` + context. No Redux/Zustand for one screen.
- **Deps kept near zero** — matches the project's ethos and keeps the precache small.
  Realistic list: `react`, `react-dom`, `compresso.js`, `vite-plugin-pwa`. Zip export
  (`fflate`, ~8 KB) only if §5's download-all lands in v1.

---

## 3. Engine — decision taken: canvas only in v1

`PRODUCT_CONTEXT.md` §3 argued the app *should* ship WASM codecs. **The offline requirement
changes the timing**, and it's worth stating why plainly:

> Lazy-loading a codec is normally fine. Under "works 100% offline once installed" it becomes
> a **user-visible failure state** — install, go offline, choose Maximum, and it breaks.

So v1 has two honest options: precache multi-MB of WASM (slow install, heavy update cycle,
and libavif's encode speed may make batches *slower* — see `PRODUCT_CONTEXT.md` §3.1), or
ship canvas only. **v1 ships canvas only.** Precache stays a few hundred KB, install is
instant, and "100% offline" is literally true with no asterisk.

**The PNG hole is closed without WASM** (`PRODUCT_CONTEXT.md` §4): default PNG input to
**WebP output**, which is a large, real win on screenshots and needs no new codec. "Keep as
PNG" remains available as an explicit opt-out, and selecting it surfaces the inflation
warning we already know how to write.

**v1.1 — "Maximum" engine.** mozjpeg + oxipng + imagequant (+ libavif, pending the throughput
spike) as a deliberate, user-initiated one-time download with its own honest UI: size shown
before download, cached by the SW after, and a clear *"not available offline until
downloaded"* state. That is a feature with a story, not a lazy import that silently fails.

**If we reject this and force WASM into v1:** budget for a ~2–4 MB install, an explicit
first-run download step, and re-verify that "100% offline" survives it.

---

## 4. Offline strategy

| Bucket | Strategy |
|---|---|
| App shell (`index.html`, JS, CSS) | Precache, cache-first, revision-hashed by Workbox |
| Fonts (woff2, latin subset) | Precache. Self-hosted — a Google Fonts request is a network dependency and a privacy leak |
| Icons, manifest | Precache |
| All 7 locale JSONs | **Bundled into the main chunk** (~4 KB each, ~28 KB total). Not lazy — language switching must work offline, and lazy-loading 4 KB files is worse on every axis |
| compresso + worker chunk | Precache (it's the product) |
| User images | Never cached, never uploaded, never persisted without consent |

**Update flow:** SW `skipWaiting` is **not** automatic — a batch in flight must not be killed
by an update. Register the waiting worker, finish the queue, then surface a quiet hairline
"a new version is ready · reload" affordance in the status bar (never a modal, never a toast).

**Offline indicator:** `navigator.onLine` + `online`/`offline` events → a hairline dot in the
status bar. Because nothing here needs the network, offline is a *reassurance*, not a warning:
copy should read like "working offline" and never like an error.

**Verify:** DevTools → Application → Service Workers → Offline, then hard-reload and run a
full compress. This is an acceptance criterion, not a nice-to-have.

---

## 5. Architecture — queue + worker pool

### 5.1 State model

`PRODUCT_CONTEXT.md` §5: this is a rewrite, not a list view. Shape:

```ts
type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';

type Job = {
  id: string;
  file: File;
  status: JobStatus;
  progress: number;            // 0..1, from compresso's onProgress
  overrides?: Partial<Params>; // per-file params; falls back to global
  result?: CompressResult;
  error?: string;
};

type QueueState = {
  jobs: Job[];
  globalParams: Params;        // quality, format, maxW, maxH, maxSizeMB
  selectedId: string | null;   // which job the inspector + compare view shows
  totals: { originalBytes: number; outputBytes: number; done: number };
};
```

Reducer actions: `add`, `start`, `progress`, `complete`, `fail`, `cancel`, `remove`,
`setGlobalParams`, `setOverride`, `select`, `clear`. Totals are derived, never stored twice.

### 5.2 Worker pool

- Size: `Math.max(1, Math.min(navigator.hardwareConcurrency ?? 4, 8) - 1)`, **with the
  preview worker (§5.3) counted inside that cap, not outside it.** Nine workers each holding a
  decoded 12 MP bitmap is an OOM on a low-end Android, and the preview worker is the one that
  runs *while* the batch runs. Total live workers never exceeds 8. Cap at 8 because memory,
  not CPU, is the binding constraint. Confirm Safari's reported value at build time rather
  than trusting it.
- Probe capabilities **once on the main thread**, hand the result to every worker via
  `__setCapabilities` — no re-probing per worker (this is exactly why that export exists).
- Transfer `File`/`Blob` to the worker (structured-clone, no copy of the underlying bytes);
  transfer the result `Blob` back.
- Cancellation via `AbortSignal` per job (compresso already supports it) + `worker.terminate()`
  as the hard stop for a full queue cancel.
- **Memory ceiling:** cap concurrent in-flight decoded bitmaps, and revoke every object URL on
  job removal. OPFS spooling is the escape hatch if large batches OOM — noted, not v1.

### 5.3 The live-preview loop (this is a craft requirement, not just perf)

Parameter changes must feel instant. Two-tier:

1. **Immediate (≤16 ms):** the on-screen preview updates optimistically — the compare view
   holds the previous output, and only the numeric readout enters its "settling" state.
2. **Debounced (180 ms):** the selected job re-compresses on a *dedicated* preview worker,
   separate from the batch pool, so a running 200-file batch never delays the slider.

That separation is what makes the app feel faster than everything in the landscape.

### 5.4 Input paths

Drop · click-to-pick (`multiple`, `accept="image/*,.heic,.heif"`) · paste (window-level) ·
mobile photo picker. Deliberately **not** in v1, per `PRODUCT_CONTEXT.md` §7: File System
Access (Chromium-desktop only), `file_handlers`, `share_target` (**confirmed broken on iOS
Safari**). Outbound `navigator.share({ files })` **is** in v1 — it's the mobile exit path and
it works on iOS.

---

## 6. Internationalization

**Locales:** `en` · `es` · `fr` · `de` · `it` · `pt-BR` · `zh-Hans`

### 6.1 Detection & switching

```
navigator.languages → normalize → first match → fallback 'en'
localStorage['compresso.lang'] overrides detection, always
```

Normalization must handle: `pt`/`pt-PT`/`pt-BR` → `pt-BR`; `zh`/`zh-CN`/`zh-SG`/`zh-Hans-*` →
`zh-Hans` (`zh-TW`/`zh-HK` also → `zh-Hans` in v1, with the gap acknowledged in the switcher);
region subtags stripped elsewhere (`de-AT` → `de`). Set `<html lang>` on every change — it
drives hyphenation, font fallback, and screen readers.

Implementation: a tiny custom hook over a flat key map. No i18n library — 7 small locales and
one interpolation case don't justify the dependency, and the zero-dep instinct is on-brand.

### 6.2 Numbers are the entire UI — localize them, don't just translate

Every meaningful surface is numeric: bytes, percentages, dimensions, counts. Translating the
labels and leaving `1.5 MB` in a French UI is the tell that a product was localized carelessly.

- `Intl.NumberFormat(locale, { maximumFractionDigits: 1 })` for every byte and percent value.
  German/French/Italian/Spanish/Portuguese use `,` as the decimal separator.
- `Intl.PluralRules` for "N files" — Latin plurals differ; `zh-Hans` has no plural form at all.
- Units (`KB`/`MB`) stay Latin across all locales including `zh-Hans` — that's the convention.
- Percentages via `style: 'percent'`, not string concatenation.

### 6.3 CJK — the constraint that shapes the type system

**The trap:** the editorial display serif this design depends on (§7.3) has **no CJK
coverage**, and CJK webfonts run to multiple MB — which collides head-on with the offline
precache budget. Left unplanned, Chinese renders in a browser default while every other
language looks crafted.

**The rule:**

- Latin display + UI faces are scoped with `unicode-range` (latin + latin-ext only).
- `zh-Hans` falls back to a **system CJK stack** — zero bytes, and it looks *native*, which is
  the right answer anyway: `"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif`.
- The `:lang(zh-Hans)` scope adjusts for CJK metrics: slightly larger base size, looser
  `line-height` (1.7 vs 1.5), and **no letter-spacing** (negative tracking wrecks CJK).
- The big display numerals stay in the Latin face regardless of locale — digits are digits,
  and it keeps the signature moment intact in every language.

### 6.4 Layout must survive German

German averages ~35% longer than English and compounds don't wrap. `pt-BR` and `fr` also run
long. Editorial layouts with tight measures break first.

- Buttons, chips, and stat labels: `min-width` on the container, never a fixed width; allow
  two lines with a tighter `line-height` rather than truncating.
- **Every screen is reviewed in `de` and `zh-Hans`, not only `en`.** Acceptance criterion.
- The one place truncation is allowed is the filename — with a middle-ellipsis, not a
  trailing one, so extensions stay visible.

---

## 7. Design system — "The Press"

### 7.1 The concept (why it will not look generated)

Compresso → *espresso*, *pressing*. The app is a **small print shop**: paper, ink, pressure,
impression. Images arrive, get pressed, come out lighter. The metaphor earns real decisions:
paper-warm surfaces, ink-black type, letterpress *deboss* instead of drop shadows, an
optically-set editorial layout, and a darkroom "develop" reveal for thumbnails.

This is the anti-AI defence. Generated UI is generic because it has no argument behind it.
Every choice below traces back to this one, and the implementer should be able to answer
"why is this here?" with the metaphor, or drop it.

### 7.2 Color

Warm, low-chroma, one signal. Not a palette — a set of inks.

```css
/* light — "paper" */
--paper:        #F6F2EA;   /* warm stock, not white */
--paper-raised: #FBF8F2;   /* the pressed sheet */
--paper-sunk:   #EDE7DC;   /* the tray beneath */
--ink:          #171412;   /* warm near-black, never #000 */
--ink-soft:     #5A524A;
--ink-faint:    #948B80;
--rule:         #1714121A; /* hairlines are ink at low alpha, never a grey */
--signal:       #B8442A;   /* burnt vermilion — the single accent */
--signal-sunk:  #8E3320;

/* dark — "ink" (a press room at night, not a dashboard) */
--paper:        #16130F;   /* warm black, never neutral #111 */
--paper-raised: #1E1A15;
--paper-sunk:   #100D0A;
--ink:          #F0EAE0;   /* warm off-white, never #FFF */
--ink-soft:     #A79C8E;
--ink-faint:    #6E6459;
--rule:         #F0EAE01F;
--signal:       #E4643F;   /* lifted for the dark ground — same hue, more light */
--signal-sunk:  #C24E2C;
```

**Rules:** the signal color appears **at most twice per screen** — it's the compare seam and
the primary action, nothing else. Success is not green; it is the savings number set in ink at
a larger size. No gradients on surfaces. No color-coded status chips — status is conveyed by
type weight and hairline treatment.

> The old app's `#494fdf` is explicitly **not** carried over. That indigo is the exact hue that
> reads as generated.

### 7.3 Type

| Role | Face | Why |
|---|---|---|
| Display / numerals | **Fraunces** (variable — `opsz`, `wght`, `SOFT`, `WONK`) ⚠️ **verify first** | A serif with genuine idiosyncrasy. `WONK` produces the slightly-off, drawn-by-a-person letterforms no default has; `opsz` means the huge savings figure is *drawn* for that size rather than scaled up. **The axis names and the latin-subset woff2 weight are asserted here, not verified** — confirm both in M1 before the type system is built on them. Fallbacks if it doesn't hold up: **Instrument Serif** (sharper, more editorial, fewer axes) or **Newsreader** (variable `opsz`, warmer, quieter). |
| UI / body | **Instrument Sans** (variable) | Humanist, warm, quietly characterful. Explicitly **not Inter** — Inter is the house style of generated interfaces. |
| Metadata / mono | **Geist Mono** or **Martian Mono** | For filenames, dimensions, byte counts in dense contexts. Tabular by construction. |

Non-negotiables: `font-variant-numeric: tabular-nums` on **every** changing number (nothing
may shift width as it counts); self-hosted woff2, latin subset, `font-display: swap` with the
metric-matched fallback declared so there's no reflow; variable fonts only (one file per
family keeps the precache small).

Scale is optically set, not a ratio: `12 · 13 · 15 · 17 · 21 · 28 · 44 · 72`. The 72 is used
exactly once per screen — the savings figure.

### 7.4 Texture & surface

- **Grain.** One inline SVG `feTurbulence` (`baseFrequency ~0.8`, fractalNoise) as a data-URI,
  fixed to the viewport, `opacity: .035`, `mix-blend-mode: multiply` (light) / `soft-light`
  (dark), `pointer-events: none`. Zero network cost. This single layer does more for "feels
  crafted" than any amount of component polish.
- **Deboss, not shadow.** Pressed elements use a hairline inset:
  `inset 0 1px 0 var(--paper-sunk), 0 1px 0 var(--paper-raised)`. No `box-shadow: 0 4px 12px
  rgba(0,0,0,.1)` anywhere — that's the Material tell.
- **Hairlines carry the structure.** `1px` at `--rule` alpha, `0.5px` on `min-resolution: 2dppx`.
  Panels are separated by rules, not by boxes with borders and radii.
- **Radii are varied and meaningful:** image tiles `0` (a photo is a rectangle — respect it);
  panels `2px` (a trimmed sheet); the primary action a full pill (the only round thing on the
  screen, which is what makes it read as *the* action). **Never a uniform `rounded-lg`.**
- **Layout is asymmetric on purpose.** The inspector rail is `312px` — not a round number, set
  to the measure of its content. Optical alignment beats mathematical alignment; the savings
  figure aligns to its own cap-height, not its bounding box.

### 7.5 Status without color

§7.2 bans status chips and §9 bans green-success/red-error, but §5.1 has four job states and
§10.2 paints status onto thumbnails. **Without a defined alternative the implementer will
reinvent chips.** So the vocabulary is specified here — the axes are *opacity, type weight,
hairline treatment, and grain*, never hue.

| State | Thumbnail | Row / label |
|---|---|---|
| `queued` | 46% opacity, grain at 2× strength (the sheet hasn't been pressed yet) | filename `--ink-faint`, size in mono, no figure |
| `running` | full opacity, still in its develop-reveal (§8.5 #2) — the blur *is* the progress indicator, resolving as `onProgress` climbs | filename `--ink`, a hairline fills left-to-right beneath the row |
| `done` | fully resolved; tile settled 2px up (§8.5 #4) | savings figure in display face, `--ink`, one weight heavier than its neighbours |
| `failed` | 30% opacity, desaturated, **a single hairline struck diagonally corner-to-corner** in `--ink-soft` | reason in mono at metadata scale, `--ink-soft`; a text "Retry" affordance |

Progress is the develop-reveal itself, not a bar. That's the point of the metaphor: you watch
the image resolve.

**The inflation warning** (PNG kept as PNG, output larger than input — §3) is the *only* place
`--signal` is allowed outside the compare seam and the primary action, and it appears as a
**rule, not a fill**: a 2px `--signal` bar on the leading edge of the row, plus the savings
figure rendered with an explicit `+` and set in `--signal`. No icon, no background tint, no
chip. It reads as an editorial margin mark — a correction noted in red pencil, which is
exactly the register the metaphor wants.

Every one of these states also carries a text label for screen readers and an `aria-live`
announcement on transition — the visual language is quiet, so the accessible one must not be.

---

## 8. Motion system — smooth, never bouncy

This is the requirement most likely to be lost in implementation, so it's specified as
enforceable tokens and a ban list rather than adjectives.

### 8.1 Easing tokens (all with control-point y ≤ 1 — **no overshoot is representable**)

```css
--ease-standard: cubic-bezier(0.32, 0.72, 0, 1);   /* the default. long, quiet tail */
--ease-entrance: cubic-bezier(0.16, 1,    0.3, 1); /* strong decelerate, things arriving */
--ease-exit:     cubic-bezier(0.4,  0,    1,   1); /* accelerate away */
--ease-glide:    cubic-bezier(0.65, 0,    0.35, 1);/* symmetric — value/position changes */
```

### 8.2 Durations & choreography

```css
--dur-micro:      120ms;  /* hover, focus, press */
--dur-standard:   240ms;  /* state change, indicator travel */
--dur-entrance:   360ms;  /* something appears */
--dur-ceremony:   520ms;  /* the savings reveal — once per batch, and it must feel earned */
--stagger:         24ms;  /* list items; never more than 8 items' worth (192ms cap) */
```

Compositor properties only — `transform`, `opacity`, `filter`. Layout-affecting animation is
allowed only via FLIP. Any element that animates in must have a defined exit; nothing may pop
out of existence.

### 8.3 The bounce ban (explicit — this is how bounce sneaks back in)

- **Forbidden:** `cubic-bezier` with any y > 1; `animation: bounce`; scale overshoot past
  `1.02`; anything that crosses its target and returns.
- **If a motion library is used at all:** `type: "spring"` **defaults to overshoot**. Use
  `ease` transitions, or springs pinned to `bounce: 0`. This one line is the difference
  between the brief being met and being missed.
- Reference note: the old repo's `--ease-spring: cubic-bezier(0.16, 1, 0.3, 1)` is misnamed —
  it's a pure decelerate curve with no overshoot. The curve is good; reuse it as
  `--ease-entrance` and drop the word "spring" from the vocabulary entirely.

### 8.4 Reduced motion

One global rule, defined once, not per component: under
`@media (prefers-reduced-motion: reduce)`, transforms collapse to opacity-only crossfades at
`--dur-micro`, the odometer sets its value directly, and the develop-reveal (§8.5 #2) resolves
instantly. **The interface must still feel finished, not stripped.**

### 8.5 The twelve signature moments

The craft lives here. Each is small, and each should reward attention without demanding it.

1. **The dropzone breathes.** Idle: the hairline border's luminance drifts on a 6s
   `ease-glide` loop — a ~3% change, felt more than seen. Never scale, never pulse.
2. **Thumbnails develop.** A dropped image doesn't fade in — it resolves like paper in
   developer: `filter: blur(8px) saturate(0.4) contrast(0.8)` → clean over 480ms
   `--ease-entrance`. Directly earns the darkroom metaphor.
3. **The odometer.** Savings digits roll vertically, per-digit staggered with the rightmost
   fastest, `--ease-glide`. Tabular figures mean nothing reflows. **Only digits that changed
   move** — that restraint is the whole trick.
4. **Weight.** As a file's output size lands, its tile settles **2px upward** over 400ms. It's
   subliminal. It's also the entire product thesis expressed as motion.
5. **The compare seam.** Drag has **magnetic deceleration** near 50% — velocity damping over
   the final 8% of approach, never a snap-back. The handle's hit-area grows on hover; its
   visual size does not. A 1px warm seam marks the boundary.
6. **The quality slider.** Hairline track, small pressed disc. On drag, the live value rises
   4px and fades in above the thumb; on release it settles back. Preview crossfades 90ms
   *after* the debounce fires so the result feels anticipated rather than late.
7. **Batch completion.** Each row's figure resolves in sequence (`--stagger`), then the
   aggregate counts up once at `--dur-ceremony`, and a single hairline rule draws
   left-to-right beneath it over 240ms. **No confetti. No bouncing checkmark.** The restraint
   is the reward.
8. **Language switch.** Text doesn't swap — old text fades out over 120ms drifting 1px up, new
   text fades in over 200ms settling 1px down. A page turning, not a re-render.
9. **The format control.** The selection indicator is an ink block that *travels*
   (`--dur-standard`, `--ease-standard`); labels crossfade ink→paper as it passes over them.
   No scaling, no shadow.
10. **The download reward.** On click, the button label becomes the bytes saved for 900ms,
    then returns. Earned, specific, and gone before it wears out.
11. **Connection state.** The offline dot fades in over 200ms in the status bar. Never a
    toast, never a banner. Offline is normal here — the UI should treat it as such.
12. **Empty → working.** The dropzone doesn't vanish; it *recedes* (`scale(.98)`, opacity 0,
    200ms `--ease-exit`) as the workspace enters from behind it, staggered. One continuous
    move, not two separate animations.

**Haptics:** `navigator.vibrate(8)` on drop and on batch completion, Android only, feature-
detected. iOS PWAs have no haptics API — don't simulate it, don't apologize for it.

---

## 9. Anti-generic reject-list

"Never feel AI generated" is unactionable as a goal, so it's written as things to reject. If
any appear in a review, they come out:

- ❌ `#494fdf` or any indigo/violet — including the old manifest theme color
- ❌ Purple→blue gradients; gradient text; glassmorphism blur panels
- ❌ Inter, or system-ui as the display face
- ❌ Uniform `border-radius` across every element
- ❌ `box-shadow: 0 4px 12px rgba(0,0,0,0.1)` and its family
- ❌ Evenly-spaced symmetric 3-card feature grids
- ❌ Emoji used as icons
- ❌ Default Tailwind/shadcn palettes and component shapes
- ❌ Green success chips / red error chips as the primary status language
- ❌ Centered hero + subtitle + two-button stack
- ❌ Spring animations with overshoot (§8.3)
- ❌ Any of `globals.css`'s 1,905 lines or the `pro-*` class language — **this is a new system,
  not a re-skin**

**The test:** every visual decision should have a one-sentence reason rooted in §7.1. If the
answer is "it looked fine," it's a default, and defaults are what read as generated.

---

## 10. Screens & states

One screen, three states, two layouts. No navigation.

### 10.1 Empty — "the press"

Desktop: a single sheet of paper-raised on paper-sunk, optically centered slightly above
true center. Display serif headline; one line of body; the file input as the whole sheet.
Hairline rule beneath, then the format/quality presets already visible (so the user sees the
tool has depth before committing a file). Language switcher and install affordance sit in the
top-right at metadata scale — present, not shouting.

### 10.2 Working — "the bench"

- **Desktop:** `312px` inspector rail (left) · workspace (center) · hairline status bar
  (bottom: engine · files done · throughput · **`0 B sent`** · offline dot). Workspace shows
  the compare view for the selected job; a queue filmstrip runs along the bottom of the
  workspace, per-file status painted **onto the thumbnails**, not into a table.
- **Mobile:** photo-grid-first. Selected thumbnails as a grid; a preset chip row
  (Email · Message · Web · Max); one primary action; the inspector as a bottom sheet with a
  drag handle and three detents (peek / half / full). Thumb-reachable.
- Global params in the rail; per-file override via an "apply to all / this file only" toggle.

### 10.3 Done

The aggregate savings figure at display scale (72) — the one moment the type system goes
loud. Below it: total in → total out, file count, elapsed. Actions: **Save all** (zip, or
individual on mobile), **Share** (`navigator.share`), **New batch**. The queue stays visible
and scrollable underneath; nothing is thrown away without the user asking.

### 10.4 Mobbin references (reviewed — with the takeaway, not just the link)

**Aesthetic direction:**
- [In Common With](https://mobbin.com/sites/sections/ccb238a7-2d59-4b67-8225-5db269bcbd0b) —
  *the closest reference for the whole system.* Dark warm ground, editorial serif body copy
  set at a generous measure, tiny caption-scale metadata, enormous negative space. Note how
  structure comes from type and spacing alone, with almost no boxes.
- [Kinfolk](https://mobbin.com/sites/sections/79b05c64-d4a6-41f6-bab7-b1b2d78b190e) — extreme
  restraint: letterspaced small caps, one centered object, everything else silent. The model
  for the empty state.
- [Savor](https://mobbin.com/sites/sections/07791cdc-c5e6-4a6d-b45d-66c89508afb6) — warm cream
  ground, serif display with small-caps eyebrows, hairline-ruled accordion rows. The rail's
  parameter groups should read like these rows.
- [Daylight](https://mobbin.com/sites/sections/3ffb34f4-4713-4a4d-a05e-d18961771f0b) — warm
  peach ground with *real light and shadow* rather than flat fills. Evidence that warmth beats
  saturation.
- [Kalstore](https://mobbin.com/sites/sections/0ac05517-9aa4-4f82-8e96-f2cce86a6f12) — an
  in-page language `<select>` treated as ordinary product metadata. Exactly the register the
  switcher should occupy: available, unremarkable.

**Numerals as the hero:**
- [(Not Boring) Timer](https://mobbin.com/screens/f5bad9eb-dcd6-401c-9da8-f894057b7639) and
  [(Not Boring) Calculator](https://mobbin.com/screens/f40e8872-c3e6-4cb1-b7e3-2c58357a9f98) —
  numerals as *physical objects* with real cast shadows on a textured ground. Don't copy the
  skeuomorphism; copy the conviction that the number is the interface.
- [Cash App](https://mobbin.com/screens/11f99f1c-8436-4da2-b9f3-e421662c6f05) — one huge
  figure, everything else at metadata scale. The Done-state hierarchy.

**Tactility:**
- [(Not Boring) Camera](https://mobbin.com/screens/1c45bdad-c58a-430b-ac9a-bf59021fcfb1) —
  milled, knurled, pressed surfaces. Our version is quieter: deboss and grain, not bezels.
- [Behance — paper picker](https://mobbin.com/screens/fbfccf81-b421-4515-8d11-3bce29c05327) —
  a full-bleed paper texture doing all the work with a single floating control. The grain
  reference.
- [Craft](https://mobbin.com/screens/30f97d2c-670f-4290-a1ee-c714b4b58772) — legal-pad /
  cardstock / blueprint surfaces treated as a first-class choice. Proof that texture reads as
  intent, not decoration.

**Language switcher:**
- [Notion](https://mobbin.com/screens/efd159f7-2317-46c1-bca2-bfc495769903) and
  [Manus](https://mobbin.com/screens/a1212ac5-7afb-493d-9855-28d7ffe9d3d1) — **native name
  primary, English name beneath in a lighter weight, checkmark on the active row.** Adopt this
  exactly; it's the pattern users already read fluently.
- [Clubhouse](https://mobbin.com/screens/1ff409be-a9dc-45c8-862c-e6eb40a3e9bb) — the same on a
  cream ground with a serif-ish register. Closest to our surface.
- [Vivid](https://mobbin.com/screens/8d44e1ab-19ff-439e-aad3-c7ebed982e06) uses flag circles —
  **don't.** Flags mean countries, not languages, and they break for es/pt-BR/zh.

**Batch & queue** — carried from `PRODUCT_CONTEXT.md` §9:
[Air](https://mobbin.com/screens/8bd82e1c-8a69-4487-8c06-b73a8d26eb6e) (apply-to-all toggle),
[Savee](https://mobbin.com/screens/4d67f791-bef4-48c9-ab56-944975517ebb) (status painted onto
thumbnails), [Proton Drive](https://mobbin.com/screens/12f6528d-e78a-4540-9087-784c0baa9172)
(dockable transfer panel),
[Leonardo Upscaler](https://mobbin.com/screens/705397a7-62de-43c5-a9f2-f56d6b7c511f)
(settings + wipe + filmstrip — the closest structural analogue to our workspace).

---

## 11. Milestones

| # | Deliverable | Done when |
|---|---|---|
| **M0a** | **Rotated fixture** committed (§1.3) — no existing asset can fail the EXIF test | `_assets/jpg/exif-orient-6.jpg` exists; the HEIC-decoder orientation question is answered empirically |
| **M0b** | **compresso 0.4.0** — worker platform seam, both EXIF paths verified, bundle measured, published to npm | `import` works inside a worker; the orientation-6 JPEG **and** portrait HEIC both come out upright; main entry ≤ ~2.3 KB gzip **or** the subpath export exists |
| **M1** | Repo scaffold + design foundation: tokens, fonts, grain, motion primitives. **No features.** | A static page renders the type scale, palette, grain, and all four easings — and already looks like the brand. **Display-face axes and subset weight confirmed (§7.3) before anything is built on them.** |
| **M2** | Single-file core loop on the worker: drop → compress → compare → save | Feels instant; main thread never blocks; §8.5 moments 1, 2, 5, 6 in place |
| **M3** | Queue + pool + per-file overrides + save-all | 200 files stay at 60fps; cancel works; §8.5 moments 3, 4, 7 in place |
| **M4** | i18n: 7 locales, detection, switcher, `Intl` number formatting, CJK stack | Every screen reviewed in `de` and `zh-Hans`; no layout breaks; §8.5 moment 8 |
| **M5** | PWA: manifest, icons, SW precache, install prompt, offline state | **Airplane mode → full compress succeeds** |
| **M6** | Craft pass: all twelve moments audited; reject-list swept; reduced-motion; a11y (keyboard, focus rings, contrast, `aria-live` on the savings figure) | A designer's eye finds nothing generic |
| **M7** | Deploy | Live on Vercel; Lighthouse PWA + a11y ≥ 95 |

M0 blocks everything (and M0a blocks M0b). M1 before M2 is deliberate — building the design foundation *before* the
features is what stops the app from becoming functional-then-skinned, which is what always
reads as generated.

---

## 12. Steps that need your confirmation before anyone runs them

These are outward-facing and irreversible-ish, so they're listed, not executed:

1. **Repo name & visibility** — `compresso-app`? `compresso-pwa`? Public from day one?
2. **`gh repo create` + first push** — toolchain is ready (`gh` 2.92.0, authed as `iziuqo`).
3. **Fresh Vercel project + domain** — CLI ready (v54.3.0). Which subdomain? The existing site
   is `compresso.izaias.xyz`; `app.compresso.izaias.xyz` and `press.izaias.xyz` are both
   plausible. This also affects whether the two properties share SEO equity.
4. **`npm publish compresso.js@0.4.0`** — a real published version bump, from M0.

---

## 13. Open questions for validation

1. **Name & brand.** Does the PWA stay "Compresso" (shares SEO and story with the library) or
   get its own identity? "The Press" is a concept here, not necessarily a product name.
2. **Does the marketing site change?** `compresso.izaias.xyz` currently embeds the tool as its
   demo. Once a better standalone app exists, does the site link out, keep the embed, or
   become a landing page for the app?
3. **`zh-Hant`.** v1 maps Traditional to Simplified. Acceptable, or is Hant a v1 locale?
4. **Zip in v1?** `fflate` is ~8 KB and makes "save 200 files" bearable. Or does v1 ship
   individual saves + `navigator.share` only?
5. **Any analytics at all?** The strongest privacy claim is *zero network requests after
   install*. Even Vercel Analytics compromises it. Recommend: none, and say so loudly — it's a
   feature.
6. **Dark mode** — auto-only via `prefers-color-scheme`, or a manual toggle too? (Manual adds a
   control to a deliberately quiet chrome.)
7. **Where does 0.4.0's worker code live** — inside `packages/compresso` (main or subpath), or
   does the PWA hand-roll its worker and use compresso only for the pipeline? §1.4 assumes the
   former; it's the better outcome for both artifacts but it's a real call.

---

## 14. What actually shipped (2026-07-31)

**Live:** https://compresso-app.vercel.app · **Repo:** https://github.com/iziuqo/compresso-app

Built against this plan. Deltas worth knowing:

- **M0 is done but not published.** `packages/compresso` has the worker backend
  (`platform.js` branches on `typeof document === 'undefined'`; `compress.js` awaits a
  new `ensureCapabilities()` because `OffscreenCanvas` has no `toDataURL` and the probe
  must be async there). **2.27 → 2.50 KB gzip (+231 B).** Kept in the main entry rather
  than behind a subpath export: parallel compression is core to what the library is
  for, and a second entry point makes it second-class for every consumer. Those changes
  are **uncommitted**, and `compresso.js@0.4.0` is **unpublished** — both deliberately
  left for review.
- **The app vendors the engine** at `src/engine/core/` until 0.4.0 is on npm, with
  upstream sha256 checksums recorded as a drift guard.
- **EXIF verified**: `_assets/jpg/exif-orient-6.jpg` (stored 1280×768, Orientation 6)
  comes back from the worker as **768×1280** — upright. Note `_assets/` is gitignored,
  so that fixture is local-only.
- **HEIC costs 3 MB** in the precache (`heic-to` with libheif inlined). Kept, because
  HEIC is what an iPhone produces and a decoder that needs the network fails exactly
  when the app promised it wouldn't. It's a lazy chunk, so it lands after first paint.
- **Offline verified the hard way**: server stopped, page reloaded from cache alone,
  full compression run completed (5.3 MB → 307 KB).
- **Mobile is one continuous scroll column**, not the nested detent sheet in §10.2 —
  nested scroll areas on a phone fight the picture for the same gesture.
- **§8.5 moments shipped:** 1 (breathing hairline), 2 (develop reveal), 3 (odometer),
  4 (2px settle), 5 (magnetic seam), 6 (slider bubble), 7 (drawn rule), 8 (language
  drift), 9 (ink-block wipe), 10 (saved flash), 11 (offline dot), 12 (recede).

### Bugs the build found that the plan didn't anticipate

1. The worker pool was created once and destroyed on unmount while its ref survived —
   a remount reused a pool whose workers were all terminated, and nothing finished.
2. The compare view collapsed to zero height on a phone once sized in percentages of a
   grid row that could itself collapse.
3. The segmented control measured through `offsetLeft`, whose `offsetParent` is the
   positioned label layer rather than the segment — the ink-block clip was 3px out.
4. A PNG that grows 28× reported "+2,719%". Past 150% it now reads "×28".
5. The update notice rendered as a fourth child of a three-row grid and took the `1fr`.

### Still open

`zh-Hant`; per-file parameter overrides (global only today); the Maximum/WASM engine
(§3); drag-out to Finder; presets; keyboard shortcuts; the benchmark in §6.2.

---

## 15. v2 — the design in §7 was replaced, and the app moved to a path

**Live at https://izaias.xyz/compresso** (canonical, no trailing slash).

### 15.1 "The Press" was rejected

The warm-paper / Fraunces-serif / vermilion direction in §7 read as *serious and
editorial* rather than modern. It is also, verbatim, the first of the three looks the
`frontend-design` skill names as AI defaults: *"a warm cream background (near #F4F1EA)
with a high-contrast serif display and a terracotta accent."* The second default —
*"near-black with a single bright acid-green or vermilion accent"* — was avoided too.

**What replaced it,** derived from VSCO with Vercel/Figma/Spotify as secondary
references:

- **True `#000`**, a real inversion to `#FFF` in light mode, and **no accent anywhere
  in the chrome**. The photograph is the only colour on screen. The alert red fires on
  exactly one condition (PNG output grew) and nowhere else.
- **Geist 300/400/500 + Geist Mono**, self-hosted. Fraunces and Instrument Sans are
  gone — ~90 KB lighter, and the interface stops announcing itself.
- **No inspector rail.** A rail turns the photograph into a thumbnail beside a form.
  One column: picture, figure, controls, filmstrip, dock.
- **The signature control is the slider** — a hairline running the full width, a knob
  big enough to look reachable, the value floating directly above it, and a tick at the
  default you can feel your way back to without it snapping.
- Size limits **fold away**: one tool on screen at a time.
- 10px uppercase labels tracked `0.16em`; the only filled shape is the white action
  pill; selection is a rule that slides, never a border box.
- **Mark:** a disc pressed flat between two plates. Rendered and compared at 16px and
  32px before choosing — a plain ellipse is legible but generic, a ring loses its hole
  at favicon size, and the plate rules survive, which is what makes it read as
  *compressed*. The header glyph is the same shape, and the disc arrives round and
  settles flat while the plates hold still.

The motion system from §8 carried over unchanged: four easings, every control point at
y ≤ 1, no springs.

### 15.2 Mounting at a path

`izaias.xyz` is the **`izaias-landing`** project (`Active/izaias-personal-website`,
config in `landing/vercel.json`). A `/compresso` rewrite already existed — pointing at
the *old marketing site* — and was repointed. Notes for whoever touches this next:

- The app builds with **`base: '/compresso/'` and `outDir: 'dist/compresso'`**
  (`outputDirectory: dist`), so the deployment serves exactly the paths it declares and
  there is no rewrite layer to keep in sync.
- **Fonts moved from `public/` to `src/assets/fonts/`** — a public path written
  `/fonts/…` resolves to the domain root, which is no longer where the app lives.
- **Scope has no trailing slash.** Scope matching is a plain string prefix, so
  `/compresso/` would not cover `/compresso` — the address people are given. That
  required tightening `Service-Worker-Allowed` from `/` to `/compresso`; the header
  survives Vercel's proxy, and `/` would have let a worker under `/compresso` claim the
  whole personal site.
- **A `NavigationRoute` bound to `index.html` is required.** The precache is keyed by
  `/compresso/index.html`, and Workbox only appends a directory index to URLs already
  ending in a slash — so without it, `/compresso` had every asset cached and no shell.
- That repo's git auto-deploy did **not** fire; it needed a manual `vercel --prod`.

### 15.3 Still open

`compresso.izaias.xyz` continues to serve the old marketing site, whose embedded demo is
the tool this app replaces — two live surfaces, same brand, different designs. Worth a
decision: point the site's CTA at `izaias.xyz/compresso`, or fold the site into the app.
