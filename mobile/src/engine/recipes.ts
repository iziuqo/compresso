import { allocateBudget, purposeById, type PurposeId } from './presets';
import type { Recipe, Source } from './types';

/** Settings the person changed, on top of a purpose. A missing key means "automatic". */
export type Tweaks = Partial<Recipe>;

/**
 * The recipe each photo gets, most specific last: the purpose's recipe, the
 * upload limit, the person's tweaks for every photo, then that photo's own.
 *
 * Email shares one byte budget. Photos given their own size limit keep it;
 * what is left of the budget is split across the rest.
 */
export function recipesFor(
  purpose: PurposeId, sources: Source[], tweaks: Tweaks, uploadLimit: number, own: Record<string, Tweaks> = {},
): Recipe[] {
  const p = purposeById(purpose);
  const base: Recipe = { ...p.recipe, ...(purpose === 'upload' ? { targetBytes: uploadLimit } : {}), ...tweaks };
  const recipes = sources.map((s) => ({ ...base, ...own[s.uri] }));
  if (!p.totalBytes || 'targetBytes' in tweaks) return recipes;

  const hasOwnSize = (s: Source) => own[s.uri] !== undefined && 'targetBytes' in own[s.uri];
  const free = sources.flatMap((s, i) => (hasOwnSize(s) ? [] : [i]));
  const reserved = sources.reduce((sum, s, i) => (hasOwnSize(s) ? sum + (recipes[i].targetBytes ?? 0) : sum), 0);
  const shares = allocateBudget(Math.max(0, p.totalBytes - reserved), free.map((i) => sources[i].size));
  free.forEach((i, k) => {
    recipes[i] = { ...recipes[i], targetBytes: shares[k] };
  });
  return recipes;
}
