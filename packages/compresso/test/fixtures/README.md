# Test fixtures

A small, licence-clean corpus that every CI run uses. `manifest.json` lists
each file with its MIME type, size, SHA-256, displayed width and height, its
licence and source, and what it stresses. `test/fixtures.test.js` fails if a
file is added, changed or removed without the manifest, or if the set grows
past 3 MB. Large images (12, 24, 48 MP, 800 × 20000) are not committed: the
browser tests draw them on the device with `generatedImage()` in
`test/browser/support/fixtures.js`.

| Files | What they are |
| --- | --- |
| `photo.jpg` | A real photograph, CC0 from Wikimedia Commons (see the manifest for the page), 1600 px wide |
| `photo.heic` | `photo.jpg` as a real HEVC-coded HEIC |
| `photo-truncated.jpg` | The first third of `photo.jpg`, like a broken download |
| `photo-gps.jpg` | `photo.jpg` at 800 px with EXIF GPS (a public landmark), which a re-encode strips |
| `photo-gps-compact.jpg`, `photo-gps.webp` | seeded noise at the lowest quality with the same GPS EXIF: no re-encode beats them, so they are kept |
| `orientation-1.jpg` … `orientation-8.jpg` | All eight EXIF orientations; each displays as red, green / blue, white quadrants, 48 × 32 |
| `animated.gif`, `animated.png`, `animated.webp` | Three frames each (APNG for the PNG) |
| `photo.gif` | `photo.jpg` at 400 px as a still, one-frame GIF |
| `vector.svg` | A vector source |
| `pixel-flood.png` | 67 bytes whose header claims 100000 × 100000 |
| `sample.jpg`, `.png`, `.heic`, `.avif` | The original tiny synthetic fixtures, 64 × 64 |

Everything except `photo.jpg` and the `sample.*` files is written by
`generate.py`, which also rewrites the manifest. It is deterministic, so
running it again changes nothing:

```bash
python3 -m venv .venv && .venv/bin/pip install pillow pillow-heif
.venv/bin/python test/fixtures/generate.py   # from packages/compresso
```

The `sample.*` files are a hand-built PNG (raw pixels and Node's
`zlib.deflateSync`) converted to JPEG, HEIC and AVIF with macOS's `sips`.

New fixtures need a licence that allows redistribution under this repository
(CC0, public domain or synthetic), an entry in `generate.py`, and must keep
the total under 3 MB. Never commit a personal photo: the local-only corpus in
`_assets/` exists for that.
