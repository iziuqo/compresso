/**
 * Type-level exercise of the documented public API — README Quick Start,
 * Options, and "Batch & Workers" — against the hand-written declarations in
 * types/. Never executed; compiled with `npm run test:types` (tsc --noEmit)
 * to catch drift between the README and the declarations.
 */
import {
  compress,
  compressFile,
  compressMultiple,
  createCompressor,
  decodeHeic,
  detectFormat,
  formatBytes,
  getBestFormat,
  isFormatSupported,
  isHeicSource,
} from 'compresso.js';

import { createPool, defaultPoolSize, isPoolSupported } from 'compresso.js/pool';

import type {
  CompressOptions,
  CompressResult,
  MultiProgressEvent,
  ProgressEvent,
} from 'compresso.js';

import type {
  CompressManyResult,
  ErrorKind,
  Pool,
  PoolOptions,
  PoolStats,
} from 'compresso.js/pool';

const file = new File([new ArrayBuffer(8)], 'photo.jpg', { type: 'image/jpeg' });

// Every documented option — README Options table + types/index.d.ts.
const options: CompressOptions = {
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: Infinity,
  format: 'webp',
  maxSizeMB: 2,
  maxInputPixels: 100_000_000,
  backgroundColor: '#ffffff',
  preserveAspectRatio: true,
  signal: new AbortController().signal,
  onProgress(event: ProgressEvent) {
    console.log(`[${event.stage}] ${event.progress}`);
  },
};

async function compressOne(): Promise<CompressResult> {
  const result = await compress(file, options);
  const {
    file: optimized,
    blob,
    url,
    width,
    height,
    originalWidth,
    originalHeight,
    originalSize,
    compressedSize,
    savings,
    format,
    mimeType,
  } = result;
  console.log(
    `${savings}% smaller`,
    optimized,
    blob,
    url,
    width,
    height,
    originalWidth,
    originalHeight,
    originalSize,
    compressedSize,
    format,
    mimeType,
  );
  return result;
}

async function acceptedSources(): Promise<void> {
  await compress(file);
  await compress(new Blob([new ArrayBuffer(8)], { type: 'image/png' }));
  await compress('https://example.com/photo.jpg');
  await compressFile(file, { quality: 0.5 });

  for (const fmt of ['jpeg', 'png', 'webp', 'avif', 'auto'] as const) {
    await compress(file, { format: fmt });
  }
}

async function compressManyFiles(): Promise<CompressResult[]> {
  return compressMultiple([file, file], {
    quality: 0.8,
    onProgress(event) {
      // The declared onProgress is an intersection of both callbacks, so the
      // contextual parameter type is the union — narrow for the multi-only
      // fields.
      if ('fileIndex' in event) {
        console.log(
          `${event.fileIndex + 1}/${event.totalFiles} — ${Math.round(event.overallProgress * 100)}%`,
        );
      } else {
        console.log(`[${event.stage}] ${event.progress}`);
      }
    },
  });
}

function reusableCompressor(): void {
  const compressor = createCompressor({ quality: 0.8, format: 'avif' });
  console.log(compressor.compressMultiple([file]));
  void compressor.compress(file);
}

async function helpers(): Promise<void> {
  console.log(
    formatBytes(originalSizeGuess(64 * 1024 * 1024)),
    isFormatSupported('webp'),
    getBestFormat(),
    detectFormat(file),
    isHeicSource(file),
  );

  const previewBlob: Blob = await decodeHeic(file);
  console.log(previewBlob);
}

function originalSizeGuess(bytes: number): number {
  return bytes;
}

function poolSetup(): void {
  console.log(isPoolSupported(), defaultPoolSize());

  const poolOptions: PoolOptions = {
    size: 2,
    workerUrl: '/static/compresso-worker.js',
    heicToUrl: '/static/heic-to.wasm',
    maxQueueLength: 16,
    timeoutMs: 30_000,
  };
  const pool: Pool = createPool(poolOptions);
  console.log(pool);
}

async function batchAndWorkers(): Promise<File[]> {
  const pool = createPool();
  const uploads: File[] = [];

  const results = await pool.compressMany(
    [file, file],
    { quality: 0.8, format: 'webp' },
    (event: MultiProgressEvent) => {
      console.log(
        `${event.fileIndex + 1}/${event.totalFiles} — ${Math.round(event.overallProgress * 100)}%`,
      );
    },
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      uploads.push(result.value.file);
    } else {
      const kind: ErrorKind | undefined = result.reason.kind;
      console.error('One file failed:', result.reason, kind);
    }
  }

  const settled: CompressManyResult[] = results;
  console.log(settled);

  void (await pool.compress(file, { quality: 0.5 }));
  pool.cancel('job-id');

  const statistics: PoolStats = pool.stats();
  const { size, busy, queued, recoveries } = statistics;
  console.log(size, busy, queued, recoveries);

  pool.destroy();
  return uploads;
}

void compressOne();
void acceptedSources();
void compressManyFiles();
void reusableCompressor();
void helpers();
void poolSetup();
void batchAndWorkers();

// What the declarations must reject.
// @ts-expect-error 'gif' is not a documented output format
void compress(file, { format: 'gif' });

// @ts-expect-error quality must be a number
void compress(file, { quality: 'high' });

// @ts-expect-error unknown options are rejected
void compress(file, { maxWidthpx: 1920 });

// @ts-expect-error workerUrl must be a string or URL
void createPool({ workerUrl: 123 });
