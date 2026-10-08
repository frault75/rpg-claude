import { describe, expect, it } from 'vitest';
import { TRIM_DB, trim } from '../src/audio/mix';

describe('the mix', () => {
  it('turns each trim from dB into a gain', () => {
    expect(trim('battle')).toBeCloseTo(Math.pow(10, -1 / 20));
    expect(trim('winter')).toBeGreaterThan(1);
    expect(trim('ebb')).toBeLessThan(1);
  });

  it('keeps every trim small: a balance, not a rewrite', () => {
    for (const db of Object.values(TRIM_DB)) expect(Math.abs(db)).toBeLessThanOrEqual(3);
  });
});
