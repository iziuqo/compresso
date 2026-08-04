import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/index.js',
    external: ['heic-to'],
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
    external: ['heic-to'],
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
    input: 'src/worker.js',
    external: ['heic-to'],
    output: {
      dir: 'dist',
      format: 'es',
      sourcemap: true,
      entryFileNames: 'worker.js',
    },
    plugins: [terser()],
  },
];
