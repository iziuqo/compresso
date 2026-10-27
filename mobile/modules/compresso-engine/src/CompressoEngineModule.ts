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
  /** Add a file to the photo library as a new photo (add-only access). */
  saveToLibrary(uri: string, takenAt: number | null): Promise<void>;
}

export default requireNativeModule<CompressoEngineModule>('CompressoEngine');
