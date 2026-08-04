import { describe, expect, it } from 'vitest';
import { compress } from '../../src/compress.js';

/**
 * `_assets/` (the monorepo's personal-photo test corpus) is gitignored and
 * local-only — see LIB_V1_WORKERS_CONTEXT.md §1.5 and the plan's §7.2/§8.
 * `import.meta.glob` degrades to an empty match set when nothing matches,
 * rather than a build error, which is exactly the "skip cleanly if absent"
 * behavior this needs — a static `?url` import of a path that might not exist
 * would break the whole file instead.
 */
const jpgFiles = import.meta.glob('../../../../_assets/jpg/*.jpg', { query: '?url', import: 'default' });
const pngFiles = import.meta.glob('../../../../_assets/png/*.png', { query: '?url', import: 'default' });
const heicFiles = import.meta.glob('../../../../_assets/heic/*.{HEIC,heic}', { query: '?url', import: 'default' });
const exifFixture = import.meta.glob('../../../../_assets/jpg/exif-orient-6.jpg', { query: '?url', import: 'default' });

async function fileFromGlob(loader, name, type) {
  const url = await loader();
  const res = await fetch(url);
  return new File([await res.arrayBuffer()], name, { type });
}

describe.skipIf(Object.keys(jpgFiles).length === 0)('corpus — real JPEGs (_assets/jpg, local-only)', () => {
  for (const [path, loader] of Object.entries(jpgFiles)) {
    const name = path.split('/').pop();
    it(`compresses ${name} within the never-bigger guarantee`, async () => {
      const file = await fileFromGlob(loader, name, 'image/jpeg');
      const result = await compress(file, { format: 'auto' });
      expect(result.originalWidth).toBeGreaterThan(0);
      expect(result.originalHeight).toBeGreaterThan(0);
      expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
    });
  }
});

describe.skipIf(Object.keys(pngFiles).length === 0)('corpus — real PNGs (_assets/png, local-only)', () => {
  for (const [path, loader] of Object.entries(pngFiles)) {
    const name = path.split('/').pop();
    it(`compresses ${name} within the never-bigger guarantee`, async () => {
      const file = await fileFromGlob(loader, name, 'image/png');
      const result = await compress(file, { format: 'auto' }); // auto never picks 'png', so this stays in force
      expect(result.originalWidth).toBeGreaterThan(0);
      expect(result.originalHeight).toBeGreaterThan(0);
      expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
    });
  }
});

describe.skipIf(Object.keys(heicFiles).length === 0)('corpus — real HEIC photos (_assets/heic, local-only)', () => {
  for (const [path, loader] of Object.entries(heicFiles)) {
    const name = path.split('/').pop();
    it(`decodes and compresses ${name}`, async () => {
      const file = await fileFromGlob(loader, name, ''); // real iPhone HEIC exports are typically untyped
      const result = await compress(file, { format: 'auto' });
      expect(result.originalWidth).toBeGreaterThan(0);
      expect(result.originalHeight).toBeGreaterThan(0);
      expect(result.compressedSize).toBeGreaterThan(0);
    });
  }
});

describe.skipIf(Object.keys(exifFixture).length === 0)('corpus — EXIF orientation (_assets/jpg/exif-orient-6.jpg, local-only)', () => {
  it('applies the stored rotation and decodes upright', async () => {
    // Documented in PWA_PLAN.md §14: stored 1280x768, Orientation 6 — the
    // decoded, displayed result must come out portrait (768x1280), not the
    // stored landscape dimensions. A sideways photo is the correctness
    // landmine this fixture exists to catch.
    const [loader] = Object.values(exifFixture);
    const file = await fileFromGlob(loader, 'exif-orient-6.jpg', 'image/jpeg');
    const result = await compress(file, { format: 'auto' });
    expect(result.originalWidth).toBe(768);
    expect(result.originalHeight).toBe(1280);
  });
});
