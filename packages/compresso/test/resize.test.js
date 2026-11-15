import { describe, expect, it, vi } from 'vitest';
import { calculateDimensions, renderToCanvas } from '../src/resize.js';
import { createCanvas } from '../src/platform.js';

// A browser whose canvases past `limit` pixels draw nothing and read back
// empty, like iOS Safari 17 past 16.7 MP (CMP-03).
let limit = Infinity;
vi.mock('../src/platform.js', () => ({
  createCanvas: vi.fn((width, height) => {
    const real = width * height <= limit;
    const canvas = { width, height };
    const ctx = {
      canvas,
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: real ? [255, 255, 255, 255] : [0, 0, 0, 0] })),
    };
    return { canvas, ctx };
  }),
}));
const made = () => createCanvas.mock.results.map(({ value }) => value);

describe('calculateDimensions', () => {
  it('leaves dimensions unchanged when unconstrained', () => {
    expect(calculateDimensions(1920, 1080, Infinity, Infinity)).toEqual({ width: 1920, height: 1080 });
  });

  it('scales both axes proportionally when only width is constrained', () => {
    expect(calculateDimensions(2000, 1000, 1000, Infinity)).toEqual({ width: 1000, height: 500 });
  });

  it('scales both axes proportionally when only height is constrained', () => {
    expect(calculateDimensions(2000, 1000, Infinity, 250)).toEqual({ width: 500, height: 250 });
  });

  it('picks the more restrictive axis when both are constrained', () => {
    // Width alone would allow 1000x500; height alone would allow 200x100.
    // The smaller (more restrictive) scale factor wins on both axes.
    expect(calculateDimensions(2000, 1000, 1000, 100)).toEqual({ width: 200, height: 100 });
  });

  it('never upscales', () => {
    expect(calculateDimensions(100, 50, 10000, 10000)).toEqual({ width: 100, height: 50 });
  });

  it('rounds to at least 1px on either axis', () => {
    const { width, height } = calculateDimensions(10000, 1, 1, Infinity);
    expect(width).toBe(1);
    expect(height).toBeGreaterThanOrEqual(1);
  });

  it('handles a square image identically on both axes', () => {
    expect(calculateDimensions(500, 500, 100, Infinity)).toEqual({ width: 100, height: 100 });
  });
});

describe('renderToCanvas: canvases the browser really accepts (CMP-03)', () => {
  const image = {};

  it('never reads back a canvas of 16.7 MP or less', () => {
    limit = Infinity;
    createCanvas.mockClear();
    expect(renderToCanvas(image, 4096, 4096, 4096, 4096)).not.toBeNull();
    expect(made()[0].ctx.getImageData).not.toHaveBeenCalled();
  });

  it('returns null for a target canvas the browser can\'t hold', () => {
    limit = 16_777_216;
    createCanvas.mockClear();
    expect(renderToCanvas(image, 6000, 4000, 6000, 4000)).toBeNull();
    expect(made()[0].canvas.width, 'freed at once').toBe(0);
  });

  it('returns null when the browser gives no context at all', () => {
    createCanvas.mockImplementationOnce((width, height) => ({ canvas: { width, height }, ctx: null }));
    expect(renderToCanvas(image, 100, 100, 100, 100)).toBeNull();
  });

  it('skips a halving step the browser refuses and draws the rest in one go', () => {
    limit = 16_777_216;
    createCanvas.mockClear();
    // 16000 × 9000 to 2000 × 1125: the first halving step is 8000 × 4500, 36 MP.
    const canvas = renderToCanvas(image, 16000, 9000, 2000, 1125);
    expect(canvas).toMatchObject({ width: 2000, height: 1125 });
    const [step, target] = made();
    expect(step.canvas.width, 'the refused step is freed').toBe(0);
    expect(step.ctx.drawImage).not.toHaveBeenCalled();
    expect(target.ctx.drawImage).toHaveBeenCalledWith(image, 0, 0, 2000, 1125);
  });
});
