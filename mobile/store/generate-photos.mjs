// Generates the sample photos for the store screenshots and the reel with the
// OpenAI Images API. Run once; the results are kept in store/photos so every
// later capture uses the same pictures. make-sample-photos.py turns them into
// full-size phone JPEGs.
//
//   OPENAI_API_KEY=... node store/generate-photos.mjs [name ...]
//
// No people, no text, no brands: the listing must never show a real person's
// photo or another company's mark.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'photos');
const MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2';
const LOOK = 'Shot on a recent flagship phone, natural colour, true-to-life light, crisp detail, '
  + 'shallow depth where natural, no people, no text, no logos, no watermark, no frame. '
  + 'It should look like the best photo in someone\'s camera roll, not an illustration or a render.';

// Order and orientation match the capture flow: every third one is portrait.
export const PHOTOS = [
  ['01-terrace', 'landscape', 'A sunlit terrace with a lemon tree in a terracotta pot, overlooking a calm turquoise sea and a pastel cliffside village at golden hour.'],
  ['02-cappuccino', 'portrait', 'A cappuccino with delicate latte art in a white ceramic cup on a marble café table by a window, soft morning light, a croissant slightly out of focus behind it.'],
  ['03-puppy', 'landscape', 'A golden retriever puppy lying on a checked picnic blanket in a summer meadow, looking at the camera, warm late-afternoon light.'],
  ['04-lake', 'landscape', 'A still alpine lake at sunrise with pine trees and snow-capped peaks reflected in the water, a wooden rowing boat at a small jetty.'],
  ['05-blossom', 'portrait', 'A branch of pink cherry blossom against a clear blue spring sky, petals backlit by the sun.'],
  ['06-market', 'landscape', 'A colourful fruit and vegetable stall at an outdoor morning market: crates of tomatoes, lemons, peaches and herbs, gentle sunlight.'],
];
// The largest 4:3 the API allows; make-sample-photos.py brings them to phone size.
const SIZE = { landscape: ['2048x1536'], portrait: ['1536x2048'] };

async function generate(prompt, size) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: `${prompt} ${LOOK}`, size, quality: 'high', output_format: 'png', n: 1 }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.message ?? res.statusText);
  return Buffer.from(body.data[0].b64_json, 'base64');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const only = process.argv.slice(2);
  mkdirSync(out, { recursive: true });
  await Promise.all(PHOTOS.filter(([name]) => !only.length || only.includes(name)).map(async ([name, shape, prompt]) => {
    for (const size of SIZE[shape]) {
      try {
        writeFileSync(join(out, `${name}.png`), await generate(prompt, size));
        console.log(name, size);
        return;
      } catch (e) {
        console.warn(name, size, e.message);
      }
    }
    throw new Error(`${name}: no size worked`);
  }));
}
