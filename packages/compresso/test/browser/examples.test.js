import { afterEach, describe, expect, it } from 'vitest';
import * as pool from '../../src/pool.js';
import batchExample from '../../../../examples/vanilla/batch.html?raw';
import { fixture } from './support/fixtures.js';

/**
 * The repository's examples are copied into apps as they are, so they are run
 * here as they ship. The batch example (examples/vanilla/batch.html) runs in an
 * iframe with its CDN import pointed at this suite's pool, so the source and
 * dist projects both drive it, and files reach its <input> the way a picker
 * delivers them.
 */

/** The batch example's one import, from the CDN. */
const CDN_IMPORT = /import \{ createPool \} from 'https:\/\/unpkg\.com\/compresso\.js@([^/]+)\/dist\/compresso\.pool\.mjs';/;
/** A file name that runs script if a page parses it as HTML. */
const HOSTILE_NAME = '<img src=x onerror="parent.__exampleInjected = true">.png';

let frame;
/** The pools the example made, destroyed after each test: their workers belong to this page, not the iframe. */
const pools = [];
afterEach(() => {
  frame?.remove();
  for (const made of pools.splice(0)) made.destroy();
  delete window.__exampleInjected;
  delete window.__compressoPool;
});

/** Opens the batch example with its CDN import swapped for this suite's pool; resolves with its window. */
async function openBatchExample() {
  window.__compressoPool = { createPool: (options) => pools[pools.push(pool.createPool(options)) - 1] };
  frame = document.createElement('iframe');
  frame.srcdoc = batchExample.replace(CDN_IMPORT, 'const { createPool } = parent.__compressoPool;');
  const loaded = new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
  document.body.append(frame);
  await loaded;
  return frame.contentWindow;
}

/** Puts `files` in the example's file input, as a picker does, and waits for its result cards. */
async function pick(page, files) {
  const input = page.document.getElementById('upload');
  const transfer = new page.DataTransfer();
  for (const file of files) transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new page.Event('change'));
  await expect.poll(() => page.document.querySelectorAll('#results > div').length, { timeout: 20_000 }).toBe(files.length);
  return [...page.document.querySelectorAll('#results > div')];
}

describe('examples/vanilla/batch.html', () => {
  it('imports the current major release from the CDN, not a pinned prerelease', () => {
    expect(batchExample).toMatch(CDN_IMPORT);
    expect(batchExample.match(CDN_IMPORT)[1]).toBe('1');
  });

  // Its own timeout: the browser suite runs on Vitest's default, and the example waits up to 20 s.
  it('shows a file name containing an HTML tag as plain text, for a compressed file and a failed one', { timeout: 60_000 }, async () => {
    const page = await openBatchExample();
    const photo = await fixture('sample.jpg', { name: HOSTILE_NAME });
    const broken = new File([new Uint8Array([1, 2, 3])], HOSTILE_NAME, { type: 'image/png' });

    const [done, failed] = await pick(page, [photo, broken]);

    // Workers take copies of the files. A main-thread pool would get the iframe's own File
    // objects, which aren't this page's Blobs, so name that first if it ever happens.
    expect(pools[0].stats().mode).toBe('workers');
    expect(done.className).toBe('result');
    expect(failed.className).toBe('result failed');
    for (const card of [done, failed]) {
      expect(card.children[card === done ? 1 : 0].textContent).toBe(HOSTILE_NAME);
      expect(card.querySelector('img[src="x"]')).toBeNull();
    }
    expect(done.querySelectorAll('img')).toHaveLength(1);
    expect(page.document.getElementById('progress').textContent).toBe('Done: 1 compressed, 1 failed.');
    expect(window.__exampleInjected).toBeUndefined();
  });
});
