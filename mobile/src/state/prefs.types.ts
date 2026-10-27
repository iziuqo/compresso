import type { PurposeId } from '../engine/presets';
import type { Locale } from '../i18n';

export type Appearance = 'system' | 'dark' | 'light';

export type Prefs = {
  locale: Locale | null;
  appearance: Appearance;
  introSeen: boolean;
  lastPurpose: PurposeId;
  uploadLimit: number;
  /** Bytes saved by the most recent job, shown on Home. */
  lastSaved: number;
};

export const DEFAULT_PREFS: Prefs = {
  locale: null,
  appearance: 'system',
  introSeen: false,
  lastPurpose: 'message',
  uploadLimit: 1_000_000,
  lastSaved: 0,
};
