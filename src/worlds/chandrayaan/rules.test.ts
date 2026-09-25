import { describe, expect, it } from 'vitest';
import { AGE_BANDS } from '@/core/types';
import { ASSIST_AFTER_MISSES, RULES, rulesFor } from './logic/bands';
import { checksFor, displayOrder, LAUNCH_CHECKS, liftoffHeight, stepHold, tapHold } from './logic/launch';
import { addMiss, createSeq, isComplete, needsAssist, nextTarget, tapSeq } from './logic/sequence';
import { samplesFor } from './logic/elements';
import { assistedWindow, gaugeValue, hopArc, judgeHop } from './logic/hop';
import { markerStates, setForPhase } from './logic/map';

describe('difficulty by band', () => {
  it('gets harder from tiny → junior → senior', () => {
    const [t, j, s] = [RULES.tiny, RULES.junior, RULES.senior];
    expect(t.launch.checks.length).toBe(0);
    expect(j.launch.checks.length).toBe(3);
    expect(s.launch.checks.length).toBe(4);
    expect(s.launch.ordered).toBe(true);
    expect(j.launch.ordered).toBe(false);
    expect([t.orbit.boostsNeeded, j.orbit.boostsNeeded, s.orbit.boostsNeeded]).toEqual([2, 3, 4]);
    expect(t.orbit.zoneHalfAngle).toBeGreaterThan(j.orbit.zoneHalfAngle);
    expect(j.orbit.zoneHalfAngle).toBeGreaterThan(s.orbit.zoneHalfAngle);
    expect([t.transfer.waypoints, j.transfer.waypoints, s.transfer.waypoints]).toEqual([3, 4, 5]);
    expect([t.separation.latches, j.separation.latches, s.separation.latches]).toEqual([1, 3, 4]);
    expect([t.rover.samples, j.rover.samples, s.rover.samples]).toEqual([2, 3, 4]);
    expect(t.landing.mode).toBe('autopilot');
    expect(s.landing.fuel).not.toBeNull();
    expect(j.landing.safeSpeed).toBeGreaterThan(s.landing.safeSpeed);
    expect(s.night.hopGauge).toBe(true);
    expect(t.night.hopGauge).toBe(false);
  });

  it('only seniors see element symbols', () => {
    for (const b of AGE_BANDS) expect(rulesFor(b).rover.showSymbols).toBe(b === 'senior');
  });
});

describe('tap sequences (checks, waypoints, latches, samples)', () => {
  it('unordered sets accept any order and complete once', () => {
    let s = createSeq(3, false);
    let r = tapSeq(s, 2);
    expect(r.result).toBe('hit');
    s = r.state;
    r = tapSeq(s, 2);
    expect(r.result).toBe('repeat');
    s = tapSeq(s, 0).state;
    r = tapSeq(s, 1);
    expect(r.result).toBe('complete');
    expect(isComplete(r.state)).toBe(true);
  });

  it('ordered sets count wrong taps as gentle misses and assist after two', () => {
    let s = createSeq(4, true);
    expect(nextTarget(s)).toBe(0);
    let r = tapSeq(s, 2);
    expect(r.result).toBe('miss');
    s = r.state;
    expect(needsAssist(s)).toBe(false);
    s = tapSeq(s, 3).state;
    expect(s.misses).toBe(ASSIST_AFTER_MISSES);
    expect(needsAssist(s)).toBe(true);
    // A miss never blocks: the right target still works.
    r = tapSeq(s, 0);
    expect(r.result).toBe('hit');
    expect(nextTarget(r.state)).toBe(1);
  });

  it('ignores out-of-range taps and taps after completion', () => {
    const s = createSeq(1, false);
    expect(tapSeq(s, 5).result).toBe('repeat');
    const done = tapSeq(s, 0);
    expect(done.result).toBe('complete');
    expect(tapSeq(done.state, 0).result).toBe('repeat');
    expect(addMiss(done.state).misses).toBe(1);
  });
});

