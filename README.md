<p align="center">
  <img src="website/public/logo.svg" alt="Compresso" width="120" />
</p>

<h1 align="center">Compresso</h1>

<p align="center">
  <strong>Compress, resize, and convert images in the browser.</strong><br />
  A 3.6 KB, zero-dependency image compressor with HEIC input, parallel Web Worker batching, and a never-bigger-output guarantee — no server needed.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/compresso.js"><img src="https://img.shields.io/npm/v/compresso.js?color=00a87e&label=npm" alt="npm version" /></a>
  <a href="https://bundlephobia.com/package/compresso.js"><img src="https://img.shields.io/bundlephobia/minzip/compresso.js?color=0284c7&label=min%2Bgzip" alt="min+gzip size" /></a>
  <a href="https://www.npmjs.com/package/compresso.js"><img src="https://img.shields.io/npm/dm/compresso.js?color=64748b&label=downloads" alt="npm downloads" /></a>
  <a href="https://www.npmjs.com/package/compresso.js"><img src="https://img.shields.io/npm/types/compresso.js" alt="TypeScript types" /></a>
  <a href="https://github.com/iziuqo/compresso/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-3ba55d" alt="MIT license" /></a>
  <a href="https://github.com/iziuqo/compresso/stargazers"><img src="https://img.shields.io/github/stars/iziuqo/compresso?style=social" alt="GitHub stars" /></a>
</p>

<p align="center">
  <a href="https://izaias.xyz/compresso"><strong>▶ Try the live demo</strong></a> ·
  <a href="https://compresso.izaias.xyz/docs">Documentation</a> ·
  <a href="https://compresso.izaias.xyz/en/compare/">Compare</a> ·
  <a href="https://compresso.izaias.xyz/en/faq/">FAQ</a> ·
  <a href="#batch--parallel-compression">Batch & Workers</a>
</p>

---

## Why Compresso

