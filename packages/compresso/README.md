# Compresso

Tiny, zero-dependency image optimizer that runs entirely in the browser. Compress, resize, and convert images on the client side — no server needed.

**~2.5 KB gzipped core** · **Zero required dependencies** · **HEIC/HEIF input** · **Works everywhere**

[Website](https://compresso.izaias.xyz) · [Documentation](https://compresso.izaias.xyz/docs) · [GitHub](https://github.com/iziuqo/compresso)

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
| `onProgress` | `function` | — | Progress callback |
| `signal` | `AbortSignal` | — | Cancel compression |

¹ Original resolution is kept by default. The one exception: when neither `maxWidth` nor `maxHeight` is set **and** the browser can't encode WebP/AVIF (auto-format falls back to JPEG — e.g. Safari), output is capped to a **2048px long edge**, because a full-resolution JPEG re-encode could otherwise grow larger than the original. Browsers with a modern format keep the original dimensions. Set either axis to constrain it yourself, or pass `maxWidth: Infinity` to never cap.

² **Lossy output (JPEG/WebP/AVIF) is never larger than the source**, regardless of `maxSizeMB`. PNG output is exempt, since it's lossless and ignores quality.

## License

[MIT](https://github.com/iziuqo/compresso/blob/main/LICENSE) © Izaias Cavalcanti
