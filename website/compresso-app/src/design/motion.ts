/**
 * Motion constants, mirrored from tokens.css so JS-orchestrated animation obeys
 * the same system. Every curve here has both control-point y values ≤ 1 — this
 * system cannot express overshoot, by construction.
 *
 * There are no springs in this app. Not "springs tuned not to bounce" — none.
 */
export const EASE = {
  standard: 'cubic-bezier(0.32, 0.72, 0, 1)',
  entrance: 'cubic-bezier(0.16, 1, 0.30, 1)',
  exit: 'cubic-bezier(0.40, 0, 1, 1)',
  glide: 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

export const DUR = {
  micro: 120,
  standard: 240,
  entrance: 360,
  ceremony: 520,
  stagger: 24,
} as const;

/** Staggered delay, capped so a 200-file queue never animates for 5 seconds. */
export const stagger = (i: number, max = 8) => Math.min(i, max) * DUR.stagger;

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Frame-rate-independent lerp. Used by the pointer-follow light. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
