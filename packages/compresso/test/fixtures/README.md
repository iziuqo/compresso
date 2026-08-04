# Test fixtures

Four tiny (16×16), synthetic, non-personal images — a hand-built PNG (raw pixel
data + Node's built-in `zlib.deflateSync`, no external tool), converted to JPEG,
HEIC, and AVIF via macOS's built-in `sips`. Committed so the browser integration
suite (`test/browser/`) has real, decodable images to test `compress()` against
in CI, independent of the personal photo corpus at `_assets/` (gitignored,
local-only, used as additional — not required — coverage; see that suite for how
the two are combined).

No WebP fixture: `sips` can read WebP but not write it, and no other WebP encoder
was available at generation time. `probe.js`'s WebP header parsing is covered by
synthetic header-only fixtures in `test/probe.test.js` instead; a real,
browser-decodable WebP sample is a gap here, not silently assumed covered.

Regenerate with the same approach if these ever need to change: build a raw PNG
by hand (chunk framing + `zlib.deflateSync` for `IDAT`), then
`sips -s format <jpeg|heic|avif> sample.png --out sample.<ext>`.
