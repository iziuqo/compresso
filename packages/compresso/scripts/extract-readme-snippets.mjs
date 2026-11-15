/**
 * Writes every JavaScript and TypeScript snippet of both READMEs to
 * test/types/readme/snippets/, one module per snippet, for
 * `npm run test:types` to type-check against the published declarations
 * (test/types/readme/tsconfig.json). The folder is rebuilt on every run and
 * never committed.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { READMES, readme, snippets } from '../test/support/readmes.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../test/types/readme/snippets');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let written = 0;
for (const name of Object.keys(READMES)) {
  snippets(readme(name)).forEach(({ language, code }, i) => {
    // `export {}` makes each snippet a module of its own, so names never clash between snippets.
    writeFileSync(join(OUT, `${name}-${i + 1}.${language}`), `${code}\nexport {};\n`);
    written += 1;
  });
}
console.log(`${written} README snippets written to ${OUT}`);
