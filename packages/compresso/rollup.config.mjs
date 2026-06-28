import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/index.js',
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
];
