/**
 * The press (wave three): the app icon's two plates as a physical press in a
 * true black studio, and a photo lying between them on a block of glass
 * whose height is its file size. Pressed, the block is exactly as thick as
 * the gap in the logo, so the closed press seen dead front IS the icon, with
 * the photo's colours in the gap.
 *
 * The scene is a puppet: `draw(pose)` renders one frame from a pose, and
 * every Short choreographs its own poses (ritual.ts has the shared moves).
 * Nothing in here keeps time, so any frame renders on its own, in any order,
 * in any of Remotion's tabs.
 *
 * Units are the logo's (website/public/logo.svg) divided by 100. The photo
 * is the only colour and the only coloured light; red means one thing,
 * over the limit.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/** The icon's plates: wide base, narrow tip, height; and the gap between the tips. */
export const PLATE = { wide: 3.04, tip: 1.52, tall: 1.08 };
export const GAP = 0.4;
/** The glass duct's length, from its mouth to its far end; the prints land past it, on a stack of their own. */
export const TUBE = 3.6;
/** A 4:3 photo lies on the tip face. */
export const DEPTH = PLATE.tip * 0.75;
/** The vertical field of view: long, so the closed press reads flat as the icon. */
const FOV = 17;
/** How far the camera stands for the photo, lying or standing, to fill the frame's width. */
export const NEAR = 11.6;
/** Where the stack's gauge stands: just right of the photo, on its front edge. */
const RULER = PLATE.tip / 2 + 0.12;

export const RED = '#FF6369';

/** One photo in the stack: the original and the file the app wrote (URLs), and their sizes in bytes. */
export type Band = { before: string; after: string; from: number; to: number };

export type PressSetup = {
  /** The photos, bottom to top: each is a band of glass as tall as its own file. */
  photos: Band[];
  /** The size the gate allows, in bytes: for all the photos together, or with `each`, for every photo on its own. */
  limit: number;
  each?: boolean;
  /**
   * The gate, left of the press, its opening exactly as tall as the limit: a
   * slot in a white wall, the mouth of an envelope lying on a plinth, or a
   * chat bubble drawn in one hairline, or the mouth of a glass duct that
   * carries the prints one by one to a landing at its far end.
   */
  gate?: 'slot' | 'envelope' | 'bubble' | 'tube';
  /** A clear glass dome over the whole studio, this many units in radius: the room is sealed, nothing leaves it. */
  dome?: number;
};

