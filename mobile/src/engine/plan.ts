import type { EncodeFormat, Engine, Outcome, Recipe, Source } from './types';

/**
 * The decisions, host-free. Mirrors compresso.js's `compress()`:
 *
 *   1. Never bigger — lossy output is capped at the source's own size, and when
 *      nothing in the target format fits, the source itself comes back.
 *   2. A size target is a ceiling, found by binary-searching quality (at most
 *      10 encodes, measured in memory; only the winner is written).
 *
 * and adds the one thing a phone needs that the library doesn't do yet: when a
 * target can't be met at any quality (a 48 MP photo into "under 200 KB"), step
 * the long edge down and try again instead of failing. That fallback is a
 * candidate for compresso.js 1.1.
 */

const MAX_QUALITY_STEPS = 10;
const EDGE_STEP = 0.8;
const MIN_LONG_EDGE = 480;
const MAX_EDGE_TRIES = 8;
const MAX_INPUT_PIXELS = 100_000_000;

export type RunOptions = {
  name: string;
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
};

export function resolveFormat(preferred: EncodeFormat[], writable: EncodeFormat[]): EncodeFormat {
  return preferred.find((f) => writable.includes(f)) ?? 'jpeg';
}

export async function compressOne(engine: Engine, source: Source, recipe: Recipe, options: RunOptions): Promise<Outcome> {
  const { name, signal, onProgress } = options;
  const format = resolveFormat(recipe.formats, engine.formats());
  const quality = clamp(recipe.quality);
  let maxLongEdge = recipe.maxLongEdge ?? undefined;

  for (let attempt = 0; ; attempt++) {
    throwIfAborted(signal);
    const prepared = await engine.prepare(source, { maxLongEdge, maxInputPixels: MAX_INPUT_PIXELS });
    try {
      const originalSize = prepared.originalSize || source.size || 0;
      const ceiling = Math.min(recipe.targetBytes ?? Infinity, originalSize || Infinity);
      const base = {
        originalSize,
        originalWidth: prepared.originalWidth,
        originalHeight: prepared.originalHeight,
        takenAt: prepared.takenAt ?? null,
      };
      const encode = (q: number) => engine.encode(prepared.handle, { format, quality: q, metadata: recipe.metadata });
      const report = (step: number) => onProgress?.(Math.min(0.95, (attempt * MAX_QUALITY_STEPS + step) / (MAX_QUALITY_STEPS * 2)));

      const fit = format === 'png'
        ? ((await encode(quality)) <= ceiling ? quality : null)
        : await findQuality(encode, quality, ceiling, signal, report);

      if (fit !== null) {
        const written = await engine.write(prepared.handle, { format, quality: fit, metadata: recipe.metadata, name });
        onProgress?.(1);
        return { ...written, ...base, kept: false, quality: format === 'png' ? null : fit, missedTarget: false };
      }

      // Nothing fits. If an explicit target is what's binding, make it smaller.
      const longEdge = Math.max(prepared.width, prepared.height);
      const targetBinding = recipe.targetBytes != null && recipe.targetBytes < (originalSize || Infinity);
      const nextEdge = Math.round(longEdge * EDGE_STEP);
      if (targetBinding && attempt < MAX_EDGE_TRIES && nextEdge >= MIN_LONG_EDGE) {
        maxLongEdge = nextEdge;
        continue;
      }

      // Never bigger: the source is the smallest honest answer.
      if (originalSize > 0 && !targetBinding) {
        const kept = await engine.copyOriginal(prepared.handle, name);
        onProgress?.(1);
        return { ...kept, ...base, kept: true, quality: null, missedTarget: false };
      }

      // The target is out of reach even at the smallest size: give the smallest
      // file we can make and say so, rather than nothing.
      const written = await engine.write(prepared.handle, { format, quality: 0.05, metadata: recipe.metadata, name });
      if (originalSize > 0 && written.size >= originalSize) {
        const kept = await engine.copyOriginal(prepared.handle, name);
        onProgress?.(1);
        return { ...kept, ...base, kept: true, quality: null, missedTarget: true };
      }
      onProgress?.(1);
      return { ...written, ...base, kept: false, quality: 0.05, missedTarget: true };
    } finally {
      engine.release(prepared.handle);
    }
  }
}

/**
 * Highest quality whose encode fits under `ceiling`, or null if even the
 * lowest searched quality doesn't. Starts at `quality` and only searches down,
 * exactly like the library's `shrinkToFit`.
 */
export async function findQuality(
  encode: (q: number) => Promise<number>,
  quality: number,
  ceiling: number,
  signal?: AbortSignal,
  report?: (step: number) => void,
): Promise<number | null> {
  if ((await encode(quality)) <= ceiling) return quality;
  let low = 0;
  let high = quality;
  let best: number | null = null;
  for (let i = 0; i < MAX_QUALITY_STEPS; i++) {
    throwIfAborted(signal);
    const mid = round((low + high) / 2);
    if ((await encode(mid)) <= ceiling) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
    report?.(i + 1);
    if (high - low < 0.01) break;
  }
  return best;
}

const clamp = (q: number) => Math.min(1, Math.max(0.01, q));
// Fewer distinct values = more cache hits in the engine between search and write.
const round = (q: number) => Math.round(q * 1000) / 1000;

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    const error = new Error('Compression cancelled');
    error.name = 'AbortError';
    throw error;
  }
}
