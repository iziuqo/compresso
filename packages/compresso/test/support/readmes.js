/**
 * The two READMEs, read the way GitHub and npm show them: their headings'
 * anchors, and their code snippets. Shared by test/readmes.test.js (anchors)
 * and scripts/extract-readme-snippets.mjs (snippets, type-checked by
 * `npm run test:types`), so both read the files one way.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** The READMEs by name: the repository's (GitHub) and the package's (npm). */
export const READMES = {
  repository: join(PACKAGE, '../../README.md'),
  package: join(PACKAGE, 'README.md'),
};

/** A README's text. */
export const readme = (name) => readFileSync(READMES[name], 'utf8');

/** `text` without its fenced code blocks, so a `#` comment in a snippet isn't read as a heading. */
const prose = (text) => text.replace(/^```[\s\S]*?^```/gm, '');

/**
 * GitHub's anchor for a heading: lower case, punctuation dropped (letters,
 * digits, spaces, `-` and `_` stay), spaces turned into `-`. A repeated
 * heading gets `-1`, `-2` and so on, as on GitHub.
 */
export function anchors(text) {
  const seen = new Map();
  return [...prose(text).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)].map(([, heading]) => {
    const slug = heading
      .replace(/<[^>]+>|`/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/\s/g, '-');
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    return count ? `${slug}-${count}` : slug;
  });
}

/** Every `#anchor` a README links to within itself. */
export const ownAnchorLinks = (text) => [...prose(text).matchAll(/\]\(#([^)]+)\)|href="#([^"]+)"/g)].map((m) => m[1] ?? m[2]);

/**
 * The README's code snippets that hold JavaScript or TypeScript, as
 * `{ language, code }`: js, jsx and ts fences whole, and the `<script>` of an
 * html, vue or svelte fence. A script that only loads a file has no code and
 * is left out.
 */
export function snippets(text) {
  const found = [];
  for (const [, language, code] of text.matchAll(/^```(\w+)\n([\s\S]*?)^```/gm)) {
    if (['js', 'jsx', 'ts'].includes(language)) found.push({ language, code });
    if (['html', 'vue', 'svelte'].includes(language)) {
      for (const [, script] of code.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
        if (script.trim()) found.push({ language: 'js', code: script });
      }
    }
  }
  return found;
}
