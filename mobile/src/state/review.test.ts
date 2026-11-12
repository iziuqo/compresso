import { describe, expect, it, vi } from 'vitest';

import { MB } from '../engine/presets';
import { isGoodMoment } from './review';

// vitest hoists these above the imports: the native modules never load.
vi.mock('expo-constants', () => ({ default: {} }));
vi.mock('expo-store-review', () => ({}));

const ready = { saves: 3, launches: 2, reviewAskedFor: '' };

describe('isGoodMoment', () => {
  it('asks on the third save of a later session when the run clearly worked', () => {
    expect(isGoodMoment(ready, '1.0.1', 2 * MB, 8 * MB)).toBe(true);
    expect(isGoodMoment(ready, '1.0.1', 300_000, 500_000)).toBe(true); // 60% lighter
  });
  it('waits for the third save and a second session', () => {
    expect(isGoodMoment({ ...ready, saves: 2 }, '1.0.1', 2 * MB, 8 * MB)).toBe(false);
    expect(isGoodMoment({ ...ready, launches: 1 }, '1.0.1', 2 * MB, 8 * MB)).toBe(false);
  });
  it('asks once per version', () => {
    expect(isGoodMoment({ ...ready, reviewAskedFor: '1.0.1' }, '1.0.1', 2 * MB, 8 * MB)).toBe(false);
    expect(isGoodMoment({ ...ready, reviewAskedFor: '1.0.1' }, '1.1.0', 2 * MB, 8 * MB)).toBe(true);
  });
  it('skips a run that saved little', () => {
    expect(isGoodMoment(ready, '1.0.1', 200_000, 1 * MB)).toBe(false);
    expect(isGoodMoment(ready, '1.0.1', 0, 0)).toBe(false);
  });
});
