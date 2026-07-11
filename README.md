<p align="center">
  <img src="website/public/logo.svg" alt="Compresso" width="120" />
</p>

<h1 align="center">Compresso</h1>

<p align="center">
  <strong>Compress, resize, and convert images in the browser.</strong><br />
  A 2 KB, zero-dependency image compressor with HEIC input and a never-bigger-output guarantee — no server needed.
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
  <a href="https://compresso.izaias.xyz/tool"><strong>▶ Try the live demo</strong></a> ·
  <a href="https://compresso.izaias.xyz/docs">Documentation</a> ·
  <a href="#comparison">Comparison</a> ·
  <a href="#faq">FAQ</a>
</p>

---

## Why Compresso

- **Smallest in its class — 2.3 KB, zero required dependencies.** Roughly **2× smaller than compressorjs** and **~9× smaller than browser-image-compression** ([see comparison](#comparison)). The core is pure Canvas API — no WASM, no codecs bundled.
- **iPhone HEIC/HEIF input, everywhere.** Safari/iOS decode natively; other browsers lazy-load a WASM decoder *only* the first time a HEIC file appears, so the tiny core stays codec-free for every other format. No other browser compressor handles HEIC.
- **Never returns a bigger file.** Lossy output is guaranteed to be no larger than the original — if a format can't beat an already-efficient source, Compresso adapts (quality/resolution) instead of inflating it. No rival makes this guarantee.
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
| Bundle, min+gzip <sup>1</sup> | **2.3 KB** | 4.5 KB | 20.0 KB | 14.8 KB |
| Required dependencies | **0** | 2 | 1 | 2 |
| HEIC / HEIF input | **✅** | ❌ | ❌ | ❌ |
| AVIF output | **✅** | ❌ | ❌ | ❌ |
| Auto best-format | **✅** | ❌ | ❌ | ❌ |
| Never larger than input | **✅** | ❌ | ❌ | ❌ |
| Target max file size | ✅ | ❌ | ✅ | ❌ |
| Non-blocking (Web Worker) | 🔜 v1.0 | ❌ | ✅ | ✅ |
| API style | Promise | Callbacks | Promise | Promise |
| TypeScript types | ✅ | ✅ | ✅ | ✅ |
| Latest release <sup>2</sup> | 2026-07 | 2026-04 | 2023-03 | 2026-06 |
| License | MIT | MIT | MIT | MIT |

<sup>1</sup> Minified CDN bundle (unpkg), gzipped. Reproduce: `curl -sL <unpkg dist URL> | gzip -9 | wc -c`. <sup>2</sup> npm latest-publish date. Figures verified 2026-07.

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

## How It Works

Compresso's ~2 KB core uses the browser's native Canvas API — no WASM, no heavy codecs, no server round-trips. (The one exception: HEIC/HEIF input on non-Safari browsers lazily pulls in a WASM decoder on demand.)

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

This project is grounded in research on cognitive distance and externalized processing in document-submission systems (*Izaias Cavalcanti*). See the [research](https://compresso.izaias.xyz).

## Contributing

Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and the [good first issues](https://github.com/iziuqo/compresso/issues). Bug reports, framework recipes, and benchmark additions are all appreciated.

## License

[MIT](LICENSE) © Izaias Cavalcanti

---

<p align="center">
  Made with care for the people who struggle with file uploads.<br />
  <a href="https://compresso.izaias.xyz">compresso.izaias.xyz</a>
</p>
