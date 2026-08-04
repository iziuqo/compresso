import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'src/index.js',
    // 'heic-to/next' (the worker-safe variant, see heic.js) is never actually
    // reachable from this build's own module graph (isWorker is always false
    // on the main thread) but Rollup can't prove that from a `typeof
    // document` check, so it still needs to know not to try resolving it.
    external: ['heic-to', 'heic-to/next'],
    output: [
      {
        file: 'dist/compresso.mjs',
        format: 'es',
        sourcemap: true,
      },
      {
        file: 'dist/compresso.cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: 'dist/compresso.umd.js',
        format: 'umd',
        name: 'Compresso',
        sourcemap: true,
        exports: 'named',
      },
    ],
    plugins: [terser()],
  },
  // `pool.js`/`worker.js` are ESM-only: real module workers and
  // `import.meta.url`-relative worker discovery are fundamentally ESM
  // concepts (§3.4). Both ship as dist/ siblings — pool.js resolves
  // worker.js via `new URL('./worker.js', import.meta.url)` at runtime, so
  // that relative resolution only holds if they're built side by side here.
  {
    input: 'src/pool.js',
    // pool.js never calls decodeHeic() itself, but its static graph reaches
    // heic.js transitively (via compress.js/platform.js), so both specifiers
    // heic.js references need the same "don't try to resolve this" as above.
    external: ['heic-to', 'heic-to/next'],
    output: {
      file: 'dist/compresso.pool.mjs',
      format: 'es',
      sourcemap: true,
    },
    plugins: [terser()],
  },
  {
    // Named `worker.js`, not `compresso.worker.mjs` — pool.js resolves it at
    // runtime via `new URL('./worker.js', import.meta.url)`, a literal
    // relative reference that must match this build's own output filename.
    // That source string also has to stay `./worker.js` unchanged (it's what
    // Vite resolves in dev/test mode against the sibling src/worker.js), so
    // the built file's name is what has to match it, not the other way
    // around.
    //
    // `external: ['heic-to']` (the *default* export only — deliberately NOT
    // 'heic-to/next', see below) is different from the main entry above for
    // a real reason found the hard way against compresso-app's actual Vite
    // production build, in two layers:
    //
    // 1. heic-to's default export touches `document` (Emscripten glue
    //    resolving its own script URL) and throws inside a worker — heic.js
    //    already picks 'heic-to/next' (the package's documented worker-safe
    //    variant) whenever it detects no `document`, so the default variant
    //    is simply never reachable code here and is left external, same as
    //    the main entry, rather than wastefully bundled for nothing.
    // 2. 'heic-to/next' still can't be left as a bare specifier the way the
    //    main entry leaves 'heic-to', because `dist/worker.js` is discovered
    //    by a *consumer's* bundler at runtime via `new URL(...,
    //    import.meta.url)` rather than a static `import` statement, and it
    //    lives inside that consumer's node_modules — bundlers that special-
    //    case `new Worker(new URL(...))` (Vite confirmed, likely others)
    //    generally don't also recurse into that worker file looking for
    //    further imports to bundle/copy, so a bare specifier left inside it
    //    can fail to resolve at runtime after a real production build (works
    //    on Chromium's native ESM loader in dev; after a real `vite build`,
    //    "Failed to resolve module specifier 'heic-to/next'"). Letting
    //    Rollup resolve it *here* instead (via `nodeResolve()` below — plain
    //    Rollup has no node_modules resolution of its own), turns it into a
    //    genuine code-split chunk. It's fixed at `heic-to.js` (no content
    //    hash), not `[name]-[hash].js`, so it has a stable name `pool.js`
    //    can reference by a static `new URL('./heic-to.js', import.meta.url)`
    //    — pool.js is what actually makes *bundled* consumers work (this
    //    build's own relative chunk reference alone only carries a no-
    //    bundler/CDN consumer the rest of the way): see pool.js's own
    //    comment for why the URL is resolved there instead and handed to the
    //    worker at dispatch time. HEIC stays exactly as lazy as before
    //    either way: this only changes *where* the chunk boundary is drawn,
    //    not *whether* `heic-to` loads eagerly — it still ships as its own
    //    chunk, fetched only when a HEIC file actually reaches a worker.
    input: 'src/worker.js',
    external: ['heic-to'],
    output: {
      dir: 'dist',
      format: 'es',
      sourcemap: true,
      entryFileNames: 'worker.js',
      chunkFileNames: 'heic-to.js',
    },
    plugins: [nodeResolve(), terser()],
  },
];
