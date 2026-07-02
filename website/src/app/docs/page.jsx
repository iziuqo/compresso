'use client';

import { useEffect, useState } from 'react';
import { getTranslations, locales, defaultLocale, getLocaleLabel } from '../../i18n';
import Logo from '../../components/Logo';

function detectBasePath() {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname;
  if (path.startsWith("/compresso")) return "/compresso";
  return "";
}

function detectLocale() {
  if (typeof window === 'undefined') return defaultLocale;
  const saved = localStorage.getItem('compresso-locale');
  if (saved && locales.includes(saved)) return saved;
  const browserLang = navigator.language?.toLowerCase() || '';
  if (browserLang.startsWith('pt')) return 'pt-br';
  if (browserLang.startsWith('es')) return 'es';
  return 'en';
}

const sections = [
  { id: 'installation', titleKey: 'installation' },
  { id: 'quick-start', titleKey: 'quickStart' },
  { id: 'api', titleKey: 'api' },
  { id: 'options', titleKey: 'options' },
  { id: 'result', titleKey: 'result' },
  { id: 'target-size', titleKey: 'targetSize' },
  { id: 'progress', titleKey: 'progress' },
  { id: 'abort', titleKey: 'abort' },
  { id: 'formats', titleKey: 'formats' },
  { id: 'frameworks', titleKey: 'frameworks' },
  { id: 'browser', titleKey: 'browser' },
];

