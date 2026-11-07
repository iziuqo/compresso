import type { CSSProperties } from 'react';
import { Mono } from './parts';
import { formatBytes } from './system';

const UNIT: Record<string, number> = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9 };
const TURN = 0.35; // the last third of each step is spent turning, like a real drum

/**
 * A size that rolls like a mechanical counter. The last digit sits on a drum
 * that turns towards the next lower digit; the digits above step when it
 * wraps. `turning` scales the turn, so a number at rest sits square.
 */
export function Counter({ bytes, size, turning, style }: { bytes: number; size: number; turning: number; style?: CSSProperties }) {
  const [num, unit] = formatBytes('en', bytes).split(' ');
  const last = num.length - 1;
  const decimals = num.includes('.') ? last - num.indexOf('.') : 0;
  // formatBytes rounds, so the shown digit changes at each half step.
  const x = (bytes / UNIT[unit]) * 10 ** decimals + 0.5;
  const turn = Math.max(0, 1 - (x - Math.floor(x)) / TURN) * turning;
  const digit = Number(num[last]);
  return (
    <Mono size={size} style={style}>
      {num.slice(0, last)}
      <span style={{ display: 'inline-block', position: 'relative', overflow: 'hidden', height: '1em', verticalAlign: 'top' }}>
        <span style={{ display: 'block', transform: `translateY(${turn}em)` }}>{digit}</span>
        <span style={{ position: 'absolute', inset: 0, transform: `translateY(${turn - 1}em)` }}>{(digit + 9) % 10}</span>
      </span>
      {` ${unit}`}
    </Mono>
  );
}

/** The frames in [start, end] where a rolling size shows a new value: one counter tick each, at most one every other frame. */
export function rollTicks(bytesAt: (frame: number) => number, start: number, end: number) {
  const ticks: number[] = [];
  let shown = formatBytes('en', bytesAt(start));
  for (let f = start + 1; f <= end; f++) {
    const now = formatBytes('en', bytesAt(f));
    if (now !== shown && (ticks.length === 0 || f - ticks[ticks.length - 1] >= 2)) ticks.push(f);
    shown = now;
  }
  return ticks;
}
