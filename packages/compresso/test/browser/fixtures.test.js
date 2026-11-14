import { describe, expect, it } from 'vitest';
import { compress } from '../../src/compress.js';
import { FIXTURES, fixture, generatedImage } from './support/fixtures.js';
import { decodeImage, expectHonestResult } from './support/honest.js';
import { itTracked } from './support/known-bugs.js';

/** Every committed fixture except the pixel flood, which must be refused (below). */
const DECODABLE = Object.keys(FIXTURES).filter((file) => file !== 'pixel-flood.png');

/** The quadrant colours every orientation fixture displays: TL red, TR green, BL blue, BR white. */
const UPRIGHT = [[220, 20, 20], [20, 200, 20], [20, 20, 220], [240, 240, 240]];

/** RGB at each corner's centre-ish pixel, sampled from the decoded output. */
async function corners(blob, format) {
  const img = await decodeImage(blob, format);
  const { naturalWidth: w, naturalHeight: h } = img;
  const ctx = Object.assign(document.createElement('canvas'), { width: w, height: h }).getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return [[w / 4, h / 4], [(3 * w) / 4, h / 4], [w / 4, (3 * h) / 4], [(3 * w) / 4, (3 * h) / 4]]
    .map(([x, y]) => Array.from(ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data.slice(0, 3)));
}

describe('the committed corpus through compress(), every engine', () => {
  for (const file of DECODABLE) {
    itTracked(`corpus/${file}`, `${file} (${FIXTURES[file].stresses}) gives an honest result`, async () => {
      const source = await fixture(file);
      const result = await compress(source);
      expect([result.originalWidth, result.originalHeight]).toEqual([FIXTURES[file].width, FIXTURES[file].height]);
      await expectHonestResult(result, source);
    });
  }

  for (const file of DECODABLE.filter((name) => FIXTURES[name].orientation)) {
    it(`${file} comes out upright, not rotated or mirrored`, async () => {
      const result = await compress(await fixture(file));
      expect([result.width, result.height]).toEqual([48, 32]);
      for (const [i, rgb] of (await corners(result.blob, result.format)).entries()) {
        rgb.forEach((channel, c) => expect(Math.abs(channel - UPRIGHT[i][c]), `corner ${i}`).toBeLessThan(48));
      }
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
