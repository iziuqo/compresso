import { purposeById, type PurposeId } from '../engine/presets';
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
  /** Times the app has started, so the rating prompt skips a first session. */
  launches: number;
  /** Runs saved to the library, so the rating prompt waits for real use. */
  saves: number;
  /** The app version the store rating was last asked for ('' = never). */
  reviewAskedFor: string;
};

export const DEFAULT_PREFS: Prefs = {
  locale: null,
  appearance: 'system',
  introSeen: false,
  lastPurpose: 'message',
  uploadLimit: purposeById('upload').limits![0],
  lastSaved: 0,
  launches: 0,
  saves: 0,
  reviewAskedFor: '',
};
