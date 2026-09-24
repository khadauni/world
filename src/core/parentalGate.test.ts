import { describe, expect, it } from 'vitest';
import { makeChallenge } from './parentalGate';

describe('parental gate', () => {
  it('always offers 4 unique positive choices including the answer', () => {
    for (let seed = 1; seed < 300; seed++) {
      const c = makeChallenge(seed);
      expect(c.answer).toBe(c.a * c.b);
      expect(new Set(c.choices).size).toBe(c.choices.length);
      expect(c.choices.length).toBe(4);
      expect(c.choices).toContain(c.answer);
      expect(c.choices.every((n) => n > 0)).toBe(true);
    }
  });
});
