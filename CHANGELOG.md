# Changelog

All notable changes to `compresso.js` are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] — 2026-07-11

### Changed
- **Relicensed to MIT.** Compresso is now fully open source under the MIT License
  (previously MIT + Commons Clause). No code changes.

## [0.3.0] — 2026-07-11

### Fixed
- **HEIC/photo compression could inflate files on Safari.** Safari cannot encode
  WebP/AVIF from a canvas, so `format: 'auto'` falls back to JPEG; re-encoding a
  full-resolution ~12 MP photo to JPEG could end up larger than the original.

### Added
- **Never-bigger guarantee.** Lossy output (JPEG/WebP/AVIF) is now never larger than
  the source, regardless of `maxSizeMB`.
- **Smart default resolution cap** on the WebP-less JPEG fallback path (e.g. Safari):
  caps to a 2048px long edge only when the caller sets no dimensions and no modern
  format is available. Browsers with WebP/AVIF keep full resolution; opt out with
  `maxWidth: Infinity`.

## [0.2.0] — 2026-07-10

### Added
- **HEIC/HEIF image input.** Decode iPhone photos and convert them to web formats in
  any browser — Safari/iOS decode natively; other browsers lazily load an optional
  WASM decoder (`heic-to`) only on the first HEIC file. The ~2 KB core stays
  codec-free and dependency-free for every other format.

## [0.1.0] — initial release

### Added
- Browser-native image compression, resizing, and format conversion via the Canvas API.
- `compress`, `compressMultiple`, `createCompressor`, and format/size utilities.
- `format: 'auto'` (AVIF → WebP → JPEG), `maxSizeMB` target via quality binary search,
  progress callbacks, `AbortSignal` support, and TypeScript types.

[0.3.1]: https://github.com/iziuqo/compresso/releases/tag/v0.3.1
[0.3.0]: https://github.com/iziuqo/compresso/releases/tag/v0.3.0
[0.2.0]: https://github.com/iziuqo/compresso/releases/tag/v0.2.0
[0.1.0]: https://github.com/iziuqo/compresso/releases/tag/v0.1.0
