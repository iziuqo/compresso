import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * The app is mounted at izaias.xyz/compresso, so every emitted URL — assets,
 * the manifest, the service worker and its precache list — has to carry that
 * prefix. `base` is what makes that true everywhere at once.
 */
const BASE = '/compresso/';
const SCOPE = '/compresso';

export default defineConfig({
  base: BASE,
  // compresso.js/pool resolves its worker via `new URL('./worker.js',
  // import.meta.url)` in its own dist file. Vite's dep pre-bundler (esbuild)
  // doesn't rewrite that expression or copy the referenced worker.js into
  // `.vite/deps/`, so at runtime `import.meta.url` points at the pre-bundled
  // file's own location and the worker 404s — only in dev; a production
  // build handles this correctly since it runs the whole graph through
  // Vite/Rollup's own `new URL(...)` asset handling. Excluding the package
  // from optimizeDeps serves it unbundled, through Vite's normal transform
  // pipeline, which resolves the URL correctly.
  optimizeDeps: { exclude: ['compresso.js'] },
  resolve: {
    alias: {
      // heic.js's importHeicTo() branches on `typeof document === 'undefined'`
      // at runtime. Every call site reachable from this app's main graph runs
      // on the main thread, so that branch is always false — but Vite can't
      // prove that statically and bundles the unreachable 'heic-to/next'
      // chunk anyway (~2.9 MB, byte-identical in shape to the 'heic-to'
      // chunk it duplicates). Redirecting it to the branch that actually
      // executes collapses two chunks into one. Does NOT touch the real
      // worker path — compresso.js/pool resolves its HEIC codec via a
      // concrete URL (DEFAULT_HEIC_TO_URL in pool.js), never through this
      // specifier — so worker-side HEIC decoding is unaffected. Re-check
      // this alias on any compresso.js version bump: it depends on
      // importHeicTo()'s internal isWorker check never being reachable as
      // true from this app's own call sites.
      'heic-to/next': 'heic-to',
    },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        name: 'Compresso — Image Optimizer',
        short_name: 'Compresso',
        description:
          'Compress, resize and convert images. Runs entirely on your device — nothing is uploaded. Works offline.',
        // No trailing slash: that is the URL people are given, and a scope of
        // '/compresso/' would not cover it — scope matching is a plain string
        // prefix, so '/compresso' is outside '/compresso/'.
        start_url: SCOPE,
        scope: SCOPE,
        id: SCOPE,
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        orientation: 'any',
        categories: ['utilities', 'photo', 'productivity'],
        icons: [
          { src: BASE + 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: BASE + 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: BASE + 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: BASE + 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        // Fonts and the worker chunk are part of the product, not extras — they are
        // precached so the app is genuinely complete offline.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  worker: { format: 'es' },
  // Emitted into dist/compresso so the deployment literally serves the same
  // paths the base declares — no rewrite layer to keep in sync.
  build: { target: 'es2022', cssTarget: 'safari16', outDir: 'dist/compresso', emptyOutDir: true },
});
