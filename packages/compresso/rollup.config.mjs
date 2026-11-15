import terser from '@rollup/plugin-terser';

// Source maps point at src/, which ships once beside dist/, instead of
// embedding the same sources in all seven maps: that keeps the package
// small (PKG-08) while devtools still show the original code.
const sourcemap = { sourcemap: true, sourcemapExcludeSources: true };

export default [
  {
    input: 'src/index.js',
    // The app's own optional `heic-to`, never bundled here (SEC-01): one bare
    // import, so the app's bundler emits one codec chunk (PKG-05).
    external: ['heic-to'],
    output: [
      {
        file: 'dist/compresso.mjs',
        format: 'es',
        ...sourcemap,
      },
      {
        file: 'dist/compresso.cjs',
        format: 'cjs',
        ...sourcemap,
        exports: 'named',
      },
      {
        file: 'dist/compresso.umd.js',
        format: 'umd',
        name: 'Compresso',
        ...sourcemap,
        exports: 'named',
      },
    ],
    plugins: [terser()],
  },
  // The planner is pure logic with no DOM or worker URL, so unlike the pool it
  // also ships as CommonJS, for React Native's Metro and Node.
  {
    input: 'src/plan.js',
    output: [
      { file: 'dist/compresso.plan.mjs', format: 'es', ...sourcemap },
      { file: 'dist/compresso.plan.cjs', format: 'cjs', ...sourcemap, exports: 'named' },
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
    // The pool decodes HEIC for its workers, with the app's own `heic-to`.
    external: ['heic-to'],
    output: {
      file: 'dist/compresso.pool.mjs',
      format: 'es',
      ...sourcemap,
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
    // It never imports the codec: a worker asks the page to decode HEIC
    // (see worker.js). heic.js is still in its graph, for the format checks,
    // so the specifier stays external; tree-shaking leaves no import of it.
    input: 'src/worker.js',
    external: ['heic-to'],
    output: {
      file: 'dist/worker.js',
      format: 'es',
      ...sourcemap,
    },
    plugins: [terser()],
  },
];
