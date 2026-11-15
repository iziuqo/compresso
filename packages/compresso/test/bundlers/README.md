# What ships: the tarball and seven bundler apps

`bundlers.test.js` tests the package as npm users get it. It packs the
tarball, checks it with [publint](https://publint.dev) and
[attw](https://arethetypeswrong.github.io), and installs it into seven small
apps, one per bundler, each built with that bundler's defaults:

| App | Build |
| --- | --- |
| `vite` | `vite build` |
| `webpack` | `webpack build --mode=production` |
| `rspack` | `rspack build --mode=production` |
| `rollup` | `rollup -c` with `@rollup/plugin-node-resolve` |
| `esbuild-esm` | `esbuild --bundle --format=esm --splitting` |
| `esbuild-iife` | `esbuild --bundle` (an IIFE, esbuild's default) |
| `parcel` | `parcel build`, zero config |

A separate check reads the unpacked tarball: no codec in it, the
third-party notice there, and under 0.5 MB in all.

Every app builds the same `app.js`, what a typical user writes. Each app is
opened in Chromium and filled into one row of the support matrix: the build,
the page load, then four checks: main-thread JPEG, a pool JPEG on real
workers, a pool HEIC, and a main-thread HEIC, then the build's warnings. The
build cell also fails unless the output holds exactly one copy of the HEIC
codec, the app's own `heic-to`. The warnings cell holds the first warning the
build printed, leaving out the bundler's advice that a chunk is large, which
the app's 3 MB codec is. A row passes when every cell is `ok`. Rows that fail today are listed in `KNOWN_FAILURES`
(`../support/known-failures.js`) with the exact cells that fail, so the test
fails on any other failure, and on a listed row that starts passing.

## Running it

```bash
npm ci --prefix test/bundlers   # once: the pinned bundlers, publint and attw
npm run build
npm run test:bundlers
```

Set `CHROMIUM_PATH` to use a Chromium other than Playwright's own. The tools
are pinned in this folder's own `package.json` and lockfile, kept apart from
the library's dev dependencies. The packed tarball lands in `.out/` and the
built apps in `.apps/`, both ignored by git; CI keeps the tarball as the
`npm-tarball` artifact of every run.
