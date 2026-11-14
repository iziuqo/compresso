/**
 * The seven apps: how each bundler builds `app.js` with its defaults, as a
 * user following its docs would. `files` are written beside `app.js`;
 * `build` runs there with this folder's pinned tools; the page is
 * `out/index.html`. Apps that emit no HTML get `PAGE`, which loads the
 * bundle as a module or, for an IIFE, as a classic script.
 */
const page = (script) => `<!doctype html><html><head><meta charset="utf-8"></head><body>${script}</body></html>`;
const MODULE_PAGE = page('<script type="module" src="./app.js"></script>');
const CLASSIC_PAGE = (src) => page(`<script src="./${src}"></script>`);

export const APPS = [
  {
    name: 'vite',
    files: { 'index.html': MODULE_PAGE },
    build: ['vite', 'build', '--outDir', 'out', '--emptyOutDir'],
  },
  {
    name: 'webpack',
    build: ['webpack', 'build', '--mode=production', '--entry=./app.js', '--output-path=./out'],
    page: CLASSIC_PAGE('main.js'),
  },
  {
    name: 'rspack',
    build: ['rspack', 'build', '--mode=production', '--entry=./app.js', '--output-path=./out'],
    page: CLASSIC_PAGE('main.js'),
  },
  {
    name: 'rollup',
    files: {
      'rollup.config.mjs':
        "import { nodeResolve } from '@rollup/plugin-node-resolve';\n" +
        "export default { input: 'app.js', output: { dir: 'out', format: 'es' }, plugins: [nodeResolve({ browser: true })] };\n",
    },
    build: ['rollup', '-c'],
    page: MODULE_PAGE,
  },
  {
    name: 'esbuild-esm',
    build: ['esbuild', 'app.js', '--bundle', '--format=esm', '--splitting', '--outdir=out'],
    page: MODULE_PAGE,
  },
  {
    name: 'esbuild-iife',
    build: ['esbuild', 'app.js', '--bundle', '--outfile=out/app.js'],
    page: CLASSIC_PAGE('app.js'),
  },
  {
    name: 'parcel',
    files: { 'index.html': MODULE_PAGE },
    build: ['parcel', 'build', 'index.html', '--dist-dir', 'out', '--no-cache', '--no-source-maps'],
  },
];
