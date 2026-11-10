import { useEffect, useRef, useState } from 'react';
import { Easing } from 'react-native';

import { motion } from '../theme';

const ease = Easing.bezier(...motion.easeEntrance);

/**
 * A number that glides to `target` instead of jumping: from `from` on first
 * render, then from wherever it is to each new target. One state update per
 * frame while moving, none at rest. With Reduce Motion on it is always the
 * target.
 */
export function useCountUp(target: number, reduceMotion: boolean, { from = target, duration = motion.ceremony, delay = 0 } = {}): number {
  const [shown, setShown] = useState(from);
  const current = useRef(from);

  useEffect(() => {
    if (reduceMotion) return;
    const start = current.current;
    let frame = 0;
    let began = 0;
    const step = (now: number) => {
      began ||= now;
      const p = Math.min(1, Math.max(0, now - began - delay) / duration);
      current.current = Math.round(start + (target - start) * ease(p));
      setShown(current.current);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, reduceMotion, duration, delay]);

  return reduceMotion ? target : shown;
}
