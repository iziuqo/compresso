import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { PermissionsAndroid, Platform } from 'react-native';

import CompressoEngine from '../../modules/compresso-engine';
import type { Outcome } from '../engine/types';

/**
 * Results are added as new photos; originals are never touched. iOS asks for
 * "Add Photos Only", never full library access. Android 10+ needs no
 * permission; Android 9 and older ask for storage once.
 */
export async function saveToPhotos(outcomes: Outcome[]): Promise<'saved' | 'denied'> {
  if (Platform.OS === 'android' && Number(Platform.Version) < 29) {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return 'denied';
  }
  try {
    for (const o of outcomes) await CompressoEngine.saveToLibrary(o.uri, o.takenAt);
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_PERMISSION') return 'denied';
    throw e;
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  return 'saved';
}

export async function share(uri: string, mimeType?: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType });
}

export const tick = () => Haptics.selectionAsync();
