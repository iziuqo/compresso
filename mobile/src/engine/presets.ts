import type { Recipe } from './types';

/**
 * Sizes are decimal (1 MB = 1,000,000 bytes) on purpose. Upload forms disagree
 * about what "1 MB" means; a decimal target fits under either reading, and it
 * matches how iOS and Android show file sizes.
 */
export const KB = 1000;
export const MB = 1000 * KB;

export type PurposeId = 'message' | 'email' | 'upload' | 'space' | 'web';

export type Purpose = {
  id: PurposeId;
  recipe: Recipe;
  /** Email: one budget shared by every photo in the job. */
  totalBytes?: number;
  /** Upload form: the limits offered, the first is the default. */
  limits?: number[];
};

/**
 * What people compress for, not how. Each is data, so a new purpose is an
 * entry here plus its strings — no screen changes.
 */
export const PURPOSES: Purpose[] = [
  {
    id: 'message',
    recipe: { formats: ['jpeg'], quality: 0.8, maxLongEdge: 1600, targetBytes: 400 * KB, metadata: 'strip-location' },
  },
  {
    id: 'email',
    recipe: { formats: ['jpeg'], quality: 0.8, maxLongEdge: 2560, targetBytes: null, metadata: 'strip-location' },
    totalBytes: 5 * MB,
  },
  {
    id: 'upload',
    recipe: { formats: ['jpeg'], quality: 0.85, maxLongEdge: 2400, targetBytes: 1 * MB, metadata: 'strip-location' },
    limits: [1 * MB, 500 * KB, 200 * KB, 2 * MB],
  },
  {
    // Kept in the library, so capture details stay. HEIC where it can be
    // written (iPhone), JPEG elsewhere for compatibility.
    id: 'space',
    recipe: { formats: ['heic', 'jpeg'], quality: 0.75, maxLongEdge: 4032, targetBytes: null, metadata: 'keep' },
  },
  {
    id: 'web',
    recipe: { formats: ['webp', 'jpeg'], quality: 0.78, maxLongEdge: 1920, targetBytes: null, metadata: 'strip' },
  },
];

export const purposeById = (id: PurposeId): Purpose =>
  PURPOSES.find((p) => p.id === id) ?? PURPOSES[0];

/**
 * Split one byte budget across photos, roughly in proportion to their size
 * (a big photo has more to give up), never giving a photo more than it already
 * weighs; what a small photo can't use flows to the others. A 3% margin
 * absorbs container overhead.
 */
export function allocateBudget(totalBytes: number, reported: number[]): number[] {
  const budget = totalBytes * 0.97;
  // A photo the picker reported no size for is weighed like an average one.
  const known = reported.filter((s) => s > 0);
  const average = known.length > 0 ? known.reduce((a, b) => a + b, 0) / known.length : 3 * MB;
  const sizes = reported.map((s) => (s > 0 ? s : average));
  const out = sizes.map(() => 0);
  let open = sizes.map((_, i) => i);
  let remaining = budget;

  while (open.length > 0 && remaining > 1) {
    const weight = open.reduce((sum, i) => sum + sizes[i], 0);
    const capped: number[] = [];
    let spent = 0;
    for (const i of open) {
      const share = (remaining * sizes[i]) / weight;
      const room = sizes[i] - out[i];
      if (share >= room) {
        out[i] += room;
        spent += room;
        capped.push(i);
      }
    }
    if (capped.length === 0) {
      for (const i of open) out[i] += (remaining * sizes[i]) / weight;
      remaining = 0;
      break;
    }
    remaining -= spent;
    open = open.filter((i) => !capped.includes(i));
  }
  return out.map(Math.floor);
}
