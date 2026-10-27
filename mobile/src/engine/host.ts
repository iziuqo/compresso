import CompressoEngine from '../../modules/compresso-engine';
import type { Engine } from './types';

/** iOS and Android: the native module, one-to-one. */
export const engine: Engine = {
  formats: () => CompressoEngine.formats(),
  prepare: (source, options) => CompressoEngine.prepare(source.uri, options),
  encode: (handle, options) => CompressoEngine.encode(handle, options),
  write: (handle, options) => CompressoEngine.write(handle, options),
  copyOriginal: (handle, name) => CompressoEngine.copyOriginal(handle, name),
  release: (handle) => CompressoEngine.release(handle),
};

/** Photos compressed side by side. Memory, not cores, is the limit. */
export const concurrency = 2;
