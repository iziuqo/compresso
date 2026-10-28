import type { Prefs } from './prefs.types';

const KEY = 'compresso.prefs';

export function loadPrefs(): Partial<Prefs> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch { /* private mode */ }
}
