/**
 * Fails clearly, once, up front, rather than deep inside the pipeline on a
 * confusing "X is not a function", when called somewhere that is neither a
 * browser main thread nor a Web Worker, such as Node.js or a framework's SSR
 * pass. Guard call sites with `typeof window !== 'undefined'` instead.
 */
export function assertBrowserEnvironment() {
  if (typeof Image === 'undefined' && typeof OffscreenCanvas === 'undefined') {
    throw new Error('compresso.js requires a browser or Web Worker environment, not Node.js or server-side rendering');
  }
}
