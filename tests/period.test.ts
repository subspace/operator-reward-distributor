import { describe, expect, it } from 'vitest';

import { computePeriodId } from '../src/scheduler/period.js';

describe('computePeriodId', () => {
  it('handles boundaries at exact multiples', () => {
    const N = 300; // seconds
    expect(computePeriodId(0, N)).toBe(0);
    expect(computePeriodId(299_999, N)).toBe(0);
    expect(computePeriodId(300_000, N)).toBe(1);
    expect(computePeriodId(300_000 - 1, N)).toBe(0);
  });

  it('advances monotonically with time', () => {
    const N = 10; // seconds
    const a = computePeriodId(10_001, N);
    const b = computePeriodId(29_999, N);
    const c = computePeriodId(30_000, N);
    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(c).toBe(3);
  });
});