export type Pose = {
  /** Camera on an orbit round (tx, ty, 0): azimuth and elevation in radians, distance, and a jolt. */
  cam: { az: number; el: number; dist: number; tx?: number; ty: number; shake?: number };
  /**
   * The stack: height, centre, tilt towards the camera (π/2 faces it), whether
   * the photos are the app's files yet, and how far its bands fan out like a
   * hand of cards (0 = stacked).
   */
  stack: { h: number; x?: number; y: number; tilt?: number; after?: boolean; fan?: number; shift?: [number, number][]; squeeze?: number[] };
  /** The upper plate's tip, above the lower plate's tip. */
  upper: number;
  /** Studio light, 0 (only the photo glows) to 1. */
  studio: number;
  /** Opacity of the gauge's ticks; how far the gate's wall has risen out of the floor (1 = up). */
  gauge: number;
  gate?: number;
  /** The slot's edges flaring, 0 to 1, as the stack hits the wall. */
  glint?: number;
  /** The size now, in bytes: the limit turns white once it is under. */
  bytes: number;
  /** The slot's glow, 0 to 1, as the photo's light pours through it. */
  pour?: number;
  /** A print in flight through the duct: which band, where along x, and how brightly it lights the glass with its colours. */
  courier?: { band: number; x: number; k: number };
  /** The envelope's flap, 0 (open) to 1 (sealed). */
  seal?: number;
  /** The dome, 0 (lifted out of sight) to 1 (sealed on the floor), and how far the photo's colours fill its glass. */
  dome?: { down: number; fill: number };
  /** The air the press squeezes out: seconds since the plate touched, and how long the squeeze lasts. */
  air?: { age: number; length: number };
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/** Draws `src` centre-cropped to 4:3 on a canvas, `w` wide. */
async function crop43(src: string, w = 2048) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const want = 4 / 3, have = img.width / img.height;
  const cw = have > want ? img.height * want : img.width, ch = have > want ? img.height : img.width / want;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = w * 0.75;
  const c = canvas.getContext('2d', { willReadFrequently: true })!;
  c.drawImage(img, (img.width - cw) / 2, (img.height - ch) / 2, cw, ch, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const texture = (canvas: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
};

/** A photo as its colours only: drawn 24 px wide, so the texture's filtering blurs it into soft light. */
const colours = (canvas: HTMLCanvasElement) => {
  const small = document.createElement('canvas');
  small.width = 24; small.height = 18;
  small.getContext('2d')!.drawImage(canvas, 0, 0, small.width, small.height);
  return texture(small);
};

/**
 * One side of the stack. The stack is glass under a lit photo, so each side
 * carries the photo's colours along that axis: every column (front, back) or
 * row (left, right) gives its most vivid colour, pulled straight down. The
 * sheets are fine lines, and the light falls off away from the photo.
 */
function sideTexture(photo: HTMLCanvasElement, edge: 'left' | 'right' | 'top' | 'bottom') {
  const pw = photo.width, ph = photo.height;
  const px = photo.getContext('2d')!.getImageData(0, 0, pw, ph).data;
  const across = edge === 'left' || edge === 'right';
  const along = across ? ph : pw, depth = across ? pw : ph;
  const raw = document.createElement('canvas'); raw.width = 1024; raw.height = 2048;
  const c = raw.getContext('2d')!;
  for (let i = 0; i < 1024; i++) {
    // Seen from outside, the front and left faces run with the photo, the right and back faces against it.
    const k = edge === 'right' || edge === 'top' ? 1 - i / 1023 : i / 1023;
    const p = Math.min(along - 1, Math.floor(k * along));
    let r = 0, g = 0, b = 0, n = 0;
    for (let j = 0; j < depth; j += 4) {
      const o = (across ? p * pw + j : j * pw + p) * 4;
      const R = px[o], G = px[o + 1], B = px[o + 2];
      const max = Math.max(R, G, B), min = Math.min(R, G, B);
      const w = ((max - min) / (max + 1)) ** 2 * (max / 255) + 0.004; // vivid, bright pixels speak loudest
      r += R * w; g += G * w; b += B * w; n += w;
    }
    c.fillStyle = `rgb(${r / n},${g / n},${b / n})`;
    c.fillRect(i, 0, 1, 2048);
  }
  // Soften across, so the streaks read as light in glass, not as a barcode.
  const soft = document.createElement('canvas'); soft.width = 1024; soft.height = 2048;
  const s = soft.getContext('2d')!;
  s.filter = 'blur(6px) saturate(1.35) brightness(1.12)'; s.drawImage(raw, 0, 0); s.filter = 'none';
  const fall = s.createLinearGradient(0, 0, 0, 2048);
  fall.addColorStop(0, 'rgba(0,0,0,0)'); fall.addColorStop(0.55, 'rgba(0,0,0,0.14)'); fall.addColorStop(1, 'rgba(0,0,0,0.4)');
  s.fillStyle = fall; s.fillRect(0, 0, 1024, 2048);
  s.fillStyle = 'rgba(0,0,0,0.2)';
  for (let y = 0; y < 2048; y += 8) s.fillRect(0, y, 1024, 2);
  s.fillStyle = 'rgba(255,255,255,0.14)';
  for (let y = 3; y < 2048; y += 8) s.fillRect(0, y, 1024, 1);
  return texture(soft);
}

/** The photo's average colour over a region, brightened: the light it throws. */
function average(photo: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  const k = photo.width / 1600;
  const d = photo.getContext('2d')!.getImageData(x * k, y * k, w * k, h * k).data;
  let r = 0, g = 0, b = 0;
  const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const c = new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return c.setHSL(hsl.h, Math.min(1, hsl.s * 1.5 + 0.1), Math.max(0.5, hsl.l));
}

/** One of the logo's trapezoids, extruded to the photo's depth with a fine bevel. */
function plateGeometry() {
  const b = 0.014, s = new THREE.Shape();
  const w = PLATE.wide / 2 - b, t = PLATE.tip / 2 - b, h = PLATE.tall - b;
  s.moveTo(-w, b); s.lineTo(w, b); s.lineTo(t, h); s.lineTo(-t, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: DEPTH - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 1 });
  g.translate(0, 0, -(DEPTH - 2 * b) / 2);
  return g;
}

/** A soft round dot, for the air. */
function dot() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!, g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/** A hairline bar, `w` long along x. */
const hairline = (w: number, color: string) =>
  new THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>(new THREE.BoxGeometry(w, 0.016, 0.016), new THREE.MeshBasicMaterial({ color, transparent: true }));

/**
 * Builds the press on `canvas`, whose backing store is `width` × `height`
 * device pixels for a frame `aspect` wide per unit of height.
 */
export async function createPress(canvas: HTMLCanvasElement, setup: PressSetup) {
  const { width, height } = canvas;
  const prints = await Promise.all(setup.photos.map(async (b) => ({ ...b, before: await crop43(b.before), after: await crop43(b.after) })));
  const sum = (k: 'from' | 'to') => setup.photos.reduce((n, b) => n + b[k], 0);
  const total = { from: sum('from'), to: sum('to') };
  // Height is file size, to scale: the pressed stack is the logo's gap.
  const perByte = GAP / total.to;
  /** The stack's height for a size in bytes. */
  const heightOf = (bytes: number) => bytes * perByte;
  /** How far a stack `h` tall is through the press: 0 heavy, 1 pressed. Each band is pressed by the same share. */
  const pressed = (h: number) => (heightOf(total.from) - h) / (heightOf(total.from) - GAP);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000');
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(FOV, width / height, 1, 300);

  // The stack: a band of glass per photo, each with its photo on top and its colours down its sides.
  // The group is the whole stack (its centre, tilt); a band sits inside it on a pivot at its front edge, for the fan.
  const glow = (map: THREE.Texture, k = 1.7) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(k, k, k) });
  const stack = new THREE.Group();
  const bands = prints.map((print) => {
    const faces = { before: texture(print.before), after: texture(print.after) };
    const top = glow(faces.before, 1);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(PLATE.tip, 1, DEPTH), [
      glow(sideTexture(print.before, 'right')), glow(sideTexture(print.before, 'left')), top,
      new THREE.MeshBasicMaterial({ color: '#000' }), glow(sideTexture(print.before, 'bottom')), glow(sideTexture(print.before, 'top')),
    ]);
    mesh.position.z = -DEPTH / 2;
    const pivot = new THREE.Group();
    pivot.add(mesh);
    stack.add(pivot);
    return { ...print, faces, top, mesh, pivot, colour: average(print.before, 0, 0, 1600, 1200) };
  });
  scene.add(stack);
  // The light the stack throws is the top photo's.
  const lit = prints[prints.length - 1].before;
  const tint = { all: average(lit, 0, 0, 1600, 1200), left: average(lit, 0, 300, 500, 900), right: average(lit, 1100, 300, 500, 900), front: average(lit, 300, 800, 1000, 400) };

  // The plates: matte white ceramic. The upper one is the lower one flipped.
  const ceramic = new THREE.MeshPhysicalMaterial({ color: '#f6f5f2', roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const lower = new THREE.Mesh(plateGeometry(), ceramic);
  const upper = new THREE.Mesh(plateGeometry(), ceramic.clone());
  upper.scale.y = -1;
  (upper.material as THREE.Material).side = THREE.DoubleSide; // the flip turns its faces inside out
  for (const plate of [lower, upper]) { plate.castShadow = plate.receiveShadow = true; scene.add(plate); }

  // The floor: black acrylic whose reflection fades with distance from the press.
  const mirror = new Reflector(new THREE.PlaneGeometry(80, 80), { textureWidth: width / 2, textureHeight: height / 2, color: 0x1c1c1c, clipBias: 0.003 });
  mirror.rotation.x = -Math.PI / 2;
  scene.add(mirror);
  const fadeCanvas = document.createElement('canvas'); fadeCanvas.width = fadeCanvas.height = 512;
  const fc = fadeCanvas.getContext('2d')!, rg = fc.createRadialGradient(256, 256, 10, 256, 256, 256);
  rg.addColorStop(0, 'rgba(0,0,0,0.955)'); rg.addColorStop(0.25, 'rgba(0,0,0,0.975)'); rg.addColorStop(0.6, 'rgba(0,0,0,1)');
  fc.fillStyle = rg; fc.fillRect(0, 0, 512, 512);
  const fade = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fadeCanvas), transparent: true, depthWrite: false }));
  fade.rotation.x = -Math.PI / 2; fade.position.y = 0.002;
  const far = new THREE.Mesh(new THREE.RingGeometry(12.9, 120, 64), new THREE.MeshBasicMaterial({ color: '#000' }));
  far.rotation.x = -Math.PI / 2; far.position.y = 0.003;
  scene.add(fade, far);

  // Light: a soft key and a cool rim; the photo is a light of its own.
  const key = new THREE.DirectionalLight('#ffffff', 1.8);
  key.position.set(-4.5, 9, 10); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 9; key.shadow.blurSamples = 20; key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -5, right: 4, top: 9, bottom: -1, near: 1, far: 30 });
  const rim = new THREE.DirectionalLight('#dfe6ff', 0.55); rim.position.set(6, 5, -8);
  // A soft fill from the right, so the gate's face towards the press is lit as the plates are.
  const fill = new THREE.DirectionalLight('#ffffff', 0); fill.position.set(8, 5, 6);
  const face = new THREE.RectAreaLight(tint.all, 0, PLATE.tip, DEPTH); face.rotation.x = Math.PI / 2;
  const spill = [tint.left, tint.right, tint.front].map((c) => new THREE.PointLight(c, 0, 6, 2));
  // A print in flight lights the duct's glass with its own colours.
  const courier = new THREE.PointLight('#ffffff', 0, 2.4, 2);
  scene.add(key, rim, fill, face, ...spill, courier);

  // The air the press squeezes out at the seam: seeded, so every render repeats.
  const rand = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const AIR = 260;
  const air = Array.from({ length: AIR }, () => ({ side: rand() < 0.5 ? -1 : 1, when: rand() ** 2.2, z: (rand() - 0.5) * DEPTH * 0.92, vx: 1.6 + rand() * 3.4, vy: (rand() - 0.5) * 0.9, vz: (rand() - 0.5) * 1.2, life: 0.28 + rand() * 0.5 }));
  const airGeo = new THREE.BufferGeometry();
  airGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(AIR * 3), 3));
  airGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(AIR * 3), 3));
  const airPoints = new THREE.Points(airGeo, new THREE.PointsMaterial({ size: 0.13, map: dot(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  airPoints.frustumCulled = false;
  scene.add(airPoints);

  // The gauge, right of the stack: a tick per megabyte, every other one long.
  const gauge = new THREE.Group();
  const ticks: { bar: ReturnType<typeof hairline>; opacity: number }[] = [];
  for (let mb = 0; mb <= Math.floor(total.from / 1e6); mb++) {
    const long = mb % 2 === 0, w = long ? 0.24 : 0.13;
    const bar = hairline(w, '#fff');
    bar.position.set(RULER + w / 2, PLATE.tall + heightOf(mb * 1e6), DEPTH / 2);
    gauge.add(bar);
    ticks.push({ bar, opacity: long ? 0.9 : 0.5 });
  }
  // The gate, left of the press, its opening exactly as tall as the limit and
  // edged red until the stack is under. The photo's light waits behind it.
  const limitY = PLATE.tall + heightOf(setup.limit);
  const gateX = -2.7;
  const slot = { bottom: PLATE.tall, top: limitY, half: DEPTH / 2 + 0.07 };
  /** Where the prints land beyond a duct: the centre of their new stack, two prints' widths clear of its far end, room for each one's arc. */
  const landX = gateX - TUBE - PLATE.tip * 2.5;
  const gate = new THREE.Group();
  const edges = new THREE.MeshBasicMaterial({ color: RED });
  const light = new THREE.MeshBasicMaterial({ color: tint.all, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const flap = new THREE.Group();
  const GATE_H = 2.9; // how far the gate sinks into the floor
  if (setup.gate) {
    const matte = new THREE.MeshPhysicalMaterial({ color: '#f2f1ee', roughness: 0.7, metalness: 0, side: THREE.DoubleSide });
    const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, material: THREE.Material = matte) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      m.castShadow = m.receiveShadow = true;
      gate.add(m);
      return m;
    };
    const h = slot.top - slot.bottom, e = 0.022, t = 0.14;
    if (setup.gate === 'slot') {
      // A wall with the slot cut through it.
      const [x0, x1, d] = [gateX - t, gateX, 1.5];
      box(x0, x1, 0, slot.bottom, -d, d); box(x0, x1, slot.top, GATE_H, -d, d);
      box(x0, x1, slot.bottom, slot.top, -d, -slot.half); box(x0, x1, slot.bottom, slot.top, slot.half, d);
    } else if (setup.gate === 'tube') {
      // A glass duct, its mouth the limit tall, laid on a dark rail that runs on past its far end as the landing.
      const pane = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0, transmission: 1, thickness: 0.02, ior: 1.4, specularIntensity: 0.7 });
      const w = 0.02;
      box(landX - PLATE.tip / 2 - 0.3, gateX, 0, slot.bottom - w, -slot.half - w, slot.half + w, new THREE.MeshPhysicalMaterial({ color: '#1c1c1e', roughness: 0.55, metalness: 0 }));
      const x0 = gateX - TUBE;
      box(x0, gateX, slot.top, slot.top + w, -slot.half - w, slot.half + w, pane);
      box(x0, gateX, slot.bottom, slot.top, -slot.half - w, -slot.half, pane); box(x0, gateX, slot.bottom, slot.top, slot.half, slot.half + w, pane);
    } else if (setup.gate === 'envelope') {
      // An envelope lying on a dark plinth, its open mouth towards the press: paper walls round a pocket the limit tall.
      const [x0, p] = [gateX - 2.3, 0.02];
      box(x0, gateX, 0, slot.bottom - p, -slot.half, slot.half, new THREE.MeshPhysicalMaterial({ color: '#1c1c1e', roughness: 0.55, metalness: 0 }));
      box(x0, gateX, slot.bottom - p, slot.bottom, -slot.half - p, slot.half + p);
      box(x0, gateX, slot.top, slot.top + p, -slot.half - p, slot.half + p);
      box(x0, gateX, slot.bottom, slot.top, -slot.half - p, -slot.half);
      box(x0, gateX, slot.bottom, slot.top, slot.half, slot.half + p);
      box(x0 - p, x0, slot.bottom, slot.top, -slot.half, slot.half);
      // The flap, hinged on the mouth's top edge: open it lies back over the envelope; sealing, it swings over and down across the mouth.
      // An envelope's flap: square shoulders, then a point that reaches the mouth's bottom edge.
      const [w, l] = [slot.half + p, h + 2 * p];
      const shape = new THREE.Shape();
      shape.moveTo(-w, 0); shape.lineTo(w, 0); shape.lineTo(w, l * 0.7); shape.lineTo(0, l); shape.lineTo(-w, l * 0.7); shape.closePath();
      const leaf = new THREE.Mesh(new THREE.ShapeGeometry(shape), matte);
      leaf.rotation.y = Math.PI / 2; // the flap's plane faces along x, like the mouth
      leaf.castShadow = true;
      flap.add(leaf);
      flap.position.set(gateX + 0.002, slot.top + p, 0);
      gate.add(flap);
    }
    // The photo's light inside the opening: a pane across it, or the bubble's own shape.
    let pane: THREE.Mesh;
    if (setup.gate === 'bubble') {
      // Nothing but the bubble's outline round the opening, rounded, its tail at the bottom right, standing in the air.
      // Drawn in (z, y); the pane turned a quarter about y lays z along the shape's x.
      const r = Math.min(h / 2, 0.22), [z0, z1, y0, y1] = [-slot.half, slot.half, slot.bottom, slot.top];
      const outline = new THREE.Shape();
      outline.moveTo(z0 + r, y1); outline.lineTo(z1 - r, y1); outline.quadraticCurveTo(z1, y1, z1, y1 - r);
      outline.lineTo(z1, y0 - 0.16); outline.lineTo(z1 - 0.26, y0); // the tail
      outline.lineTo(z0 + r, y0); outline.quadraticCurveTo(z0, y0, z0, y0 + r);
      outline.lineTo(z0, y1 - r); outline.quadraticCurveTo(z0, y1, z0 + r, y1);
      const curve = new THREE.CatmullRomCurve3(outline.getSpacedPoints(400).map((q) => new THREE.Vector3(gateX, q.y, q.x)), true);
      gate.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 400, e / 2, 8, true), edges));
      pane = new THREE.Mesh(new THREE.ShapeGeometry(outline, 12), light);
      pane.rotation.y = -Math.PI / 2; pane.position.x = gateX - 0.01;
    } else {
      // The opening's four edges.
      const edge = (y: number, z: number, sy: number, sz: number) => box(gateX - t, gateX + 0.004, y - sy / 2, y + sy / 2, z - sz / 2, z + sz / 2, edges).castShadow = false;
      edge(slot.bottom + e / 2, 0, e, slot.half * 2); edge(slot.top - e / 2, 0, e, slot.half * 2);
      edge(slot.bottom + h / 2, -slot.half + e / 2, h, e); edge(slot.bottom + h / 2, slot.half - e / 2, h, e);
      // A duct's glass is drawn by its long top edges and its far rim, in the opening's ink.
      if (setup.gate === 'tube') {
        const x0 = gateX - TUBE;
        for (const z of [-slot.half, slot.half]) box(x0, gateX - t, slot.top - e, slot.top, z - e / 2, z + e / 2, edges).castShadow = false;
        const rim = (y: number, z: number, sy: number, sz: number) => box(x0 - 0.004, x0 + e, y - sy / 2, y + sy / 2, z - sz / 2, z + sz / 2, edges).castShadow = false;
        rim(slot.top - e / 2, 0, e, slot.half * 2); rim(slot.bottom + h / 2, -slot.half, h, e); rim(slot.bottom + h / 2, slot.half, h, e);
      }
      pane = new THREE.Mesh(new THREE.PlaneGeometry(slot.half * 2, h), light);
      pane.rotation.y = Math.PI / 2; pane.position.set(gateX - t - 0.02, slot.bottom + h / 2, 0);
    }
    gate.add(pane);
    scene.add(gate);
  }

  // The dome: a glass bell that lowers over the studio, a hairline ring where it meets the floor, tinted by the photo as it fills.
  const dome = new THREE.Group();
  // Clear glass (transmission: bright at its rim, clear in the middle); filling, it glows with the top photo's colours.
  const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.03, metalness: 0, transmission: 1, thickness: 0.04, ior: 1.5, specularIntensity: 0.3,
    emissive: '#ffffff', emissiveMap: colours(bands[bands.length - 1].faces.after.image), emissiveIntensity: 0 });
  if (setup.dome) {
    const R = setup.dome;
    dome.add(new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64, 0, Math.PI * 2, 0, Math.PI / 2), glass));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 8, 256), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 }));
    ring.rotation.x = Math.PI / 2;
    dome.add(ring);
    scene.add(dome);
  }

  // Post: bloom on real highlights only.
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.5, 0.8, 1.0));
  composer.addPass(new OutputPass());

  /** Puts the camera where the pose says. Its "up" never flips, so it can pass through straight down. */
  function aim({ cam }: Pose) {
    const { az, el, dist, tx = 0, ty, shake = 0 } = cam;
    const ce = Math.cos(el), se = Math.sin(el), ca = Math.cos(az), sa = Math.sin(az);
    camera.position.set(tx + sa * ce * dist + shake, ty + se * dist + shake * 0.6, ca * ce * dist);
    camera.up.set(-sa * se, ce, -ca * se);
    camera.lookAt(tx, ty, 0);
    camera.updateMatrixWorld();
  }

  /** Whether the photos are under the limit yet: together, or each on its own. */
  function fits(p: Pose) {
    const k = pressed(p.stack.h);
    return setup.each ? bands.every((b) => mix(b.from, b.to, k) <= setup.limit) : p.bytes <= setup.limit;
  }

  function pose(p: Pose) {
    const { h, x = 0, y, tilt = 0, fan = 0 } = p.stack;
    stack.position.set(x, y, 0); stack.rotation.x = tilt;
    // Each band is pressed by the same share, so the bands always add up to the stack; or, stamped one by one, each by its own.
    const k = pressed(h), mid0 = (bands.length - 1) / 2;
    // A big hand fans no wider than eight cards.
    const spread = fan * Math.min(1, 7 / Math.max(1, bands.length - 1));
    let base = -h / 2;
    bands.forEach((b, i) => {
      const bk = p.stack.squeeze?.[i] ?? k;
      const bh = heightOf(mix(b.from, b.to, bk));
      b.mesh.scale.y = bh;
      // Fanned, the bands spread like cards from their front edges and separate a hair, so each photo shows.
      const [dx, dy] = p.stack.shift?.[i] ?? [0, 0]; // a print on its own way, through the duct
      b.pivot.position.set((i - mid0) * 0.34 * spread + dx, base + bh / 2 + i * 0.03 * spread + dy, DEPTH / 2);
      b.pivot.rotation.y = -(i - mid0) * 0.2 * spread;
      b.top.map = p.stack.after && (p.stack.squeeze?.[i] ?? 1) > 0 ? b.faces.after : b.faces.before; // stamped one by one, each as its stamp lands
      base += bh;
    });
    upper.position.y = PLATE.tall + p.upper + PLATE.tall; // flipped, its tip is `tall` below its origin
    key.intensity = 1.8 * p.studio; rim.intensity = 0.6 * p.studio; fill.intensity = (setup.gate ? 0.9 : 0) * p.studio; scene.environmentIntensity = 0.3 * p.studio;
    // The photo's light, stronger on the plate as it closes in, gone once the photo stands up.
    const near = clamp01(1 - (p.upper - h) / 1.4), lying = 1 - tilt / (Math.PI / 2);
    face.position.set(x, y + h / 2 + 0.02, 0); face.intensity = (3 + near * 7) * lying * p.studio;
    const mid = y + h * 0.1;
    spill[0].position.set(x - PLATE.tip / 2 - 0.45, mid, 0.2);
    spill[1].position.set(x + PLATE.tip / 2 + 0.45, mid, 0.2);
    spill[2].position.set(x, mid, DEPTH / 2 + 0.6);
    const flight = p.courier ?? { band: 0, x: 0, k: 0 };
    courier.color.copy(bands[flight.band].colour); courier.intensity = 6 * flight.k;
    courier.position.set(flight.x, (slot.top + slot.bottom) / 2, 0);
    for (const s of spill) s.intensity = (0.5 + h * 0.34) * p.studio;

    const under = fits(p);
    const ink = under ? '#ffffff' : RED;
    gauge.visible = p.gauge > 0.01;
    // The upper plate wipes each tick as it passes: what is above the seam is gone.
    for (const { bar, opacity } of ticks) bar.material.opacity = opacity * p.gauge * clamp01((PLATE.tall + p.upper - bar.position.y) / 0.12 + 0.5);
    // The wall rises out of the floor and sinks back into it; the edges flare when the stack hits them.
    const rise = p.gate ?? 0;
    gate.visible = rise > 0.001;
    gate.position.y = -(GATE_H + 0.05) * (1 - rise);
    edges.color.set(ink).multiplyScalar(1 + 1.6 * (p.glint ?? 0));
    light.opacity = p.pour ?? 0;
    flap.rotation.z = mix(1.45, 0.06 - Math.PI, p.seal ?? 0); // open: back over the envelope, just raised; sealed: down over the mouth
    const bell = p.dome ?? { down: 0, fill: 0 };
    dome.visible = bell.down > 0.001;
    dome.position.y = (setup.dome ?? 0) * 2.2 * (1 - bell.down);
    glass.emissiveIntensity = 0.6 * bell.fill;

    // Air leaves at the seam while the press travels, fastest at the start.
    const P = airGeo.attributes.position.array as Float32Array, C = airGeo.attributes.color.array as Float32Array;
    const col = new THREE.Color(), white = new THREE.Color('#fff');
    air.forEach((a, i) => {
      const age = p.air ? p.air.age - 0.04 - a.when * (p.air.length - 0.55) : -1;
      const alive = age > 0 && age < a.life, d = alive ? (1 - Math.exp(-4.2 * age)) / 4.2 : 0;
      P[i * 3] = x + a.side * (PLATE.tip / 2 + 0.02 + a.vx * d);
      P[i * 3 + 1] = PLATE.tall + p.upper + a.vy * d - 0.03;
      P[i * 3 + 2] = a.z + a.vz * d;
      const f = alive ? (1 - age / a.life) ** 1.3 * 1.5 : 0;
      col.copy(a.side < 0 ? tint.left : tint.right).lerp(white, 0.55);
      C[i * 3] = col.r * f; C[i * 3 + 1] = col.g * f; C[i * 3 + 2] = col.b * f;
    });
    airGeo.attributes.position.needsUpdate = airGeo.attributes.color.needsUpdate = true;
    aim(p);
  }

  const v = new THREE.Vector3();
  return {
    heightOf,
    /** The bands' sizes, bottom to top, and their sum. */
    photos: setup.photos,
    total,
    /** The size a stack `h` tall stands for: the count is read off the height, so the two never disagree. */
    bytesOf: (h: number) => h / perByte,
    fits,
    limitY,
    gateX,
    slot,
    landX,
    /** The photo's colours: everything, its left and right edges, its foot. CSS strings. */
    tints: Object.fromEntries(Object.entries(tint).map(([k, c]) => [k, `#${c.getHexString(THREE.SRGBColorSpace)}`])) as Record<keyof typeof tint, string>,
    /** Renders one frame. */
    draw(p: Pose) {
      pose(p);
      composer.render();
    },
    /** Where a point in the scene lands in the frame, as fractions of its width and height. */
    project(p: Pose, x: number, y: number, z: number): [number, number] {
      aim(p);
      v.set(x, y, z).project(camera);
      return [v.x * 0.5 + 0.5, -v.y * 0.5 + 0.5];
    },
    /**
     * A point on the stack, or on one band of it (top band by default), as
     * fractions of its width, height and depth from its centre (±0.5 are its
     * faces), in the frame.
     */
    onStack(p: Pose, x: number, y: number, z: number, band = bands.length - 1): [number, number] {
      pose(p);
      stack.updateMatrixWorld(true);
      const m = bands[band].mesh;
      v.set(x * PLATE.tip, y, z * DEPTH).applyMatrix4(m.matrixWorld).project(camera);
      return [v.x * 0.5 + 0.5, -v.y * 0.5 + 0.5];
    },
    dispose() { renderer.dispose(); },
  };
}

export type Press = Awaited<ReturnType<typeof createPress>>;

/** How far the camera must stand for `height` units to fill `share` of the frame's height. */
export const distanceFor = (height: number, share: number) => height / share / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));

export { mix, clamp01 };
