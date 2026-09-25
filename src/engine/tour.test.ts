import { describe, expect, it } from 'vitest';
import type { WorldStop } from '@/core/types';
import { formatStat, parseStat, readingTime, tourFor } from './tour';

const base: WorldStop = {
  id: 's',
  title: 'S',
  emoji: '⭐',
  color: '#ffffff',
  narration: { tiny: ['Hi!'], junior: ['Hello there.', 'Second.'], senior: ['Greetings.'] },
  facts: ['A fact.'],
  quiz: [],
};

describe('tourFor', () => {
  it('falls back to narration + facts', () => {
    expect(tourFor(base, 'junior').map((b) => b.id)).toEqual(['narration-0', 'narration-1', 'fact-0']);
  });
  it('filters authored beats by band', () => {
    const stop: WorldStop = {
      ...base,
      tour: [
        { id: 'a', shot: 'x', say: 'all' },
        { id: 'b', shot: 'y', say: 'deep', bands: ['senior'] },
      ],
    };
    expect(tourFor(stop, 'tiny').map((b) => b.id)).toEqual(['a']);
    expect(tourFor(stop, 'senior').map((b) => b.id)).toEqual(['a', 'b']);
  });
});

describe('readingTime', () => {
  it('is slower for younger children and respects hold', () => {
    const text = 'Saturn has beautiful rings made of ice and rock';
    expect(readingTime(text, 'tiny')).toBeGreaterThan(readingTime(text, 'senior'));
    expect(readingTime('Hi', 'senior', 9000)).toBe(9000);
    expect(readingTime('Hi', 'senior')).toBe(2600);
  });
});

describe('stats', () => {
  it('parses and formats numbers for count-up', () => {
    const p = parseStat('1,300 Earths');
    expect(p).toMatchObject({ number: 1300, suffix: ' Earths', decimals: 0 });
    expect(formatStat(p!, 650, true)).toBe('650 Earths');
    expect(parseStat('about 8.3 min')).toMatchObject({ prefix: 'about ', number: 8.3, decimals: 1 });
    expect(parseStat('huge!')).toBeNull();
  });
});
