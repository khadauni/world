import { describe, expect, it } from 'vitest';
import { BeatClock, CYCLE, atriaSqueeze, offsetFromSqueeze, periodFor, squash, valveOpen, ventSqueeze } from './logic/beat';
import { R_PEAK, ecgValue } from './logic/ecg';

const phases = Array.from({ length: 400 }, (_, i) => i / 400);

describe('cardiac cycle model', () => {
  it('squeezes the atria first, then the ventricles (never both at their peak)', () => {
    const atriaPeak = phases.reduce((best, p) => (atriaSqueeze(p) > atriaSqueeze(best) ? p : best), 0);
    const ventPeak = phases.reduce((best, p) => (ventSqueeze(p) > ventSqueeze(best) ? p : best), 0);
    // In cycle order, the atrial peak (late in the previous cycle) comes just before the ventricular one.
    const gap = (ventPeak - atriaPeak + 1) % 1;
    expect(gap).toBeGreaterThan(0.1);
    expect(gap).toBeLessThan(0.4);
    for (const p of phases) expect(Math.min(atriaSqueeze(p), Math.max(0, ventSqueeze(p)))).toBeLessThan(0.2);
  });

  it('keeps squeezes in range, with only a small springy refill bulge', () => {
    for (const p of phases) {
      expect(ventSqueeze(p)).toBeGreaterThanOrEqual(-0.2);
      expect(ventSqueeze(p)).toBeLessThanOrEqual(1);
      expect(atriaSqueeze(p)).toBeGreaterThanOrEqual(0);
      expect(atriaSqueeze(p)).toBeLessThanOrEqual(1);
    }
    expect(ventSqueeze(CYCLE.ventPeak)).toBeCloseTo(1, 5);
  });

  it('opens AV and semilunar valves at opposite times — blood only flows one way', () => {
    for (const p of phases) {
      const av = valveOpen('av', p);
      const sl = valveOpen('sl', p);
      expect(Math.min(av, sl), `phase ${p}`).toBe(0);
    }
    // While the ventricles push, the exit (semilunar) valves are open and the AV valves are shut.
    expect(valveOpen('sl', CYCLE.ventPeak)).toBe(1);
    expect(valveOpen('av', CYCLE.ventPeak)).toBe(0);
    // While they refill, the AV valves are open.
    expect(valveOpen('av', 0.7)).toBe(1);
    expect(valveOpen('sl', 0.7)).toBe(0);
  });

  it('closes the AV valves at "lub" and the semilunar valves at "dub"', () => {
    expect(valveOpen('av', 0.999)).toBeLessThan(0.1);
    expect(valveOpen('av', 0.01)).toBe(0);
    expect(valveOpen('sl', CYCLE.ventEnd - 0.1)).toBeGreaterThan(0.9);
    expect(valveOpen('sl', CYCLE.ventEnd + 0.01)).toBe(0);
  });

  it('squash-and-stretch roughly keeps volume', () => {
    const [h, v] = squash(1, 0.1);
    expect(v).toBeLessThan(1);
    expect(h).toBeGreaterThan(1);
    expect(h * h * v).toBeGreaterThan(0.9);
    expect(h * h * v).toBeLessThan(1.1);
  });

  it('BeatClock fires exactly one lub and one dub per beat, at the right rate', () => {
    const clock = new BeatClock();
    clock.reset(0.5);
    let lubs = 0;
    let dubs = 0;
    for (let i = 0; i < 600; i++) {
      clock.step(1 / 60, 60);
      if (clock.lub) lubs++;
      if (clock.dub) dubs++;
    }
    // 10 seconds at 60 bpm → 10 beats.
    expect(lubs).toBe(10);
    expect(dubs).toBe(10);
    expect(clock.beats).toBe(10);
  });

  it('BeatClock copes with long frames (slow devices) without skipping beats', () => {
    const clock = new BeatClock();
    clock.reset(0.5);
    let lubs = 0;
    for (let i = 0; i < 40; i++) {
      clock.step(0.25, 60);
      if (clock.lub) lubs++;
    }
    expect(lubs).toBe(10);
  });

  it('measures tap timing relative to the big squeeze', () => {
    expect(offsetFromSqueeze(CYCLE.ventPeak, 60)).toBeCloseTo(0, 5);
    expect(offsetFromSqueeze(CYCLE.ventPeak - 0.1, 60)).toBeCloseTo(-0.1 * periodFor(60), 5);
    expect(offsetFromSqueeze(CYCLE.ventPeak + 0.2, 60)).toBeCloseTo(0.2, 5);
  });
});

describe('ECG trace', () => {
  it('has its tall R spike just before the ventricles squeeze (electricity comes first)', () => {
    const peak = phases.reduce((best, p) => (ecgValue(p) > ecgValue(best) ? p : best), 0);
    expect(Math.abs(peak - R_PEAK)).toBeLessThan(0.01);
    expect(ecgValue(R_PEAK)).toBeGreaterThan(0.8);
    // P wave (atria) is small; T wave is medium.
    expect(ecgValue(0.8)).toBeGreaterThan(0.1);
    expect(ecgValue(0.8)).toBeLessThan(0.3);
    expect(ecgValue(0.25)).toBeGreaterThan(0.2);
    expect(ecgValue(0.55)).toBeLessThan(0.05);
  });
});
