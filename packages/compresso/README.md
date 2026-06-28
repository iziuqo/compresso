# Compresso

Tiny, zero-dependency image optimizer that runs entirely in the browser. Compress, resize, and convert images on the client side — no server needed.

**~2 KB gzipped** · **Zero dependencies** · **Works everywhere**

[Website](https://compresso.dev) · [Documentation](https://compresso.dev/docs) · [GitHub](https://github.com/iziuqo/compresso)

## Install

```bash
npm install compressojs
```

## Usage

```js
import { compress } from 'compressojs';

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

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `quality` | `number` | `0.8` | Output quality, 0–1 |
| `maxWidth` | `number` | `Infinity` | Max output width in px |
| `maxHeight` | `number` | `Infinity` | Max output height in px |
| `format` | `string` | `'auto'` | `'jpeg'` \| `'png'` \| `'webp'` \| `'avif'` \| `'auto'` |
| `maxSizeMB` | `number` | `Infinity` | Max file size in MB |
| `onProgress` | `function` | — | Progress callback |
| `signal` | `AbortSignal` | — | Cancel compression |

## License

[MIT](https://github.com/iziuqo/compresso/blob/main/LICENSE)
