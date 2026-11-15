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
 * Every engine gives a real canvas this big (px): 4096 × 4096, iOS Safari's
 * long-standing limit. Bigger canvases are checked (CMP-03).
 */
const TRUSTED_PIXELS = 16_777_216;

/**
 * Whether the browser really gave this canvas pixels. Past its limit, iOS
 * Safari 17 returns a canvas that draws nothing, reads back empty and encodes
 * to nothing, without an error (24 MP on an iPhone 15). So a canvas past
 * TRUSTED_PIXELS paints one white pixel in its far corner and reads it back.
 * No context at all, or a read-back that throws, means it didn't.
 */
function accepted({ ctx }, width, height) {
  if (!ctx) return false;
  if (width * height <= TRUSTED_PIXELS) return true;
  ctx.fillStyle = '#fff';
  ctx.fillRect(width - 1, height - 1, 1, 1);
  try {
    const [red, , , alpha] = ctx.getImageData(width - 1, height - 1, 1, 1).data;
    return red > 127 && alpha > 127;
  } catch {
    // An engine that throws on a canvas it couldn't back.
    return false;
  } finally {
    ctx.clearRect(width - 1, height - 1, 1, 1);
  }
}

/**
 * Draw `image` (with known source dimensions) into a target canvas of `dstWidth`×
 * `dstHeight`, or return `null` if the browser can't hold a canvas that big.
 * For large downscales it steps down by halves first — higher quality than a
 * single large draw. `image` is any canvas-drawable (an HTMLImageElement today,
 * an ImageBitmap in a worker); source dimensions are passed in, never read off
 * the object.
 */
export function renderToCanvas(image, srcWidth, srcHeight, dstWidth, dstHeight, fillColor) {
  let src = image;
  let curWidth = srcWidth;
  let curHeight = srcHeight;

  while (curWidth > dstWidth * 2 || curHeight > dstHeight * 2) {
    curWidth = Math.max(Math.round(curWidth / 2), dstWidth);
    curHeight = Math.max(Math.round(curHeight / 2), dstHeight);
    const step = createCanvas(curWidth, curHeight);
    // A step the browser can't hold: draw the rest in one go instead.
    if (!accepted(step, curWidth, curHeight)) {
      free(step.canvas);
      break;
    }
    step.ctx.drawImage(src, 0, 0, curWidth, curHeight);
    free(src);
    src = step.canvas;
  }

  const target = createCanvas(dstWidth, dstHeight);
  if (!accepted(target, dstWidth, dstHeight)) {
    free(src);
    free(target.canvas);
    return null;
  }
  const { canvas, ctx } = target;
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, dstWidth, dstHeight);
  }
  ctx.drawImage(src, 0, 0, dstWidth, dstHeight);
  free(src);
  return canvas;

  // A halving step's pixels are freed as soon as the next one is drawn:
  // Safari caps canvas memory per page. The source image is never touched.
  function free(step) {
    if (step !== image) step.width = step.height = 0;
  }
}
