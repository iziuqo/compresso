#!/usr/bin/env node
/**
 * Mirror website/compresso-app source to iziuqo/compresso-app and push.
 * Requires COMPRESSO_APP_DEPLOY_TOKEN (classic PAT or fine-grained with contents:write).
 *
 * Usage: COMPRESSO_APP_DEPLOY_TOKEN=ghp_... node scripts/sync-compresso-app-repo.mjs
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_SRC = join(ROOT, 'website/compresso-app');
const REMOTE = 'https://github.com/iziuqo/compresso-app.git';
const BRANCH = process.env.COMPRESSO_APP_BRANCH || 'main';
const TOKEN = process.env.COMPRESSO_APP_DEPLOY_TOKEN;

if (!TOKEN) {
  console.log('[sync-compresso-app] COMPRESSO_APP_DEPLOY_TOKEN not set — skipping mirror');
  process.exit(0);
}

const tmp = mkdtempSync(join(tmpdir(), 'compresso-app-sync-'));
const authRemote = REMOTE.replace('https://', `https://x-access-token:${TOKEN}@`);

try {
  execSync(`git clone --depth 1 --branch ${BRANCH} ${authRemote} ${tmp}`, { stdio: 'inherit' });

  const excludes = [
    'node_modules', 'dist', 'dev-dist', '.vercel', '.git', '_qa',
  ].map((e) => `--exclude=${e}`).join(' ');

  execSync(`tar cf - ${excludes} -C ${APP_SRC} . | tar xf - -C ${tmp}`, { stdio: 'inherit' });

  execSync('git add -A', { cwd: tmp, stdio: 'inherit' });
  const status = execSync('git status --porcelain', { cwd: tmp, encoding: 'utf8' });
  if (!status.trim()) {
    console.log('[sync-compresso-app] No changes to push');
    process.exit(0);
  }

  execSync('git config user.email "cursor-agent@users.noreply.github.com"', { cwd: tmp });
  execSync('git config user.name "Cursor Agent"', { cwd: tmp });
  execSync('git commit -m "chore: sync from compresso monorepo (website/compresso-app)"', { cwd: tmp, stdio: 'inherit' });
  execSync(`git push origin ${BRANCH}`, { cwd: tmp, stdio: 'inherit' });
  console.log('[sync-compresso-app] Pushed to iziuqo/compresso-app');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
