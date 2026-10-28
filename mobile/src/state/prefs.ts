import { File, Paths } from 'expo-file-system';

import type { Prefs } from './prefs.types';

/**
 * A tiny JSON file in the app's documents folder. Preferences are a handful of
 * fields; a database or an extra storage dependency would be all cost.
 */
const file = () => new File(Paths.document, 'prefs.json');

export function loadPrefs(): Partial<Prefs> {
  try {
    const f = file();
    return f.exists ? JSON.parse(f.textSync()) : {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    file().write(JSON.stringify(prefs));
  } catch {
    // Losing a preference is not worth interrupting anyone over.
  }
}
