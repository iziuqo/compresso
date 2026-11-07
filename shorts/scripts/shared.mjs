import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The shorts/ folder. */
export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * photos.json: `photos` are the Commons originals (id → file, licence, author);
 * `results` are what the Shorts show, each a photo run through one app purpose.
 */
export const { photos, results } = JSON.parse(readFileSync(join(root, 'photos.json'), 'utf8'));
