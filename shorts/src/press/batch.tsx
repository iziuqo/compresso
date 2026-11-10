/**
 * The Batch's stamping run (wave three, 05): forty photos, one tower, and
 * the plate stamps it forty times, top band first, faster and faster from
 * the first beat to a blur; each stamp squeezes one band to its slice and
 * the count drops with it. Then the forty fan into one arc.
 */
import { ease } from '../system';
import { B, mix, span } from './ritual';
import type { Press } from './scene';

/** The stamps, one per band of 05's forty (top first), from Com: an 8th note, then each a little sooner, down to a 32nd. */
export const STAMPS = Array.from({ length: 40 }).reduce<number[]>((ts, _, i) => [...ts, i === 0 ? B.touch : ts[i - 1] + Math.max(0.03, 0.3 * 0.82 ** i)], []);

/**
 * Each band's share pressed (bottom to top), and how far the plate is up
 * between stamps: a stamp squeezes its band in the first 60% of its beat,
 * then the plate lifts a little, less the faster it goes, and falls again.
 */
export function stamping(press: Press, t: number) {
  const n = press.photos.length;
  const beat = (j: number) => (STAMPS[j + 1] ?? STAMPS[j] + 0.3) - STAMPS[j];
  const squeeze = press.photos.map((_, i) => span(t, STAMPS[n - 1 - i], STAMPS[n - 1 - i] + 0.6 * beat(n - 1 - i), ease.entrance));
  const j = STAMPS.filter((a) => t >= a).length - 1;
  const hop = j < 0 || j === n - 1 ? 0 : mix(0, Math.min(0.35, beat(j)), Math.sin(Math.PI * span(t, STAMPS[j] + 0.6 * beat(j), STAMPS[j + 1])));
  return { squeeze, hop };
}
