import { describe, expect, it } from 'vitest';
import { calculateDimensions } from '../src/resize.js';

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
