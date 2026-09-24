import { describe, expect, it } from 'vitest';
import { BANDS, tier } from './tier';

describe('tier', () => {
  it('returns plain values for every band', () => {
    expect(tier('hello', 'tiny')).toBe('hello');
    expect(tier(['a', 'b'], 'senior')).toEqual(['a', 'b']);
  });
  it('picks the band variant from a tiered record', () => {
    const v = { tiny: 't', junior: 'j', senior: 's' };
    expect(tier(v, 'tiny')).toBe('t');
    expect(tier(v, 'junior')).toBe('j');
    expect(tier(v, 'senior')).toBe('s');
  });
  it('quiz length grows with age', () => {
    expect(BANDS.tiny.quizLength).toBeLessThan(BANDS.junior.quizLength);
    expect(BANDS.junior.quizLength).toBeLessThan(BANDS.senior.quizLength);
  });
});
