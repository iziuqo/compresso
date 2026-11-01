import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { PermissionsAndroid, Platform } from 'react-native';

import CompressoEngine from '../../modules/compresso-engine';
import type { Outcome } from '../engine/types';

/** The first photo of the last save (Android content URI), for openLibrary. */
let first: string | null = null;

/**
 * Results are added as new photos; originals are never touched. iOS asks for
 * "Add Photos Only", never full library access. Android 10+ needs no
 * permission; Android 9 and older ask for storage once.
 */
export async function saveToPhotos(outcomes: Outcome[]): Promise<'saved' | 'denied'> {
  first = null;
  if (Platform.OS === 'android' && Number(Platform.Version) < 29) {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return 'denied';
  }
  try {
    for (const o of outcomes) {
      const where = await CompressoEngine.saveToLibrary(o.uri, o.takenAt);
      first ??= where;
    }
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_PERMISSION') return 'denied';
    throw e;
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  return 'saved';
}

/**
 * Android can show what was just saved: the first photo opens in the gallery
 * app, where swiping shows the rest of the Compresso album. iOS has no public
 * way to open Photos at an asset, so there the guidance text does the job.
 */
export const canOpenLibrary = Platform.OS === 'android';

export function openLibrary(): boolean {
  return canOpenLibrary && first !== null && CompressoEngine.openInGallery(first);
}

export async function share(uri: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
}

export const tick = () => Haptics.selectionAsync();
