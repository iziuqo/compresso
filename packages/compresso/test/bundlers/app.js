/**
 * The app every bundler builds: what a typical user writes. It exposes one
 * async check per row of the support matrix on `window.checks`; the test
 * runs each in Chromium and records "ok" or the reason it failed.
 */
import { compress } from 'compresso.js';
import { createPool } from 'compresso.js/pool';

async function fixture(name, type) {
  const response = await fetch(`/fixtures/${name}`);
  if (!response.ok) throw new Error(`fixture ${name}: HTTP ${response.status}`);
  return new File([await response.blob()], name, { type });
}

const JPEG = () => fixture('photo.jpg', 'image/jpeg');
const HEIC = () => fixture('photo.heic', 'image/heic');

/** Throws unless `result` is a smaller JPEG of the expected width. */
function expectJpeg(result, width) {
  if (result.format !== 'jpeg' || result.width !== width || !(result.compressedSize < result.originalSize)) {
    throw new Error(`unexpected result: ${result.format} ${result.width} px, ${result.compressedSize} of ${result.originalSize} bytes`);
  }
}

/** Runs one job through a two-worker pool; fails unless real workers did it. */
async function throughPool(source) {
  const pool = createPool({ size: 2 });
  try {
    const result = await pool.compress(await source(), { format: 'jpeg', maxWidth: 800 });
    const { size } = pool.stats();
    if (size !== 2) throw new Error(`ran without real workers (pool size ${size})`);
    return result;
  } finally {
    pool.destroy();
  }
}

window.checks = {
  mainJpeg: async () => expectJpeg(await compress(await JPEG(), { format: 'jpeg', maxWidth: 800 }), 800),
  poolJpeg: async () => expectJpeg(await throughPool(JPEG), 800),
  poolHeic: async () => expectJpeg(await throughPool(HEIC), 800),
  mainHeic: async () => expectJpeg(await compress(await HEIC(), { format: 'jpeg', maxWidth: 800 }), 800),
};
