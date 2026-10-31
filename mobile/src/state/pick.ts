import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

import type { Source } from '../engine/types';
import { useApp } from './app';

/**
 * The system photo picker: PHPicker on iOS, the Android Photo Picker. Neither
 * needs library permission, which is why there is no permission prompt before
 * the first pick — and why Play's photo-permission declaration doesn't apply.
 *
 * `Current` keeps an iPhone's HEIC as HEIC: the engine reads it natively, and
 * the default "compatible" mode would re-encode it to JPEG first, costing time
 * and quality before we've done anything.
 */
export async function pickPhotos(): Promise<Source[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 0,
    orderedSelection: true,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
    quality: 1,
  });
  if (result.canceled) return [];
  return result.assets.map((a, i) => ({
    uri: a.uri,
    name: baseName(a.fileName) ?? `photo-${i + 1}`,
    size: a.fileSize ?? 0,
    width: a.width,
    height: a.height,
    mimeType: a.mimeType ?? undefined,
    file: a.file ?? undefined,
  }));
}

function baseName(fileName?: string | null): string | null {
  if (!fileName) return null;
  const dot = fileName.lastIndexOf('.');
  return (dot > 0 ? fileName.slice(0, dot) : fileName).replace(/[^\w.-]+/g, '-');
}

/**
 * Open the picker and make the result the selection, or with `append` add it
 * to the end of the selection. `busy` covers the time the picker is open;
 * `then` runs only when something was picked.
 */
export function usePicker(then?: () => void, { append = false } = {}): { pick: () => Promise<void>; busy: boolean } {
  const { setSelection, add } = useApp();
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    setBusy(true);
    try {
      const picked = await pickPhotos();
      if (picked.length > 0) {
        if (append) add(picked);
        else setSelection(picked);
        then?.();
      }
    } finally {
      setBusy(false);
    }
  };
  return { pick, busy };
}