export default function DocsPage() {
  const [locale, setLocale] = useState(defaultLocale);
  const [basePath, setBasePath] = useState('');

  useEffect(() => {
    setLocale(detectLocale());
    setBasePath(detectBasePath());
  }, []);

  const t = getTranslations(locale);

  return (
    <div className="min-h-screen bg-cream-light">
      <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4">
        <div className="max-w-site mx-auto">
          <div className="flex items-center justify-between h-14 px-4 sm:px-5 rounded-pill bg-cream-light/90 backdrop-blur-md border border-line/80 shadow-nav">
            <a href={`${basePath}/`} className="flex items-center gap-2.5">
              <Logo size={26} />
              <span className="text-[0.9375rem] font-bold text-ink tracking-tight">Compresso</span>
              <span className="text-sm font-medium text-ink-faint hidden sm:inline">/ {t.docs.title}</span>
            </a>
            <div className="flex items-center gap-3">
              <select
                value={locale}
                onChange={(e) => { setLocale(e.target.value); localStorage.setItem('compresso-locale', e.target.value); }}
                className="appearance-none bg-transparent text-sm font-medium text-ink-muted hover:text-plum px-2 py-1.5 cursor-pointer focus:outline-none rounded-ui"
                aria-label="Language"
              >
                {locales.map((l) => (
                  <option key={l} value={l}>{getLocaleLabel(l)}</option>
                ))}
              </select>
              <a href="https://github.com/iziuqo/compresso" target="_blank" rel="noopener noreferrer" className="text-ink-muted hover:text-plum transition-colors p-1.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-site mx-auto pt-28 pb-16 px-5 sm:px-8">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
          {/* Sidebar */}
          <aside className="hidden lg:block sticky top-28 h-fit">
            <nav className="space-y-0.5" aria-label="Documentation">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-sm py-2 px-3 rounded-ui text-ink-muted hover:text-plum hover:bg-plum-light transition-colors"
                >
                  {t.docs[s.titleKey]}
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="prose max-w-none prose-headings:scroll-mt-28 prose-headings:font-display prose-headings:tracking-tight prose-headings:text-ink prose-p:text-ink-muted prose-li:text-ink-muted prose-td:text-ink-muted prose-th:text-ink prose-strong:text-ink prose-a:text-plum prose-a:no-underline hover:prose-a:text-plum-hover prose-code:bg-cream prose-code:text-plum prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-plum-ink prose-pre:text-[#E8E0EA] prose-pre:rounded-ui-xl prose-pre:border prose-pre:border-line">
            <h1>{t.docs.title}</h1>

            <h2 id="installation">{t.docs.installation}</h2>
            <p>{t.docs.installDesc}</p>
            <pre><code>{`npm install compresso.js
# or
yarn add compresso.js
# or
pnpm add compresso.js`}</code></pre>

            <p>{t.docs.cdnDesc}</p>
            <pre><code>{`<script src="https://unpkg.com/compresso.js/dist/compresso.umd.js"></script>`}</code></pre>

            <h2 id="quick-start">{t.docs.quickStart}</h2>
            <pre><code>{`import { compress } from 'compresso.js';

const input = document.querySelector('input[type="file"]');

input.addEventListener('change', async (e) => {
  const file = e.target.files[0];

  const result = await compress(file, {
    quality: 0.8,
    maxWidth: 1920,
    format: 'webp',
  });

  console.log(\`\${result.savings}% smaller\`);
  // result.file → optimized File, ready for upload
  // result.url  → object URL for preview
});`}</code></pre>

            <h2 id="api">{t.docs.api}</h2>

            <h3><code>compress(source, options?)</code></h3>
            <p>{t.docs.compressDesc}</p>

            <h3><code>compressMultiple(files, options?)</code></h3>
            <p>{t.docs.compressMultipleDesc}</p>

            <h3><code>createCompressor(defaults?)</code></h3>
            <p>{t.docs.createCompressorDesc}</p>
            <pre><code>{`const optimizer = createCompressor({
  quality: 0.7,
  maxWidth: 1200,
  format: 'webp',
});

const result = await optimizer.compress(file);`}</code></pre>

            <h2 id="options">{t.docs.options}</h2>
            <table>
              <thead>
                <tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td><code>quality</code></td><td><code>number</code></td><td><code>0.8</code></td><td>Output quality, 0 to 1</td></tr>
                <tr><td><code>maxWidth</code></td><td><code>number</code></td><td><code>Infinity</code></td><td>Maximum output width in pixels</td></tr>
                <tr><td><code>maxHeight</code></td><td><code>number</code></td><td><code>Infinity</code></td><td>Maximum output height in pixels</td></tr>
                <tr><td><code>format</code></td><td><code>string</code></td><td><code>&apos;auto&apos;</code></td><td><code>&apos;jpeg&apos;</code> | <code>&apos;png&apos;</code> | <code>&apos;webp&apos;</code> | <code>&apos;avif&apos;</code> | <code>&apos;auto&apos;</code></td></tr>
                <tr><td><code>maxSizeMB</code></td><td><code>number</code></td><td><code>Infinity</code></td><td>Maximum file size in MB</td></tr>
                <tr><td><code>backgroundColor</code></td><td><code>string</code></td><td><code>&apos;#ffffff&apos;</code></td><td>Background color for transparent → JPEG</td></tr>
                <tr><td><code>onProgress</code></td><td><code>function</code></td><td>—</td><td>Progress callback</td></tr>
                <tr><td><code>signal</code></td><td><code>AbortSignal</code></td><td>—</td><td>Cancel compression</td></tr>
              </tbody>
            </table>

            <h2 id="result">{t.docs.result}</h2>
            <table>
              <thead>
                <tr><th>Property</th><th>Type</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td><code>file</code></td><td><code>File</code></td><td>Optimized File object</td></tr>
                <tr><td><code>blob</code></td><td><code>Blob</code></td><td>Optimized Blob</td></tr>
                <tr><td><code>url</code></td><td><code>string</code></td><td>Object URL for preview</td></tr>
                <tr><td><code>width</code></td><td><code>number</code></td><td>Output width</td></tr>
                <tr><td><code>height</code></td><td><code>number</code></td><td>Output height</td></tr>
                <tr><td><code>originalSize</code></td><td><code>number</code></td><td>Original size in bytes</td></tr>
                <tr><td><code>compressedSize</code></td><td><code>number</code></td><td>Compressed size in bytes</td></tr>
                <tr><td><code>savings</code></td><td><code>number</code></td><td>Reduction percentage</td></tr>
                <tr><td><code>format</code></td><td><code>string</code></td><td>Output format</td></tr>
              </tbody>
            </table>

            <h2 id="target-size">{t.docs.targetSize}</h2>
            <p>{t.docs.targetSizeDesc}</p>
            <pre><code>{`const result = await compress(file, {
  maxSizeMB: 2,    // Output will be ≤ 2 MB
  format: 'jpeg',
});`}</code></pre>

            <h2 id="progress">{t.docs.progress}</h2>
            <pre><code>{`const result = await compress(file, {
  onProgress: ({ progress, stage }) => {
    console.log(\`\${stage}: \${Math.round(progress * 100)}%\`);
    // loading: 10% → resizing: 30% → compressing: 50-90% → done: 100%
  },
});`}</code></pre>

            <h2 id="abort">{t.docs.abort}</h2>
            <pre><code>{`const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const result = await compress(file, {
    signal: controller.signal,
  });
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('Compression was cancelled');
  }
}`}</code></pre>

            <h2 id="formats">{t.docs.formats}</h2>
            <pre><code>{`import { isFormatSupported, getBestFormat, detectFormat } from 'compresso.js';

// Check if the current browser supports AVIF
isFormatSupported('avif');  // true or false

// Get the best format the browser supports
getBestFormat();  // 'avif', 'webp', or 'jpeg'

// Detect format from a file
detectFormat(file);  // 'png', 'jpeg', etc.`}</code></pre>

            <h2 id="frameworks">{t.docs.frameworks}</h2>

            <h3>React</h3>
            <pre><code>{`import { useState } from 'react';
import { compress, formatBytes } from 'compresso.js';

function ImageUpload() {
  const [result, setResult] = useState(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setResult(await compress(file, { quality: 0.8, format: 'webp' }));
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFile} />
      {result && (
        <p>{formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)} ({result.savings}% smaller)</p>
      )}
    </div>
  );
}`}</code></pre>

            <h3>Vue</h3>
            <pre><code>{`<script setup>
import { ref } from 'vue';
import { compress } from 'compresso.js';

const result = ref(null);

async function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  result.value = await compress(file, { quality: 0.8, format: 'webp' });
}
</script>

<template>
  <input type="file" accept="image/*" @change="handleFile" />
  <p v-if="result">{{ result.savings }}% smaller</p>
</template>`}</code></pre>

            <h3>Vanilla JS (CDN)</h3>
            <pre><code>{`<script src="https://unpkg.com/compresso.js/dist/compresso.umd.js"></script>
<script>
  document.getElementById('upload').addEventListener('change', async (e) => {
    const result = await Compresso.compress(e.target.files[0], {
      quality: 0.8,
      format: 'webp',
      maxSizeMB: 2,
    });
    console.log(result.savings + '% smaller');
  });
</script>`}</code></pre>

            <h2 id="browser">{t.docs.browser}</h2>
            <table>
              <thead>
                <tr><th>Browser</th><th>JPEG/PNG</th><th>WebP</th><th>AVIF</th></tr>
              </thead>
              <tbody>
                <tr><td>Chrome 32+</td><td>✓</td><td>✓</td><td>✓ (85+)</td></tr>
                <tr><td>Firefox 29+</td><td>✓</td><td>✓ (96+)</td><td>✓ (113+)</td></tr>
                <tr><td>Safari 8+</td><td>✓</td><td>✓ (16+)</td><td>✓ (16.4+)</td></tr>
                <tr><td>Edge 79+</td><td>✓</td><td>✓</td><td>✓ (121+)</td></tr>
              </tbody>
            </table>
            <p>{t.docs.autoFormatDesc}</p>

            <h2 id="why-browser">{t.docs.whyBrowserTitle}</h2>
            <p>{t.docs.whyBrowserDesc}</p>

            <table>
              <thead>
                <tr><th></th><th>{t.docs.comparisonServer}</th><th>{t.docs.comparisonClient}</th></tr>
              </thead>
              <tbody>
                <tr><td>{t.docs.compCost}</td><td>{t.docs.compCostServer}</td><td><strong>{t.docs.compCostClient}</strong></td></tr>
                <tr><td>{t.docs.compLatency}</td><td>{t.docs.compLatencyServer}</td><td><strong>{t.docs.compLatencyClient}</strong></td></tr>
                <tr><td>{t.docs.compOffline}</td><td>{t.docs.compOfflineServer}</td><td><strong>{t.docs.compOfflineClient}</strong></td></tr>
                <tr><td>{t.docs.compPrivacy}</td><td>{t.docs.compPrivacyServer}</td><td><strong>{t.docs.compPrivacyClient}</strong></td></tr>
                <tr><td>{t.docs.compDeps}</td><td>{t.docs.compDepsServer}</td><td><strong>{t.docs.compDepsClient}</strong></td></tr>
              </tbody>
            </table>
          </main>
        </div>
      </div>
    </div>
  );
}
