'use client';

import { useState } from 'react';

const INSTALL_CODE = 'npm install compresso.js';

const USAGE_CODE = `import { compress } from 'compresso.js';

const input = document.querySelector('input[type="file"]');

input.addEventListener('change', async (e) => {
  const file = e.target.files[0];

  const result = await compress(file, {
    quality: 0.8,
    maxWidth: 1920,
    format: 'webp',
  });

  console.log(\`\${result.savings}% smaller\`);
  // Use result.file for upload
});`;

export default function CodeSection({ t }) {
  const [copied, setCopied] = useState(null);

  function copy(text, id) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.code.title}</h2>
          <p className="text-gray-600 text-lg">{t.code.subtitle}</p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">{t.code.install}</span>
              <button
                onClick={() => copy(INSTALL_CODE, 'install')}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                aria-label="Copy install command"
              >
                {copied === 'install' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
                {copied === 'install' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="code-block">
              <code>
                <span className="text-gray-500">$ </span>
                <span className="text-emerald-400">{INSTALL_CODE}</span>
              </code>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">{t.code.use}</span>
              <button
                onClick={() => copy(USAGE_CODE, 'usage')}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                aria-label="Copy usage code"
              >
                {copied === 'usage' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
                {copied === 'usage' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="code-block">
              <pre className="text-sm leading-relaxed">
                <code>{USAGE_CODE}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
