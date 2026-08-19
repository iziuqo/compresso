# Compresso

Tiny, zero-dependency image optimizer that runs entirely in the browser. Compress, resize, and convert images on the client side — no server needed.

[![npm version](https://img.shields.io/npm/v/compresso.js?color=00a87e&label=npm)](https://www.npmjs.com/package/compresso.js)
[![min+gzip size](https://img.shields.io/bundlephobia/minzip/compresso.js?color=0284c7&label=min%2Bgzip)](https://bundlephobia.com/package/compresso.js)
[![npm downloads](https://img.shields.io/npm/dm/compresso.js?color=64748b&label=downloads)](https://www.npmjs.com/package/compresso.js)
[![TypeScript types](https://img.shields.io/npm/types/compresso.js)](https://www.npmjs.com/package/compresso.js)
[![MIT license](https://img.shields.io/badge/license-MIT-3ba55d)](https://github.com/iziuqo/compresso/blob/main/LICENSE)

**3.6 KB gzipped core** · **Zero required dependencies** · **HEIC/HEIF input** · **Parallel Web Worker batching** · **Never returns a bigger file**

[Website](https://compresso.izaias.xyz) · [Live demo](https://compresso.izaias.xyz/compresso) · [Documentation](https://compresso.izaias.xyz/docs) · [FAQ](https://compresso.izaias.xyz/en/faq/) · [Compare](https://compresso.izaias.xyz/en/compare/) · [GitHub](https://github.com/iziuqo/compresso)

## Why Compresso

- **Smallest in its class** — 3.6 KB gzipped, zero required dependencies. 4–5× smaller than [browser-image-compression](https://www.npmjs.com/package/browser-image-compression) and [pica](https://www.npmjs.com/package/pica), still leaner than [compressorjs](https://www.npmjs.com/package/compressorjs) ([full comparison](https://github.com/iziuqo/compresso#comparison)). Pure Canvas API — no WASM, no codecs bundled into the core.
- **iPhone HEIC/HEIF input, everywhere** — Safari/iOS decode natively; other browsers lazy-load a WASM decoder only the first time a HEIC file appears. No other browser-side compressor handles HEIC input.
- **Never returns a bigger file** — lossy output is guaranteed no larger than the source. If a target format can't beat an already-efficient source, Compresso adapts quality/resolution instead of inflating it.
- **Real parallel batch compression** — `compresso.js/pool` runs a Web Worker pool with crash/timeout recovery, falling back to the identical API on the main thread where Workers aren't available. See [Batch & Workers](#batch--workers).
- **100% client-side** — no server round-trips, no API keys, no user image ever uploaded anywhere.

## Comparison

| | **compresso.js** | compressorjs | browser-image-compression | pica |
|---|:---:|:---:|:---:|:---:|
| Bundle, min+gzip | **3.8 KB** | 4.6 KB | 19.6 KB | 15.7 KB |
| Required dependencies | **0** | 2 | 1 | 2 |
| HEIC / HEIF input | **✅** | ❌ | ❌ | ❌ |
| AVIF output | **✅** | ❌ | ❌ | ❌ |
| Never larger than input | **✅** | ❌ | ❌ | ❌ |
| Non-blocking (Web Worker) | **✅** (`compresso.js/pool`) | ❌ | ✅ | ✅ |
| TypeScript types | ✅ | ✅ | ✅ | ✅ |

Figures verified 2026-08-04 via [Bundlephobia](https://bundlephobia.com). Full comparison, including when *not* to reach for Compresso, in the [project README](https://github.com/iziuqo/compresso#comparison).

## Install

```bash
npm install compresso.js
```

Or via CDN:

```html
<script src="https://unpkg.com/compresso.js/dist/compresso.umd.js"></script>
```

## Usage

```js
import { compress } from 'compresso.js';

const input = document.querySelector('input[type="file"]');

input.addEventListener('change', async (e) => {
  const result = await compress(e.target.files[0], {
    quality: 0.8,
    maxWidth: 1920,
    format: 'webp',
  });

  console.log(`${result.savings}% smaller`);
  // result.file → optimized File, ready for upload
});
```

## Target a Maximum File Size

```js
const result = await compress(file, {
  maxSizeMB: 2,
  format: 'jpeg',
});
```

## HEIC/HEIF input

iPhone HEIC/HEIF photos are accepted as input and converted to a web format. Safari
and iOS decode them natively; other browsers lazily load an optional WASM decoder
([`heic-to`](https://www.npmjs.com/package/heic-to)) on the first HEIC image, so the
tiny core stays codec-free for every other format. Output is input-only web formats —
choose AVIF for HEIC-class output compression.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `quality` | `number` | `0.8` | Output quality, 0–1 |
| `maxWidth` | `number` | unbounded¹ | Max output width in px |
| `maxHeight` | `number` | unbounded¹ | Max output height in px |
| `format` | `string` | `'auto'` | `'jpeg'` \| `'png'` \| `'webp'` \| `'avif'` \| `'auto'` |
| `maxSizeMB` | `number` | source size² | Max file size in MB |
| `maxInputPixels` | `number` | `100_000_000` | Max decodable input resolution (width × height). Guards against a crafted file declaring an enormous resolution from a tiny file. `Infinity` to disable |
| `onProgress` | `function` | — | Progress callback |
| `signal` | `AbortSignal` | — | Cancel compression |

¹ Original resolution is kept by default. The one exception: when neither `maxWidth` nor `maxHeight` is set **and** the browser can't encode WebP/AVIF (auto-format falls back to JPEG — e.g. Safari), output is capped to a **2048px long edge**, because a full-resolution JPEG re-encode could otherwise grow larger than the original. Browsers with a modern format keep the original dimensions. Set either axis to constrain it yourself, or pass `maxWidth: Infinity` to never cap.

² **Lossy output (JPEG/WebP/AVIF) is never larger than the source**, regardless of `maxSizeMB`. PNG output is exempt, since it's lossless and ignores quality.

## Batch & Workers

Compress many files in parallel, off the main thread:

```js
import { createPool } from 'compresso.js/pool';

const pool = createPool();

const results = await pool.compressMany(fileList, { quality: 0.8, format: 'webp' }, (event) => {
  console.log(`${event.fileIndex + 1}/${event.totalFiles} — ${Math.round(event.overallProgress * 100)}%`);
});

for (const result of results) {
  if (result.status === 'fulfilled') uploads.push(result.value.file);
  else console.error('One file failed:', result.reason);
}

pool.destroy(); // stop the workers once you're done with the pool, e.g. on unmount
```

`compressMany()` never rejects for an individual file's failure — the returned array is
`Promise.allSettled`-shaped, one entry per input file, in input order. Only a caller error (e.g.
passing something that isn't an array) rejects the call itself.

`createPool()` never throws for lack of `Worker`/`OffscreenCanvas` support, or when a page's CSP
blocks worker construction — it silently falls back to a correct, serial, main-thread
implementation with the **exact same shape** (`compress`, `compressMany`, `cancel`, `destroy`,
`stats`). Call `createPool()` unconditionally and let it choose; don't branch on the environment
yourself. Use `isPoolSupported()` only if you want to decide whether to *show* a batch UI at all —
the pool itself works correctly either way. Every `compress()` option, including `maxInputPixels`
(see [Options](#options)), applies identically on the pool path.

### API

| | |
|---|---|
| `createPool(options?)` | Creates a pool. See options below. |
| `isPoolSupported()` | `true` if this environment can run a real worker pool (`Worker` + `OffscreenCanvas`). |
| `defaultPoolSize()` | The worker count `createPool()` uses when `size` isn't set — CPU cores, capped at 8, further capped on detected low-memory devices. |
| `pool.compress(file, options?)` | Compress one file. Same `options` as `compress()`. |
| `pool.compressMany(files, options?, onProgress?)` | Compress many files. See above. |
| `pool.cancel(id)` | Cancel a queued or in-flight job by id. No-op for an unknown id. |
| `pool.destroy()` | Cancel every queued and in-flight job, then terminate all workers. |
| `pool.stats()` | `{ size, busy, queued, recoveries }` — a snapshot of the pool's current load. `recoveries` counts workers replaced after a crash or timeout; a nonzero value is a real, actionable signal for a bug report. |

`createPool(options)`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `size` | `number` | `defaultPoolSize()` | Number of workers to spawn. |
| `workerUrl` | `string \| URL` | built-in `worker.js` | Override the worker script's location — for bundlers that can't resolve it automatically, or a CSP-nonce'd hosting path. |
| `heicToUrl` | `string \| URL` | built-in HEIC codec chunk | Override where a worker loads the lazy HEIC codec from — the same class of escape hatch as `workerUrl`, for the same class of bundler/hosting edge case. Most hosts never need this; it exists because a worker can't always re-resolve it on its own once bundled into your app. |
| `maxQueueLength` | `number` | unbounded | Once this many jobs are waiting, further `compress()`/`compressMany()` calls reject immediately with `kind: 'queue-full'` instead of growing the queue further. |
| `timeoutMs` | `number` | `30000` | Milliseconds a single job may run before its worker is considered stuck, terminated, and replaced. Guards against a silently-suspended worker (e.g. iOS backgrounding a tab) as well as a pathologically slow decode. `Infinity` to disable. |

A worker that crashes natively (OOM, a driver fault) or goes silent past `timeoutMs` is detected
and replaced automatically — a batch never hangs forever on one bad worker. `pool.stats().recoveries`
is how you'd notice this happened.

### Content-Security-Policy

Constructing the worker needs `worker-src` (or the `script-src`/`default-src` fallback chain) to
permit the worker's own origin — it ships same-origin, alongside your app's own bundle. If HEIC
input reaches the pool, `heic-to`'s WASM decoder additionally needs `'wasm-unsafe-eval'` in
`script-src` (the narrower, WASM-specific CSP source; the broader `'unsafe-eval'` also works but
isn't required). A CSP that blocks worker construction doesn't throw — `createPool()` catches it
and falls back to the serial main-thread path automatically; a CSP-blocked HEIC decode surfaces as
a specific, actionable error instead of an opaque WASM failure.

### If you've rolled your own worker pool

`createPool()`/`compressMany()` is a generalized, hardened version of the kind of pool a
compress-heavy app ends up hand-building: a fixed worker count, a task queue, cancellation, and
(per the resilience notes above) crash/timeout recovery most hand-rolled pools don't have yet.
Migrating usually means: delete your own `pool.ts`/`worker.ts`, import `createPool`/
`isPoolSupported` from `compresso.js/pool`, and re-express any app-specific policy (e.g. "only the
latest preview request matters") as a small wrapper around `createPool({ size: 1 })` at your own
app layer, rather than baking it into the pool itself.

## FAQ

### How do I convert a HEIC image to JPEG or WebP in JavaScript?
Pass the `.heic`/`.heif` file straight to `compress(file, { format: 'auto' })`. Compresso decodes it natively on Safari, via a lazy WASM decoder elsewhere, and outputs a standard web format. See [HEIC/HEIF input](#heicheif-input).

### Why did my compressed image come out bigger than the original?
With most tools, re-encoding an already-efficient source (like an iPhone HEIC) to JPEG can inflate it. Compresso guarantees this never happens: lossy output is capped at the source size, reducing resolution instead of ballooning the file where needed.

### How do I compress many images in parallel without blocking the UI?
Use `createPool()` from `compresso.js/pool` instead of calling `compress()` directly — same options, same result shape, but backed by a Web Worker pool with crash/timeout recovery. See [Batch & Workers](#batch--workers).

### Does this need a server or backend?
No. Everything runs client-side via the Canvas API — no servers, no API keys, no image ever leaves the browser until you upload the result yourself.

## License

[MIT](https://github.com/iziuqo/compresso/blob/main/LICENSE) © Izaias Cavalcanti
