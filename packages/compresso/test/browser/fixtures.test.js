import { describe, expect, it } from 'vitest';
import { compress } from '../../src/compress.js';
import { FIXTURES, fixture, generatedImage } from './support/fixtures.js';
import { expectHonestResult } from './support/honest.js';
import { itTracked } from './support/known-bugs.js';

/** Every committed fixture except the pixel flood, which must be refused (below). */
const DECODABLE = Object.keys(FIXTURES).filter((file) => file !== 'pixel-flood.png');

describe('the committed corpus through compress(), every engine', () => {
  for (const file of DECODABLE) {
    itTracked(`corpus/${file}`, `${file} (${FIXTURES[file].stresses}) gives an honest result`, async () => {
      const source = await fixture(file);
      await expectHonestResult(await compress(source), source);
    });
  }

  it('pixel-flood.png is refused before decode', async () => {
    await expect(compress(await fixture('pixel-flood.png'))).rejects.toMatchObject({ kind: 'too-large' });
  });
});

describe('generated large images', () => {
  it('draws the requested size, so large cases need no committed bytes', async () => {
    const image = await generatedImage(4000, 3000);
    const result = await compress(image);
    expect([result.originalWidth, result.originalHeight]).toEqual([4000, 3000]);
    await expectHonestResult(result, image);
  });
});
