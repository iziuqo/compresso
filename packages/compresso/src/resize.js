import { createCanvas } from './platform.js';

/**
 * Fit `width`×`height` within `maxWidth`×`maxHeight`, preserving aspect ratio and
 * never upscaling. A single scale factor handles both axes uniformly.
 */
export function calculateDimensions(width, height, maxWidth, maxHeight) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Draw `image` (with known source dimensions) into a target canvas of `dstWidth`×
 * `dstHeight`. For large downscales it steps down by halves first — higher quality
 * than a single large draw. `image` is any canvas-drawable (an HTMLImageElement
 * today, an ImageBitmap in a worker); source dimensions are passed in, never read
 * off the object.
 */
export function renderToCanvas(image, srcWidth, srcHeight, dstWidth, dstHeight, fillColor) {
  let src = image;
  let curWidth = srcWidth;
  let curHeight = srcHeight;

  while (curWidth > dstWidth * 2 || curHeight > dstHeight * 2) {
    curWidth = Math.max(Math.round(curWidth / 2), dstWidth);
    curHeight = Math.max(Math.round(curHeight / 2), dstHeight);
    const step = createCanvas(curWidth, curHeight);
    step.ctx.drawImage(src, 0, 0, curWidth, curHeight);
    src = step.canvas;
  }

  const { canvas, ctx } = createCanvas(dstWidth, dstHeight);
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, dstWidth, dstHeight);
  }
  ctx.drawImage(src, 0, 0, dstWidth, dstHeight);
  return canvas;
}
