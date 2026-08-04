import { compress, __setCapabilities } from './index.js';

/**
 * One compression worker. It holds no state beyond in-flight aborts — the
 * pool (pool.js) owns scheduling, sizing, and crash/timeout recovery.
 * Capabilities are injected via the 'run' message rather than probed here:
 * the main thread already resolved them once, and re-probing in every
 * worker would cost an encode round-trip per worker for an answer already
 * known.
 *
 * What this file deliberately does NOT handle: its own crash or hang — code
 * running inside a worker cannot recover from that worker dying by
 * construction. The pool watches for both from the outside instead (see
 * pool.js's `onerror`/`onmessageerror`/timeout handling).
 */

const aborts = new Map();

function post(message) {
  self.postMessage(message);
}

self.onmessage = async (event) => {
  const msg = event.data;

  if (msg.type === 'abort') {
    aborts.get(msg.id)?.abort();
    aborts.delete(msg.id);
    return;
  }

  const { id, file, params, caps } = msg;
  __setCapabilities(caps);

  const controller = new AbortController();
  aborts.set(id, controller);

  try {
    const result = await compress(file, {
      ...params,
      signal: controller.signal,
      onProgress: ({ progress, stage }) => post({ type: 'progress', id, progress, stage }),
    });
    // `url` is a main-thread object URL, meaningless off-thread; `file` and
    // `blob` are the same bytes — send the blob once and let the pool wrap
    // it back into a `CompressResult` on the main thread.
    post({
      type: 'done',
      id,
      result: {
        blob: result.blob,
        width: result.width,
        height: result.height,
        originalWidth: result.originalWidth,
        originalHeight: result.originalHeight,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        savings: result.savings,
        format: result.format,
        mimeType: result.mimeType,
      },
    });
  } catch (err) {
    // The pool already settled its side of the promise locally the moment it
    // called cancel() — see pool.js's `cancel`. Nothing to report back.
    if (err?.name === 'AbortError') return;
    const message = err instanceof Error ? err.message : String(err);
    // Prefer a kind the pipeline already classified (e.g. 'too-large' from
    // the resource-exhaustion guard) over guessing from the message text —
    // the text heuristic below only covers plain decode failures that never
    // got a `.kind` attached in the first place.
    const kind = err?.kind ?? (/load|decode|image/i.test(message) ? 'decode' : 'generic');
    post({ type: 'error', id, message, kind });
  } finally {
    aborts.delete(id);
  }
};