- **Smallest in its class — 3.6 KB gzipped, zero required dependencies.** Roughly **4–5× smaller than browser-image-compression and pica**, and still leaner than compressorjs ([see comparison](#comparison)). The core is pure Canvas API — no WASM, no codecs bundled.
- **iPhone HEIC/HEIF input, everywhere.** Safari/iOS decode natively; other browsers lazy-load a WASM decoder *only* the first time a HEIC file appears, so the tiny core stays codec-free for every other format. No other browser compressor handles HEIC.
- **Never returns a bigger file.** Lossy output is guaranteed to be no larger than the original — if a format can't beat an already-efficient source, Compresso adapts (quality/resolution) instead of inflating it. No rival makes this guarantee.
- **Real parallel batch compression, off the main thread.** `compresso.js/pool` runs a resilient Web Worker pool — crash and timeout recovery included — for compressing many files at once without blocking the UI. Falls back to the exact same API on the main thread where Workers aren't available, so you never branch on environment yourself ([see Batch & Workers](#batch--parallel-compression)).
- **Modern by default** — `format: 'auto'` picks AVIF → WebP → JPEG per browser, promise-based API, first-class TypeScript types, and it's actively maintained.
- **100% client-side** — no server round-trips, no API keys, no upload of user images anywhere. Private by construction.

## Install

```bash
npm install compresso.js
```

Or from a CDN:

```html
<script src="https://unpkg.com/compresso.js/dist/compresso.umd.js"></script>
```

## Quick Start

```js
import { compress } from 'compresso.js';

const input = document.querySelector('input[type="file"]');

input.addEventListener('change', async (e) => {
  const file = e.target.files[0];

  const result = await compress(file, {
    quality: 0.8,
    maxWidth: 1920,
    format: 'auto', // AVIF / WebP / JPEG — best the browser supports
  });

  console.log(`${result.savings}% smaller`);
  // → "87.3% smaller"

  // Use result.file for upload, result.url for preview
});
```

## Comparison

How Compresso compares to the popular browser-side image libraries:

| | **compresso.js** | compressorjs | browser-image-compression | pica |
|---|:---:|:---:|:---:|:---:|
| Bundle, min+gzip <sup>1</sup> | **3.8 KB** | 4.6 KB | 19.6 KB | 15.7 KB |
| Required dependencies | **0** | 2 | 1 | 2 |
| HEIC / HEIF input | **✅** | ❌ | ❌ | ❌ |
| AVIF output | **✅** | ❌ | ❌ | ❌ |
| Auto best-format | **✅** | ❌ | ❌ | ❌ |
| Never larger than input | **✅** | ❌ | ❌ | ❌ |
| Target max file size | ✅ | ❌ | ✅ | ❌ |
| Non-blocking (Web Worker) | **✅** (`compresso.js/pool`) | ❌ | ✅ | ✅ |
| API style | Promise | Callbacks | Promise | Promise |
| TypeScript types | ✅ | ✅ | ✅ | ✅ |
| Latest release <sup>2</sup> | 2026-08 | 2026-04 | 2023-03 | 2026-06 |
| License | MIT | MIT | MIT | MIT |

<sup>1</sup> Bundlephobia min+gzip, each package's latest version. <sup>2</sup> npm latest-publish date. Figures verified 2026-08-04 — reproduce with `https://bundlephobia.com/api/size?package=<name>`.

**When *not* to use Compresso:** for server-side/batch processing use [sharp](https://github.com/lovell/sharp); for pixel-level image editing use [Jimp](https://github.com/jimp-dev/jimp); if you only need the highest-quality downscale, [pica](https://github.com/nodeca/pica) specializes in that. Compresso is for *optimizing user-selected images in the browser before upload.*

## Target a Maximum File Size

Perfect for systems with strict upload limits:

```js
const result = await compress(file, {
  maxSizeMB: 2,       // never exceeds 2 MB
  format: 'jpeg',
});
```

Compresso binary-searches for the highest quality that fits within your size constraint.

## Batch & Parallel Compression

New in `1.0.0`: `compresso.js/pool` runs many compressions in parallel, off the main thread, via a resilient Web Worker pool — no UI jank on a 50-photo upload.

```js
import { createPool } from 'compresso.js/pool';

const pool = createPool();

const results = await pool.compressMany(fileList, { format: 'auto' }, (e) => {
  console.log(`${e.fileIndex + 1}/${e.totalFiles} — ${Math.round(e.overallProgress * 100)}%`);
});

for (const r of results) {
  if (r.status === 'fulfilled') uploads.push(r.value.file);
}

pool.destroy();
```

- **Same shape everywhere.** `createPool()` never throws for lack of Worker support (or a CSP that blocks worker construction) — it silently falls back to the exact same API on the main thread. You call it unconditionally; it decides how much parallelism the environment can actually offer.
- **Self-healing.** A worker that crashes (OOM, driver fault) or goes silent past a per-job timeout — e.g. iOS backgrounding a tab — is detected and replaced automatically. `pool.stats().recoveries` tells you if it happened.
- **Never a whole-batch failure.** `compressMany()` results are `Promise.allSettled`-shaped — one file failing doesn't sink the other 49.

Full API (`createPool` options, `pool.stats()`, CSP requirements) is in the [package README](packages/compresso/README.md#batch--workers).

## API

### `compress(source, options?)`

Compresses a single image.

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `File \| Blob \| string` | Image file, blob, or URL (HEIC/HEIF accepted) |
| `options` | `CompressOptions` | See below |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `quality` | `number` | `0.8` | Output quality, 0–1 |
| `maxWidth` | `number` | unbounded <sup>†</sup> | Maximum output width in px |
| `maxHeight` | `number` | unbounded <sup>†</sup> | Maximum output height in px |
| `format` | `string` | `'auto'` | `'jpeg'`, `'png'`, `'webp'`, `'avif'`, or `'auto'` |
| `maxSizeMB` | `number` | source size <sup>‡</sup> | Maximum output file size in MB |
| `backgroundColor` | `string` | `'#ffffff'` | Background for transparent → JPEG |
| `onProgress` | `function` | — | Progress callback `({ progress, stage })` |
| `signal` | `AbortSignal` | — | Cancel compression |

<sup>†</sup> Original resolution is kept, except when neither dimension is set **and** the browser can't encode WebP/AVIF (auto falls back to JPEG, e.g. Safari) — then output is capped to a 2048px long edge to avoid a bloated re-encode. Pass `Infinity` to never cap. <sup>‡</sup> Lossy output is never larger than the source, regardless of this value.

#### Result

| Property | Type | Description |
|----------|------|-------------|
| `file` | `File` | Optimized File object |
| `blob` | `Blob` | Optimized Blob |
| `url` | `string` | Object URL for preview |
| `width` / `height` | `number` | Output dimensions |
| `originalSize` / `compressedSize` | `number` | Bytes before / after |
| `savings` | `number` | Reduction percentage |
| `format` | `string` | Output format |

### `compressMultiple(files, options?)`

Compress an array of files sequentially. Same options as `compress`, with an extended progress callback that includes `fileIndex`, `totalFiles`, and `overallProgress`.

### `createCompressor(defaults?)`

Create a reusable instance with preset options:

```js
const optimizer = createCompressor({ quality: 0.7, maxWidth: 1200, format: 'webp' });
const result = await optimizer.compress(file);
```

### Utilities

```js
import { isFormatSupported, getBestFormat, formatBytes } from 'compresso.js';

isFormatSupported('avif');  // true or false
getBestFormat();            // 'avif', 'webp', or 'jpeg'
formatBytes(1536000);       // '1.5 MB'
```

## Framework Examples

<details>
<summary><strong>React</strong></summary>

```jsx
import { useState } from 'react';
import { compress, formatBytes } from 'compresso.js';

function ImageUpload() {
  const [result, setResult] = useState(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setResult(await compress(file, { quality: 0.8, maxWidth: 1920, format: 'auto' }));
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFile} />
      {result && (
        <div>
          <img src={result.url} alt="Optimized" />
          <p>{formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)} ({result.savings}% smaller)</p>
        </div>
      )}
    </div>
  );
}
```

</details>

<details>
<summary><strong>Vue</strong></summary>

```vue
<script setup>
import { ref } from 'vue';
import { compress, formatBytes } from 'compresso.js';

const result = ref(null);

async function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  result.value = await compress(file, { quality: 0.8, maxWidth: 1920, format: 'auto' });
}
</script>

<template>
  <input type="file" accept="image/*" @change="handleFile" />
  <div v-if="result">
    <img :src="result.url" alt="Optimized" />
    <p>{{ formatBytes(result.originalSize) }} → {{ formatBytes(result.compressedSize) }} ({{ result.savings }}% smaller)</p>
  </div>
</template>
```

</details>

<details>
<summary><strong>Svelte</strong></summary>

```svelte
<script>
  import { compress, formatBytes } from 'compresso.js';

  let result = null;

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    result = await compress(file, { quality: 0.8, maxWidth: 1920, format: 'auto' });
  }
</script>

<input type="file" accept="image/*" on:change={handleFile} />
{#if result}
  <img src={result.url} alt="Optimized" />
  <p>{formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)} ({result.savings}% smaller)</p>
{/if}
```

</details>

<details>
<summary><strong>Angular</strong></summary>

```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { compress, formatBytes } from 'compresso.js';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <input type="file" accept="image/*" (change)="handleFile($event)" />
    <div *ngIf="result">
      <img [src]="result.url" alt="Optimized" />
      <p>{{ formatBytes(result.originalSize) }} → {{ formatBytes(result.compressedSize) }} ({{ result.savings }}% smaller)</p>
    </div>
  `,
})
export class ImageUploadComponent {
  result: any = null;
  formatBytes = formatBytes;

  async handleFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.result = await compress(file, { quality: 0.8, maxWidth: 1920, format: 'auto' });
  }
}
```

</details>

<details>
<summary><strong>Next.js (App Router) — upload recipe</strong></summary>

Compress client-side in a `'use client'` component, then upload the already-optimized file to a route handler:

```jsx
'use client';
import { useState } from 'react';
import { compress } from 'compresso.js';

export default function UploadForm() {
  const [status, setStatus] = useState('idle');

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const result = await compress(file, { quality: 0.8, maxWidth: 1920, format: 'webp' });

    setStatus('uploading');
    const body = new FormData();
    body.append('file', result.file);
    await fetch('/api/upload', { method: 'POST', body });
    setStatus('done');
  }

  return <input type="file" accept="image/*" onChange={handleFile} />;
}
```

```js
// app/api/upload/route.js
export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file'); // already compressed — store as-is
  return Response.json({ ok: true, name: file.name });
}
```

Full working versions: [`examples/nextjs/UploadForm.jsx`](examples/nextjs/UploadForm.jsx) and [`examples/nextjs/route.js`](examples/nextjs/route.js).

</details>

<details>
<summary><strong>Vanilla JS (CDN)</strong></summary>

```html
<input type="file" accept="image/*" id="upload" />
<div id="output"></div>