describe('launch', () => {
  it('lists checks in the correct real-world order', () => {
    expect(LAUNCH_CHECKS.map((c) => c.id)).toEqual(['fuel', 'spacecraft', 'weather', 'clock']);
    expect(checksFor(RULES.senior.launch).map((c) => c.id)).toEqual(['fuel', 'spacecraft', 'weather', 'clock']);
    expect(checksFor(RULES.tiny.launch)).toEqual([]);
  });

  it('fills the LAUNCH ring by holding, and by tapping as an alternative', () => {
    const rules = RULES.junior.launch;
    let v = 0;
    for (let i = 0; i < 60 * rules.holdSeconds + 2; i++) v = stepHold(v, true, 1 / 60, rules);
    expect(v).toBe(1);
    let taps = 0;
    let t = 0;
    while (t < 1 && taps < 20) {
      t = tapHold(t, rules);
      taps++;
    }
    expect(taps).toBeLessThanOrEqual(5);
  });

  it('drains slowly for tiny explorers (forgiving) and never goes negative', () => {
    const tiny = RULES.tiny.launch;
    expect(stepHold(0.5, false, 1, tiny)).toBeGreaterThan(0.4);
    expect(stepHold(0.01, false, 5, RULES.senior.launch)).toBe(0);
  });

  it('rocket climbs faster and faster after liftoff', () => {
    expect(liftoffHeight(0)).toBe(0);
    const a = liftoffHeight(1) - liftoffHeight(0);
    const b = liftoffHeight(3) - liftoffHeight(2);
    expect(b).toBeGreaterThan(a);
  });
});

describe('hop gauge', () => {
  it('sweeps 0 → max → 0', () => {
    expect(gaugeValue(0, 2, 60)).toBe(0);
    expect(gaugeValue(1, 2, 60)).toBeCloseTo(60);
    expect(gaugeValue(2, 2, 60)).toBeCloseTo(0);
    expect(gaugeValue(0.5, 2, 60)).toBeCloseTo(30);
  });

  it('judges the real ~40 cm hop window and widens it on assist', () => {
    expect(judgeHop(40, [35, 45])).toBe('good');
    expect(judgeHop(20, [35, 45])).toBe('low');
    expect(judgeHop(55, [35, 45])).toBe('high');
    const w = assistedWindow([35, 45], true);
    expect(w[0]).toBeLessThan(35);
    expect(w[1]).toBeGreaterThan(45);
    expect(assistedWindow([35, 45], false)).toEqual([35, 45]);
  });

  it('hop arc rises and lands with sideways travel', () => {
    expect(hopArc(0)).toEqual({ up: 0, side: 0 });
    expect(hopArc(0.5).up).toBeCloseTo(1);
    expect(hopArc(1).side).toBe(1);
    expect(hopArc(1).up).toBe(0);
  });
});

describe('rover samples', () => {
  it('always starts with sulphur, the headline discovery', () => {
    expect(samplesFor(2)[0]?.symbol).toBe('S');
    expect(samplesFor(4).map((e) => e.symbol)).toHaveLength(4);
    expect(samplesFor(99).length).toBeLessThanOrEqual(5);
  });
});

describe('mission map', () => {
  const ids = ['a', 'b', 'c', 'd'];
  it('marks done, next and locked stops like the shell does', () => {
    expect(markerStates(ids, [])).toEqual({ a: 'next', b: 'locked', c: 'locked', d: 'locked' });
    expect(markerStates(ids, ['a', 'b'])).toEqual({ a: 'done', b: 'done', c: 'next', d: 'locked' });
    expect(markerStates(ids, ['a', 'b', 'c', 'd'])).toEqual({ a: 'done', b: 'done', c: 'done', d: 'done' });
  });

  it('shows the map set on intro/map/finale and the stop set otherwise', () => {
    expect(setForPhase('intro', null)).toBe('map');
    expect(setForPhase('map', null)).toBe('map');
    expect(setForPhase('travel', 'landing')).toBe('landing');
    expect(setForPhase('reward', 'landing')).toBe('landing');
    expect(setForPhase('finale', null)).toBe('map');
  });
});

describe('senior launch cards', () => {
  it('are shown mixed up (the child must know the order) but contain every check', () => {
    const senior = checksFor(RULES.senior.launch);
    const shown = displayOrder(senior, true).map((c) => c.id);
    expect(shown).not.toEqual(senior.map((c) => c.id));
    expect([...shown].sort()).toEqual(senior.map((c) => c.id).sort());
    expect(displayOrder(checksFor(RULES.junior.launch), false).map((c) => c.id)).toEqual(['fuel', 'spacecraft', 'weather']);
  });
});
