import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';

import { MB } from '../engine/presets';
import type { Prefs } from './prefs.types';

/** The app version a rating is asked for; the prompt comes at most once per version. */
export const appVersion = (): string => Constants.expoConfig?.version ?? '';

/**
 * Whether a successful save is a good moment to ask for a store rating: the
 * person has saved photos at least twice before, isn't in their first
 * session, hasn't been asked in this version, and this run clearly worked
 * (at least 1 MB or half the size saved). The stores' own sheet is shown
 * directly: no pre-prompt and no reward, which both stores forbid.
 */
export function isGoodMoment(
  prefs: Pick<Prefs, 'saves' | 'launches' | 'reviewAskedFor'>, version: string, saved: number, original: number,
): boolean {
  return prefs.saves >= 3 && prefs.launches >= 2 && prefs.reviewAskedFor !== version
    && (saved >= MB || (original > 0 && saved / original >= 0.5));
}

/**
 * Asks the store for its rating sheet. Fire-and-forget: the OS decides whether
 * it shows (iOS about three times a year), and a failure never reaches a save.
 */
export function askForReview(): void {
  StoreReview.isAvailableAsync().then((ok) => (ok ? StoreReview.requestReview() : undefined)).catch(() => {});
}
