import type { Source } from '../engine/types';

/**
 * The same photo picked twice. The URI is the sure sign, but the iOS picker
 * copies each pick to a fresh cache file, so a second pick of a photo already
 * in the list comes back under a new URI. Its name, byte size and pixel size
 * still match, which is as good as certain; a size of 0 means the picker
 * didn't say, and then only the URI counts.
 */
export function samePhoto(a: Source, b: Source): boolean {
  if (a.uri === b.uri) return true;
  return a.size > 0 && a.size === b.size && a.name === b.name && a.width === b.width && a.height === b.height;
}

/** `list` with `more` at the end, in picked order, skipping any photo already there. */
export function appendSources(list: Source[], more: Source[]): Source[] {
  const next = [...list];
  for (const source of more) {
    if (!next.some((s) => samePhoto(s, source))) next.push(source);
  }
  return next;
}
