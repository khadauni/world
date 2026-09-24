import { describe, expect, it } from 'vitest';
import { hrefFor, parseHash } from './router';

describe('router', () => {
  it('parses known routes and rejects anything else', () => {
    expect(parseHash('#/hub')).toEqual({ name: 'hub' });
    expect(parseHash('#/parents/')).toEqual({ name: 'parents' });
    expect(parseHash('#/world/solar-system')).toEqual({ name: 'world', worldId: 'solar-system' });
    expect(parseHash('#/world/../../etc')).toEqual({ name: 'home' });
    expect(parseHash('#/world/<script>')).toEqual({ name: 'home' });
    expect(parseHash('')).toEqual({ name: 'home' });
  });
  it('round-trips', () => {
    for (const r of [{ name: 'home' }, { name: 'hub' }, { name: 'parents' }, { name: 'world', worldId: 'chandrayaan' }] as const) {
      expect(parseHash(hrefFor(r))).toEqual(r);
    }
  });
});
