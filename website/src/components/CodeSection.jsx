'use client';

import { useState } from 'react';
import StoryChapter from './StoryChapter';

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

function CodeBlock({ title, children, onCopy, copied }) {
  return (
    <div className="rounded-card overflow-hidden border border-line bg-canvas-light">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-canvas-soft">
        <span className="text-[0.6875rem] font-semibold tracking-[0.04em] uppercase text-ink-faint leading-snug">{title}</span>
        <button
          onClick={onCopy}
          className="text-xs font-semibold text-cobalt hover:text-cobalt-bright transition-colors"
          aria-label="Copy code"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="code-surface p-4 sm:p-5 overflow-x-auto leading-[1.7]">{children}</div>
    </div>
  );
}

export default function CodeSection({ t }) {
  const [copied, setCopied] = useState(null);

  function copy(text, id) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section id="code" className="band-soft section-block">
      <div className="site-wrap max-w-2xl">
        <StoryChapter label={t.code.label} title={t.code.title} desc={t.code.subtitle} />

        <div className="space-y-4">
          <CodeBlock
            title={t.code.install}
            onCopy={() => copy(INSTALL_CODE, 'install')}
            copied={copied === 'install'}
          >
            <code>
              <span className="text-white/40">$ </span>
              <span className="text-brand-soft font-semibold">{INSTALL_CODE}</span>
            </code>
          </CodeBlock>

          <CodeBlock
            title={t.code.use}
            onCopy={() => copy(USAGE_CODE, 'usage')}
            copied={copied === 'usage'}
          >
            <pre className="whitespace-pre-wrap"><code>{USAGE_CODE}</code></pre>
          </CodeBlock>
        </div>
      </div>
    </section>
  );
}
