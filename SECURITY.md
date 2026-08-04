# Security Policy

## Overview

Compresso runs entirely in the browser. It does not make network requests, does not transmit data, and does not store anything outside the page. Images are processed locally using the Canvas API and never leave the user's device.

## Architecture properties that matter for security

- **No custom image-parsing code for JPEG/PNG/WebP/AVIF.** Every decode for these formats goes through the browser's own native `Image`/`createImageBitmap`/`OffscreenCanvas` pipeline — the same, already-hardened decoder that renders every `<img>` tag on the web. Compresso carries no decoder-specific vulnerability surface of its own for these formats. HEIC/HEIF is the one exception: it's decoded via the optional, lazily-loaded `heic-to` package (compiled `libheif`), the only place compresso runs custom native-format decode code, and only when a HEIC file is actually encountered.
- **The HEIC decode path is confirmed by magic bytes, not just MIME type or filename.** A blob with no type and no name is still treated as a HEIC candidate (iPhone files frequently arrive that way), but before it's handed to the WASM decoder its first bytes are checked against the HEIC/HEIF `ftyp` box signature — an arbitrary untyped, unnamed blob that isn't actually HEIC-shaped is rejected instead of reaching the decoder.
- **Input resolution is bounded before and after decode.** A file can declare pixel dimensions that would make the browser attempt an enormous allocation from a handful of bytes. `compress()` checks declared resolution against `maxInputPixels` (default 100 MP) twice: cheaply, from the file header alone, before the expensive decode call for JPEG/PNG/WebP; and again after decode, for every format, as the only guard for HEIC/AVIF/URL sources and as defense-in-depth otherwise.
- **HEIC support requires `'wasm-unsafe-eval'` (or `'unsafe-eval'`) in a strict Content-Security-Policy.** `heic-to`'s decoder is WebAssembly; a page whose `script-src` doesn't permit WASM compilation will see HEIC decoding fail with a clear error naming the CSP requirement, rather than every other format being affected.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately via email:

**iz.iuqo@gmail.com**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work to issue a fix promptly.

## Scope

Since Compresso is a client-side library with no server component, the attack surface is limited. However, we take the following seriously:

- XSS vectors through image processing
- Prototype pollution
- Denial of service through malformed images — including resource exhaustion via
  crafted pixel dimensions (bounded by `maxInputPixels`, see above) and via files
  that are merely slow to decode regardless of declared size
- Supply chain security of the npm package, and of the optional `heic-to`
  dependency in particular — it's resolved by the consuming application's own
  lockfile, not compresso's, so its actual installed version and any known
  vulnerabilities in it are outside this project's direct control; narrowing
  which inputs reach it at all (see the magic-byte confirmation above) is the
  mitigation available at this layer
