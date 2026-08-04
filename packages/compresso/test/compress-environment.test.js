import { describe, expect, it } from 'vitest';
import { compress } from '../src/compress.js';

// Deliberately no stubs, no mocks: this is what a plain Node.js process (or a
// framework's SSR pass) actually looks like — neither `Image` nor
// `OffscreenCanvas` exists as a global.
describe('compress() — non-browser environment guard', () => {
  it('throws a clear, actionable error instead of failing deep in the pipeline', async () => {
    await expect(compress(new Blob([new Uint8Array([1, 2, 3])]))).rejects.toThrow(
      /requires a browser or Web Worker environment/
    );
  });
});
