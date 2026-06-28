export { compress } from './compress.js';
export { isFormatSupported, getBestFormat, detectFormat } from './utils.js';

export function compressFile(file, options = {}) {
  return compress(file, options);
}

export async function compressMultiple(files, options = {}) {
  const results = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const fileOpts = {
      ...options,
      onProgress: options.onProgress
        ? ({ progress, stage }) => {
            options.onProgress({
              progress,
              stage,
              fileIndex: i,
              totalFiles: total,
              overallProgress: (i + progress) / total,
            });
          }
        : null,
    };

    results.push(await compress(files[i], fileOpts));
  }

  return results;
}

export function createCompressor(defaults = {}) {
  return {
    compress: (source, options = {}) =>
      compress(source, { ...defaults, ...options }),
    compressMultiple: (files, options = {}) =>
      compressMultiple(files, { ...defaults, ...options }),
  };
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

import { compress } from './compress.js';
