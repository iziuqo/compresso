export function calculateDimensions(
  originalWidth,
  originalHeight,
  maxWidth,
  maxHeight
) {
  let width = originalWidth;
  let height = originalHeight;

  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const aspectRatio = width / height;

  if (width > maxWidth) {
    width = maxWidth;
    height = Math.round(width / aspectRatio);
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspectRatio);
  }

  return { width: Math.max(1, width), height: Math.max(1, height) };
}

export function drawToCanvas(img, width, height, fillColor) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, width, height);
  }

  if (img.naturalWidth > width * 2) {
    return stepDownResize(img, width, height, fillColor);
  }

  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

function stepDownResize(img, targetWidth, targetHeight, fillColor) {
  let currentWidth = img.naturalWidth;
  let currentHeight = img.naturalHeight;

  let source = img;

  while (currentWidth > targetWidth * 2 || currentHeight > targetHeight * 2) {
    currentWidth = Math.max(Math.round(currentWidth / 2), targetWidth);
    currentHeight = Math.max(Math.round(currentHeight / 2), targetHeight);

    const step = document.createElement('canvas');
    step.width = currentWidth;
    step.height = currentHeight;
    const ctx = step.getContext('2d');
    ctx.drawImage(source, 0, 0, currentWidth, currentHeight);
    source = step;
  }

  const final = document.createElement('canvas');
  final.width = targetWidth;
  final.height = targetHeight;
  const ctx = final.getContext('2d');

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return final;
}
