import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { Linking, PermissionsAndroid, Platform } from 'react-native';

import CompressoEngine from '../../modules/compresso-engine';
import type { Outcome } from '../engine/types';

/**
 * Results are added as new photos; originals are never touched. iOS asks for
 * "Add Photos Only", never full library access. Android 10+ needs no
 * permission; Android 9 and older ask for storage once.
 */
export async function saveToPhotos(outcomes: Outcome[]): Promise<'saved' | 'denied'> {
  saved = [];
  if (Platform.OS === 'android' && Number(Platform.Version) < 29) {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return 'denied';
  }
  try {
    for (const o of outcomes) {
      const where = await CompressoEngine.saveToLibrary(o.uri, o.takenAt);
      if (where) saved.push(where);
    }
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_PERMISSION') return 'denied';
    throw e;
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  return 'saved';
}

let saved: string[] = [];

/**
 * After saving, take the person to what they saved. Android opens the first
 * saved photo in their gallery app (where swiping shows the rest, in the
 * Compresso album); iOS opens the Photos app. False if nothing could open.
 */
export async function openLibrary(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') return saved.length > 0 && CompressoEngine.openInGallery(saved[0]);
    await Linking.openURL('photos-redirect://');
    return true;
  } catch {
    return false;
  }
}

export const canOpenLibrary = true;

export async function share(uri: string, mimeType?: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType });
}

export const tick = () => Haptics.selectionAsync();
