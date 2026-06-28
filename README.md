<p align="center">
  <img src="website/public/logo.svg" alt="Compresso" width="120" />
</p>

<h1 align="center">Compresso</h1>

<p align="center">
  <strong>Tiny, zero-dependency image optimizer that runs entirely in the browser.</strong><br />
  Compress, resize, and convert images on the client side — no server needed.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/compresso"><img src="https://img.shields.io/npm/v/compresso?color=%23059669&label=npm" alt="npm version" /></a>
  <a href="https://bundlephobia.com/package/compresso"><img src="https://img.shields.io/bundlephobia/minzip/compresso?color=%230284c7&label=size" alt="bundle size" /></a>
  <a href="https://github.com/iziuqo/compresso/blob/main/LICENSE"><img src="https://img.shields.io/github/license/iziuqo/compresso?color=%236d28d9" alt="license" /></a>
  <a href="https://github.com/iziuqo/compresso/stargazers"><img src="https://img.shields.io/github/stars/iziuqo/compresso?style=social" alt="GitHub stars" /></a>
</p>

<p align="center">
  <a href="https://compresso.dev">Website</a> ·
  <a href="https://compresso.dev/docs">Documentation</a> ·
  <a href="https://compresso.dev/#playground">Try it live</a>
</p>

---

## The Problem

Every day, millions of people fail simple file uploads. Government portals, banking apps, and healthcare systems reject documents because of file size limits, unsupported formats, or obscure requirements. Users are forced to figure out compression, format conversion, and resizing on their own — tasks that systems should handle transparently.

This is what researchers call **externalized processing**: systems shift automatable preprocessing tasks onto users, creating confusion, repeated failures, and task abandonment. *(Read the [full research paper](/_articles/))*

**Compresso eliminates this problem.** Drop it into any file upload flow and images are automatically optimized — right format, right size, right dimensions — before they ever leave the browser.

## Why Compresso

- **~3 KB gzipped** — smaller than most icons
- **Zero dependencies** — nothing to audit, nothing to break
- **Runs in the browser** — no server-side processing, no API keys, no costs that scale with traffic
- **Works everywhere** — any framework, any browser, any device
- **Virtually lossless** — smart quality tuning preserves visual fidelity while drastically cutting file size
- **Accessibility-first** — designed for the users who need it most

## Install

```bash
npm install compresso
```

Or use from a CDN:

```html
<script src="https://unpkg.com/compresso/dist/compresso.umd.js"></script>
```

## Quick Start

```js
import { compress } from 'compresso';

const input = document.querySelector('input[type="file"]');

input.addEventListener('change', async (e) => {
  const file = e.target.files[0];

  const result = await compress(file, {
    quality: 0.8,
    maxWidth: 1920,
    format: 'webp',
  });

  console.log(`${result.savings}% smaller`);
  // → "87.3% smaller"

  // Use result.file for upload, result.url for preview
});
```

## Target a Maximum File Size

Perfect for systems with strict upload limits:

```js
const result = await compress(file, {
  maxSizeMB: 2,       // Will never exceed 2 MB
  format: 'jpeg',
});
```

Compresso uses iterative quality search — it binary-searches for the highest quality that fits within your size constraint.

## API

### `compress(source, options?)`

Compresses a single image.

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `File \| Blob \| string` | Image file, blob, or URL |
| `options` | `CompressOptions` | See below |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `quality` | `number` | `0.8` | Output quality, 0–1 |
| `maxWidth` | `number` | `Infinity` | Maximum output width in px |
| `maxHeight` | `number` | `Infinity` | Maximum output height in px |
| `format` | `string` | `'auto'` | `'jpeg'`, `'png'`, `'webp'`, `'avif'`, or `'auto'` |
| `maxSizeMB` | `number` | `Infinity` | Maximum file size in MB |
| `backgroundColor` | `string` | `'#ffffff'` | Background for transparent → JPEG |
| `onProgress` | `function` | — | Progress callback `({ progress, stage })` |
| `signal` | `AbortSignal` | — | Cancel compression |

#### Result

