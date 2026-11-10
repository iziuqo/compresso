/**
 * What the photo and video planners share about the host they drive: picking
 * an output it can write, and stopping when the caller cancels.
 */

/**
 * The first `preferred` output that `writable` holds; `fallback` otherwise,
 * since every host writes it (JPEG for photos, H.264 for video).
 */
export function resolveFormat(preferred, writable, fallback = 'jpeg') {
  return preferred.find((format) => writable.includes(format)) ?? fallback;
}

/**
 * Throws the standard cancellation error. React Native has no `DOMException`,
 * so there it is an `Error` with the same `name`, which is what callers check.
 */
export function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  const message = 'Compression aborted';
  throw typeof DOMException === 'function'
    ? new DOMException(message, 'AbortError')
    : Object.assign(new Error(message), { name: 'AbortError' });
}
