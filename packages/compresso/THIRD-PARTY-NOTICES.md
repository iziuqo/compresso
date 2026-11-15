# Third-party notices

compresso.js is MIT-licensed (see `LICENSE`), and this package contains no
third-party code.

## HEIC/HEIF decoding: `heic-to` (optional dependency, not included)

HEIC/HEIF input that the browser can't decode natively is decoded by
[`heic-to`](https://github.com/hoppergee/heic-to), which is licensed under the
GNU Lesser General Public License, version 3 or later (LGPL-3.0). It builds
[libheif](https://github.com/strukturag/libheif) and its decoders to
WebAssembly; their licences come with that package.

`heic-to` is an optional dependency. npm installs it as its own package beside
compresso.js, and compresso.js loads it with a plain `import('heic-to')` the
first time a HEIC image needs it, so your bundler builds it from your own
copy, as a separate chunk you can replace or update on its own. compresso.js
never copies or modifies it.

If your app ships that chunk, the LGPL's terms apply to it.

HEVC, the video codec inside HEIC, is covered by patents in some countries.
This notice is not legal advice.
