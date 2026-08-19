/**
 * The grain. One inline SVG turbulence, as a data URI — no network request, no
 * image asset, ~400 bytes. Fixed to the viewport so it reads as the texture of
 * the paper the interface is printed on, not as a texture on each element.
 *
 * This single layer does more for "made by a person" than any amount of
 * component polish. It is also the first thing to check if the app ever starts
 * to feel synthetic.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140">
<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch"/>
<feColorMatrix type="saturate" values="0"/></filter>
<rect width="140" height="140" filter="url(#g)" opacity="0.55"/></svg>`;

export const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