| Property | Type | Description |
|----------|------|-------------|
| `file` | `File` | Optimized File object |
| `blob` | `Blob` | Optimized Blob |
| `url` | `string` | Object URL for preview |
| `width` | `number` | Output width |
| `height` | `number` | Output height |
| `originalSize` | `number` | Original size in bytes |
| `compressedSize` | `number` | Compressed size in bytes |
| `savings` | `number` | Reduction percentage |
| `format` | `string` | Output format |

### `compressMultiple(files, options?)`

Compress an array of files sequentially. Same options as `compress`, with an extended progress callback that includes `fileIndex`, `totalFiles`, and `overallProgress`.

### `createCompressor(defaults?)`

Create a reusable instance with preset options:

```js
const optimizer = createCompressor({
  quality: 0.7,
  maxWidth: 1200,
  format: 'webp',
});

const result = await optimizer.compress(file);
```

### Utilities

```js
import { isFormatSupported, getBestFormat, formatBytes } from 'compresso';

isFormatSupported('avif');  // true or false
getBestFormat();            // 'avif', 'webp', or 'jpeg'
formatBytes(1536000);       // '1.5 MB'
```

## Framework Examples

<details>
<summary><strong>React</strong></summary>

```jsx
import { useState } from 'react';
import { compress, formatBytes } from 'compresso';

function ImageUpload() {
  const [result, setResult] = useState(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const optimized = await compress(file, {
      quality: 0.8,
      maxWidth: 1920,
      format: 'webp',
    });

    setResult(optimized);
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFile} />
      {result && (
        <div>
          <img src={result.url} alt="Optimized" />
          <p>{formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)}</p>
          <p>{result.savings}% smaller</p>
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
import { compress, formatBytes } from 'compresso';

const result = ref(null);

async function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  result.value = await compress(file, {
    quality: 0.8,
    maxWidth: 1920,
    format: 'webp',
  });
}
</script>

<template>
  <input type="file" accept="image/*" @change="handleFile" />
  <div v-if="result">
    <img :src="result.url" alt="Optimized" />
    <p>{{ formatBytes(result.originalSize) }} → {{ formatBytes(result.compressedSize) }}</p>
    <p>{{ result.savings }}% smaller</p>
  </div>
</template>
```

</details>

<details>
<summary><strong>Vanilla JS</strong></summary>

```html
<input type="file" accept="image/*" id="upload" />
<div id="output"></div>

<script src="https://unpkg.com/compresso/dist/compresso.umd.js"></script>
<script>
  document.getElementById('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const result = await Compresso.compress(file, {
      quality: 0.8,
      format: 'webp',
      maxSizeMB: 2,
    });

    document.getElementById('output').innerHTML = `
      <img src="${result.url}" style="max-width: 400px" />
      <p>${Compresso.formatBytes(result.originalSize)} → ${Compresso.formatBytes(result.compressedSize)}</p>
      <p>${result.savings}% smaller</p>
    `;
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

When `format: 'auto'`, Compresso detects the best format supported by the browser.

## How It Works

Compresso uses the browser's native Canvas API — no WASM, no heavy codecs, no server round-trips.

1. **Load** — Read the image into an `<img>` element
2. **Resize** — Calculate target dimensions (preserving aspect ratio), using step-down resizing for quality
3. **Compress** — Draw to `<canvas>`, export as the target format with the desired quality
4. **Fit** — If a max file size is set, binary-search for the highest quality that fits

The result is a new `File` object ready for upload, plus metadata about the optimization.

## The Impact

For a typical government document upload system processing **100,000 submissions/month**:

| Metric | Without Compresso | With Compresso |
|--------|------------------|----------------|
| Avg. file size | 4.2 MB | 0.4 MB |
| Monthly bandwidth | 420 GB | 40 GB |
| Upload failures | ~15% | ~0% |
| Server processing | Heavy | None |
| User confusion | High | None |

**90% less bandwidth. Zero upload failures. Zero server-side processing.**

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) — use it in anything, commercial or otherwise.

## Research

This project is grounded in research on cognitive distance and externalized processing in information systems. Read the papers:

- *Cognitive Distance in Document Submission Systems: Why Users Struggle with Simple Digital Tasks* — Izaias Cavalcanti

---

<p align="center">
  Made with care for the people who struggle with file uploads.<br />
  <a href="https://compresso.dev">compresso.dev</a>
</p>