<script src="https://unpkg.com/compresso.js/dist/compresso.umd.js"></script>
<script>
  document.getElementById('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const result = await Compresso.compress(file, { quality: 0.8, format: 'auto', maxSizeMB: 2 });
    document.getElementById('output').innerHTML =
      `<img src="${result.url}" style="max-width:400px" />
       <p>${Compresso.formatBytes(result.originalSize)} → ${Compresso.formatBytes(result.compressedSize)} (${result.savings}% smaller)</p>`;
  });
</script>
```

</details>

## Browser Support

| Browser | JPEG/PNG | WebP | AVIF |
|---------|----------|------|------|
| Chrome 32+ | ✅ | ✅ | ✅ (85+) |
| Firefox 29+ | ✅ | ✅ (96+) | ✅ (113+) |
| Safari 8+ | ✅ | ✅ (16+) | ✅ (16.4+) |
| Edge 79+ | ✅ | ✅ | ✅ (121+) |

With `format: 'auto'`, Compresso picks the best format each browser supports. Safari can't *encode* WebP/AVIF from a canvas, so it falls back to JPEG — and Compresso caps resolution there to keep the file small (see the never-bigger guarantee).

**HEIC/HEIF input** works everywhere: Safari 17+/iOS 17+ decode natively; other browsers lazily load a WASM decoder ([`heic-to`](https://www.npmjs.com/package/heic-to)) the first time they meet a HEIC image — a one-time download that leaves the core untouched for every other format. Output is always a web format (HEIC is input-only; use AVIF for HEIC-class output compression).

## Content-Security-Policy (CSP)

Compresso itself needs nothing beyond `script-src 'self'`. The one exception is **HEIC/HEIF input on non-Safari browsers**, which lazily loads the `heic-to` WASM decoder — a strict CSP needs a couple of extra directives for that path specifically:

- **`script-src`: add `'wasm-unsafe-eval'`** (fall back to `'unsafe-eval'` for older browsers that don't yet support the narrower directive). WebAssembly compilation is blocked without one of these, and the failure otherwise surfaces as an opaque WASM error rather than an obvious CSP violation.
- **`worker-src 'self'`** (plus `child-src 'self'` as a fallback for browsers that predate `worker-src`) if you use `compresso.js/pool` for batch compression — it runs a same-origin module Worker (`new Worker(new URL('./worker.js', import.meta.url))`), no third-party origin involved.
- **`img-src` needs `blob:`** if you render `result.url` directly in an `<img>` — it's an object URL, not an http(s) URL.
- Using the CDN build (`<script src="https://unpkg.com/compresso.js/...">`) instead of installing from npm? Add `unpkg.com` to `script-src` too, or self-host the file to avoid a third-party origin in your policy.

Everything else — the core compressor, `compress()`, `compressMultiple()` — is plain same-origin JS with no `eval`, no inline scripts, and no network requests, so it needs no CSP allowances beyond your app's own bundle.

Example policy covering both the pool and HEIC input:

```
Content-Security-Policy: script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; img-src 'self' blob:;
```

## FAQ

### How do I compress an image in the browser before uploading?
Read the file from an `<input type="file">`, pass it to `compress(file, { quality, maxWidth })`, and upload `result.file`. See [Quick Start](#quick-start). Everything runs client-side — the image never leaves the browser until *you* upload it.

### How do I convert a HEIC image to JPEG or WebP in JavaScript?
Pass the `.heic`/`.heif` file straight to `compress(file, { format: 'auto' })`. Compresso decodes HEIC (natively on Safari, via a lazy WASM decoder elsewhere) and outputs a standard web format. See [Browser Support](#browser-support).

### Why did my compressed image get *bigger* than the original?
With most tools, re-encoding an already-efficient source (like an iPhone HEIC) to JPEG can *inflate* it. Compresso guarantees this never happens: lossy output is capped at the source size, and on browsers that can't produce WebP/AVIF it reduces resolution instead of ballooning the file. ([The engineering story →](https://compresso.izaias.xyz/docs))

### Does it need a server or backend?
No. Compresso is 100% client-side (Canvas API). No servers, no API keys, no image ever uploaded to a third party.

### Does it work with React, Vue, and Next.js?
Yes — it's framework-agnostic. See [Framework Examples](#framework-examples).

### How do I compress many images in parallel without blocking the UI?
Import `createPool` from `compresso.js/pool` instead of using `compress()` directly — it runs a Web Worker pool with the same API, falling back to the main thread automatically where Workers aren't available. See [Batch & Parallel Compression](#batch--parallel-compression).

### My site has a strict CSP — why does HEIC input fail?
It's almost always a missing `'wasm-unsafe-eval'` in `script-src` (the HEIC decoder is WASM-based), or a missing `worker-src 'self'` if you're using `compresso.js/pool`. See [Content-Security-Policy](#content-security-policy-csp) for a full policy example.

## How It Works

Compresso's 3.6 KB core uses the browser's native Canvas API — no WASM, no heavy codecs, no server round-trips. (The one exception: HEIC/HEIF input on non-Safari browsers lazily pulls in a WASM decoder on demand.)

1. **Load** — read the image into an `<img>` element
2. **Resize** — compute target dimensions (preserving aspect ratio), with step-down resizing for quality
3. **Compress** — draw to `<canvas>`, export as the target format at the chosen quality
4. **Fit** — if a max size is set (or to honor the never-bigger guarantee), binary-search for the highest quality that fits

The result is a new `File` ready for upload, plus metadata about the optimization.

## Why This Exists

Every day, millions of people fail simple file uploads — government portals, banking apps, and healthcare systems reject documents over size limits, unsupported formats, or obscure requirements. Users are forced to figure out compression, conversion, and resizing themselves: tasks systems should handle transparently. Researchers call this **externalized processing**. Compresso eliminates it — drop it into any upload flow and images are optimized before they ever leave the browser.

For a government document system handling **100,000 submissions/month**:

| Metric | Without | With Compresso |
|--------|---------|----------------|
| Avg. file size | 4.2 MB | 0.4 MB |
| Monthly bandwidth | 420 GB | 40 GB |
| Upload failures | ~15% | ~0% |

This project is grounded in research on cognitive distance and externalized processing in document-submission systems (*Izaias Cavalcanti*). See the [research](https://github.com/iziuqo/compresso/blob/main/_articles/%5BIzaias%5D%20Cognitive%20Distance%20in%20Document%20Submission%20Systems.pdf).

## Contributing

Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and the [good first issues](https://github.com/iziuqo/compresso/issues). Bug reports, framework recipes, and benchmark additions are all appreciated.

## License

[MIT](LICENSE) © Izaias Cavalcanti

---

<p align="center">
  Made with care for the people who struggle with file uploads.<br />
  <a href="https://compresso.izaias.xyz">compresso.izaias.xyz</a>
</p>
