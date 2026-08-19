/**
 * Tier B (developer PLG) and Tier C (competitor intercept) landing pages.
 * English source of truth; other locales merge over en (same pattern as stubs).
 */
const LOCALES = ['es', 'fr', 'de', 'it', 'pt-BR', 'zh-Hans'];

function fillLocales(enPage, translations = {}) {
  const page = { en: enPage };
  for (const locale of LOCALES) {
    page[locale] = translations[locale] || enPage;
  }
  return page;
}

/** @type {Record<string, Record<string, object>>} */
export const TIER_BC_PAGES = {
  'compress-image-before-upload': fillLocales(
    {
      metaTitle: 'Compress Image Before Upload — JavaScript & Browser | Compresso',
      metaDescription:
        'Compress images before upload in any web form. compresso.js runs client-side with a 3.6 KB API — no server, no API keys.',
      h1: 'Compress images before upload',
      answer:
        'Drop compresso.js into your file input handler: compress(file) returns an optimized File ready to upload. Images never leave the browser until your code sends them.',
      steps: [
        'npm install compresso.js',
        'Call compress(file, { quality: 0.8, maxWidth: 1920, format: "auto" }) on change.',
        'Upload result.file instead of the original.',
      ],
      faq: [
        { q: 'Works with multipart forms?', a: 'Yes. result.file is a standard File object for FormData.' },
        { q: 'Need a backend?', a: 'No. Compression is 100% client-side.' },
      ],
      related: ['javascript-image-compressor', 'client-side-image-compression', 'react-image-compression'],
    },
    {
      es: {
        metaTitle: 'Comprimir imagen antes de subir — JavaScript y navegador | Compresso',
        metaDescription:
          'Comprime imágenes antes de subirlas en cualquier formulario web. compresso.js es client-side, 3,6 KB, sin servidor.',
        h1: 'Comprime imágenes antes de subirlas',
        answer:
          'Integra compresso.js en tu input: compress(file) devuelve un File optimizado listo para subir. Las imágenes no salen del navegador hasta que tu código las envía.',
        steps: [
          'npm install compresso.js',
          'Llama compress(file, { quality: 0.8, maxWidth: 1920, format: "auto" }) al cambiar.',
          'Sube result.file en lugar del original.',
        ],
        faq: [
          { q: '¿Funciona con formularios multipart?', a: 'Sí. result.file es un File estándar para FormData.' },
          { q: '¿Necesito backend?', a: 'No. La compresión es 100% del lado del cliente.' },
        ],
        related: ['javascript-image-compressor', 'client-side-image-compression', 'react-image-compression'],
      },
      'pt-BR': {
        metaTitle: 'Comprimir imagem antes do envio — JavaScript e navegador | Compresso',
        metaDescription:
          'Comprima imagens antes do upload em qualquer formulário. compresso.js roda no cliente, 3,6 KB, sem servidor.',
        h1: 'Comprima imagens antes do envio',
        answer:
          'Use compresso.js no input: compress(file) retorna um File otimizado pronto para envio. As imagens não saem do navegador até seu código enviá-las.',
        steps: [
          'npm install compresso.js',
          'Chame compress(file, { quality: 0.8, maxWidth: 1920, format: "auto" }) no change.',
          'Envie result.file em vez do original.',
        ],
        faq: [
          { q: 'Funciona com multipart?', a: 'Sim. result.file é um File padrão para FormData.' },
          { q: 'Precisa de backend?', a: 'Não. Compressão 100% no cliente.' },
        ],
        related: ['javascript-image-compressor', 'client-side-image-compression', 'react-image-compression'],
      },
    },
  ),
  'javascript-image-compressor': fillLocales({
    metaTitle: 'JavaScript Image Compressor — 3.6 KB, HEIC, Zero Deps | compresso.js',
    metaDescription:
      'Tiny JavaScript image compressor for browsers. HEIC input, AVIF/WebP output, never-bigger guarantee, Web Worker pool. 3.6 KB gzipped.',
    h1: 'JavaScript image compressor for the browser',
    answer:
      'compresso.js is a 3.6 KB, zero-dependency library that compresses, resizes, and converts images using the Canvas API — with optional HEIC input and parallel Web Worker batching.',
    steps: ['npm install compresso.js', 'import { compress } from "compresso.js"', 'await compress(file, options)'],
    faq: [{ q: 'TypeScript?', a: 'First-class types ship with the package.' }],
    related: ['client-side-image-compression', 'web-worker-image-compression', 'compress-image-before-upload'],
  }),
  'client-side-image-compression': fillLocales({
    metaTitle: 'Client-Side Image Compression — No Server Required | Compresso',
    metaDescription:
      'Compare client-side vs server-side image compression. Compresso runs in the browser — zero upload, zero infra cost at scale.',
    h1: 'Client-side image compression',
    answer:
      'Client-side compression moves work to the user device: no GPU servers, no privacy risk, no per-GB bills. Compresso is built for upload flows that need optimization before the network request.',
    steps: [
      'User selects an image in your app.',
      'compresso.js optimizes locally.',
      'Only the smaller file is uploaded.',
    ],
    faq: [{ q: 'When use server-side instead?', a: 'Batch back-office processing — use sharp. User uploads in browser — use Compresso.' }],
    related: ['javascript-image-compressor', 'compress-images-without-uploading', 'private-image-compressor'],
  }),
  'react-image-compression': fillLocales({
    metaTitle: 'React Image Compression Before Upload | compresso.js',
    metaDescription: 'Compress images in React upload forms with compresso.js. Framework-agnostic, 3.6 KB, HEIC support.',
    h1: 'React image compression before upload',
    answer:
      'Call compress() inside your onChange handler — no React-specific wrapper required. An example App.jsx ships in the Compresso repository.',
    steps: ['npm install compresso.js', 'On file input change, await compress(file, options)', 'Set state with result.url or upload result.file'],
    faq: [{ q: 'Next.js App Router?', a: 'Yes — see the Next.js example in the repo.' }],
    related: ['nextjs-image-compression', 'compress-image-before-upload', 'javascript-image-compressor'],
  }),
  'nextjs-image-compression': fillLocales({
    metaTitle: 'Next.js Image Compression Before Upload | compresso.js',
    metaDescription: 'Compress images client-side in Next.js forms. No server action required for optimization — compresso.js runs in the browser.',
    h1: 'Next.js compress before upload',
    answer:
      'Run compression in a client component ("use client") on the file input. The optimized File uploads via fetch or server action — the compression step never needs your server.',
    steps: ['Add compresso.js to your client form component', 'Compress on select', 'Submit result.file'],
    faq: [{ q: 'Works with Server Actions?', a: 'Yes — pass the compressed File as you would the original.' }],
    related: ['react-image-compression', 'compress-image-before-upload', 'javascript-image-compressor'],
  }),
  'web-worker-image-compression': fillLocales({
    metaTitle: 'Web Worker Image Compression — Parallel Batch | compresso.js/pool',
    metaDescription:
      'Compress many images in parallel with compresso.js/pool. Resilient Web Worker pool, main-thread fallback, same API.',
    h1: 'Web Worker image compression',
    answer:
      'compresso.js/pool exposes createPool() and compressMany() — parallel jobs off the main thread with crash/timeout recovery. Falls back silently where Workers are blocked.',
    steps: ['import { createPool } from "compresso.js/pool"', 'const pool = createPool()', 'await pool.compressMany(files, options)'],
    faq: [{ q: 'CSP requirements?', a: 'Needs worker-src self; HEIC needs wasm-unsafe-eval in script-src.' }],
    related: ['batch-compress-images', 'javascript-image-compressor', 'compress-image-before-upload'],
  }),
  'tinypng-alternative': fillLocales({
    metaTitle: 'TinyPNG Alternative — Private, No Upload, In Browser | Compresso',
    metaDescription:
      'TinyPNG uploads your images to their servers. Compresso compresses locally — free, private, HEIC input, AVIF/WebP output.',
    h1: 'TinyPNG alternative that never uploads your photos',
    answer:
      'TinyPNG is fast but sends files to a third party with size and count limits. Compresso runs entirely in your browser — verify zero upload bytes in DevTools.',
    steps: ['Open the Compresso app', 'Drop images — no account', 'Download optimized files locally'],
    faq: [{ q: 'Batch limits?', a: 'No server caps — limited only by device memory.' }],
    related: ['compress-images-without-uploading', 'private-image-compressor', 'squoosh-alternative'],
  }),
  'squoosh-alternative': fillLocales({
    metaTitle: 'Squoosh Alternative — Batch, HEIC, Maintained | Compresso',
    metaDescription:
      'Squoosh compresses one image at a time. Compresso adds batch workflows, HEIC input, never-bigger guarantee, and an embeddable 3.6 KB library.',
    h1: 'Squoosh alternative with batch and HEIC',
    answer:
      'Squoosh pioneered in-browser WASM codecs but lacks batch polish and HEIC-in. Compresso targets upload flows: private, fast, library-first.',
    steps: ['Try the free app at compresso.izaias.xyz/compresso', 'Or npm install compresso.js for your product'],
    faq: [{ q: 'Same WASM codecs?', a: 'Compresso core uses Canvas API; app roadmap includes optional WASM engines.' }],
    related: ['tinypng-alternative', 'compress-images-online-free', 'javascript-image-compressor'],
  }),
  'imageoptim-alternative': fillLocales({
    metaTitle: 'ImageOptim Alternative — Free, Cross-Platform, Web | Compresso',
    metaDescription:
      'ImageOptim is Mac-only with no WebP/AVIF/HEIC. Compresso is free, browser-based, works on any OS, modern formats.',
    h1: 'ImageOptim alternative for every platform',
    answer:
      'ImageOptim excels on macOS with CPU codec chains but lacks modern formats and Windows/Linux support. Compresso runs in any browser with AVIF, WebP, and HEIC input.',
    steps: ['Open Compresso in Chrome, Firefox, or Safari', 'Compress or convert locally', 'Install as PWA for offline use'],
    faq: [{ q: 'Lossless PNG?', a: 'Compresso focuses on upload optimization; PNG lossless is a known gap vs desktop chains.' }],
    related: ['offline-image-compressor', 'compress-heic-online', 'tinypng-alternative'],
  }),
  'iloveimg-alternative': fillLocales({
    metaTitle: 'iLoveIMG Alternative — Private Browser Compression | Compresso',
    metaDescription:
      'iLoveIMG uploads images to servers. Compresso keeps files on your device — free, no account, HEIC support.',
    h1: 'iLoveIMG alternative without uploading',
    answer:
      'Online suites like iLoveIMG trade privacy for convenience. Compresso is architecturally private: compression never sends image bytes to Compresso servers.',
    steps: ['Use the web app — no signup', 'Compress JPEG, PNG, WebP, AVIF, HEIC', 'Download or upload only where you choose'],
    faq: [{ q: 'PDF or video?', a: 'Compresso is image-focused. Use dedicated tools for PDF/video.' }],
    related: ['private-image-compressor', 'compress-images-without-uploading', 'tinypng-alternative'],
  }),
};

export const TIER_BC_SLUGS = Object.keys(TIER_BC_PAGES);
