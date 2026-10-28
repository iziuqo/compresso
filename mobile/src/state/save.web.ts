import type { Outcome } from '../engine/types';

/** Web build: "Save" downloads, "Share" uses the Web Share API where it exists. */
export async function saveToPhotos(outcomes: Outcome[]): Promise<'saved' | 'denied'> {
  for (const o of outcomes) {
    const a = document.createElement('a');
    a.href = o.uri;
    a.download = '';
    a.click();
  }
  return 'saved';
}

/** Downloads have no gallery to open. */
export const canOpenLibrary = false;
export const openLibrary = (): boolean => false;

export async function share(uri: string): Promise<void> {
  const blob = await (await fetch(uri)).blob();
  const file = new File([blob], 'compresso', { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
}

export const tick = () => {};
