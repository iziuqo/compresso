#!/usr/bin/env node
/**
 * Copy the built consumer app into Next.js static export output so it
 * deploys with compresso.izaias.xyz on every Vercel build (no separate repo push).
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'compresso-app/dist/compresso');
const DEST = join(ROOT, 'out/compresso');

if (!existsSync(SRC)) {
  console.warn('[embed-app] Skipped — run npm run build:app first');
  process.exit(0);
}

mkdirSync(DEST, { recursive: true });
for (const entry of readdirSync(SRC)) {
  cpSync(join(SRC, entry), join(DEST, entry), { recursive: true });
}
console.log(`[embed-app] Copied ${SRC} → ${DEST}`);
