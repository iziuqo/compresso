import { NativeModule, requireNativeModule } from 'expo';

import type {
  EncodeFormat, EncodeOptions, Prepared, PrepareOptions, WriteOptions, Written,
} from './CompressoEngine.types';

declare class CompressoEngineModule extends NativeModule<{}> {
  /** Formats this device can write, best first. */
  formats(): EncodeFormat[];
  prepare(uri: string, options: PrepareOptions): Promise<Prepared>;
  /** Encode in memory and return the byte size. The result is cached for `write`. */
  encode(handle: string, options: EncodeOptions): Promise<number>;
  write(handle: string, options: WriteOptions): Promise<Written>;
  /** Copy the source unchanged (the never-bigger fallback). */
  copyOriginal(handle: string, name: string): Promise<Written>;
  release(handle: string): void;
  /**
   * Add a file to the photo library as a new photo (add-only access).
   * Android returns the new photo's content URI; iOS returns null.
   */
  saveToLibrary(uri: string, takenAt: number | null): Promise<string | null>;
  /** Android only: show a saved photo in the gallery app. False if no app can. */
  openInGallery(uri: string): boolean;
}

export default requireNativeModule<CompressoEngineModule>('CompressoEngine');
