import { describe, expect, it } from 'vitest';
import { AGE_BANDS, type AgeBand } from '@/core/types';
import { content } from './content';
import { GALILEAN, MOONS, type GalileanMoon } from './layout';
import {
  MOON_PARADE,
  NO_HELP,
  TASK_KINDS,
  TUNING,
  URANUS_TILT,
  afterHit,
  afterMiss,
  applyTilt,
  assistSpeed,
  bestTiltButton,
  cheerFor,
  earthThings,
  idleHelps,
  isCorrectMoon,
  isTaskKind,
  jupiterGoal,
  nextMoon,
  tiltConfig,
  tiltProgress,
  tiltSolved,
  tuningFor,
} from './tasks/rules';

const ORDER: readonly AgeBand[] = ['tiny', 'junior', 'senior'];

describe('mission difficulty adapts to age', () => {
  it('every stop has a task this world knows how to run', () => {
    for (const stop of content.stops) expect(isTaskKind(stop.task?.kind), stop.id).toBe(true);
    expect(new Set(content.stops.map((s) => s.task?.kind)).size).toBe(TASK_KINDS.length);
  });

  it('older explorers get at least as many targets, smaller targets and faster movement', () => {
    for (const kind of TASK_KINDS) {
      if (kind === 'tilt-uranus') continue; // counts there are taps, see the tilt tests
      for (let i = 1; i < ORDER.length; i++) {
        const a = tuningFor(kind, ORDER[i - 1] as AgeBand);
        const b = tuningFor(kind, ORDER[i] as AgeBand);
        expect(b.count, `${kind} count`).toBeGreaterThanOrEqual(a.count);
        expect(b.size, `${kind} size`).toBeLessThanOrEqual(a.size);
        expect(b.speed, `${kind} speed`).toBeGreaterThanOrEqual(a.speed);
      }
    }
  });

  it('keeps tiny missions short, big and forgiving', () => {
    for (const kind of TASK_KINDS) {
      const t = TUNING[kind].tiny;
      expect(t.count).toBeLessThanOrEqual(3);
      expect(t.size).toBeGreaterThanOrEqual(1.35);
      expect(t.assistAfterIdle).toBeLessThanOrEqual(10);
    }
  });

  it('always helps after 2 misses', () => {
    for (const kind of TASK_KINDS) for (const band of AGE_BANDS) expect(tuningFor(kind, band).assistAfterMisses).toBe(2);
  });
});

describe('gentle help, never a fail state', () => {
  const t = tuningFor('collect-sparks', 'junior');

  it('starts helping on the second miss', () => {
    const one = afterMiss(NO_HELP, t);
    expect(one.helping).toBe(false);
    expect(afterMiss(one, t).helping).toBe(true);
  });

  it('starts helping after a long pause, sooner for younger explorers', () => {
    expect(idleHelps(t.assistAfterIdle - 0.5, t)).toBe(false);
    expect(idleHelps(t.assistAfterIdle + 0.5, t)).toBe(true);
    const tiny = tuningFor('collect-sparks', 'tiny');
    const senior = tuningFor('collect-sparks', 'senior');
    expect(tiny.assistAfterIdle).toBeLessThan(t.assistAfterIdle);
    expect(t.assistAfterIdle).toBeLessThan(senior.assistAfterIdle);
  });

  it('a success resets the miss count but never takes help away', () => {
    const helped = afterMiss(afterMiss(NO_HELP, t), t);
    const after = afterHit(helped);
    expect(after.misses).toBe(0);
    expect(after.helping).toBe(true);
    expect(afterHit(afterMiss(NO_HELP, t)).misses).toBe(0);
  });

  it('slows moving targets down while helping', () => {
    expect(assistSpeed(true)).toBeLessThan(assistSpeed(false));
  });

  it('cheers on the first, halfway and last target only', () => {
    expect(cheerFor(1, 5)).not.toBeNull();
    expect(cheerFor(2, 5)).toBeNull();
    expect(cheerFor(3, 5)).not.toBeNull();
    expect(cheerFor(5, 5)).not.toBeNull();
    expect(cheerFor(0, 5)).toBeNull();
    expect(cheerFor(1, 1)).not.toBeNull();
  });
});

describe('Earth: find things', () => {
  it('asks tiny for the Moon, junior for the Moon + a satellite, senior for all three', () => {
    expect(earthThings('tiny')).toEqual(['moon']);
    expect(earthThings('junior')).toEqual(['moon', 'satellite']);
    expect(earthThings('senior')).toEqual(['moon', 'satellite', 'hurricane']);
  });
});

describe('Jupiter: the Great Red Spot and the Galilean moons', () => {
  it('tiny taps the storm, junior any 2 moons, senior all 4 in order from Jupiter', () => {
    expect(jupiterGoal('tiny').mode).toBe('spot');
    const junior = jupiterGoal('junior');
    expect(junior).toEqual({ mode: 'any', need: 2 });
    expect(jupiterGoal('senior')).toEqual({ mode: 'ordered', order: ['io', 'europa', 'ganymede', 'callisto'] });
  });

  it('judges moon taps fairly', () => {
    const junior = jupiterGoal('junior');
    expect(isCorrectMoon(junior, [], 'callisto')).toBe(true);
    expect(isCorrectMoon(junior, ['callisto'], 'callisto')).toBe(false);
    expect(isCorrectMoon(junior, ['callisto'], 'io')).toBe(true);
    const senior = jupiterGoal('senior');
    expect(isCorrectMoon(senior, [], 'europa')).toBe(false);
    expect(isCorrectMoon(senior, [], 'io')).toBe(true);
    expect(isCorrectMoon(senior, ['io'], 'europa')).toBe(true);
    expect(nextMoon(senior, ['io', 'europa'])).toBe('ganymede');
    expect(nextMoon(senior, ['io', 'europa', 'ganymede', 'callisto'])).toBeNull();
    expect(nextMoon(junior, [])).toBeNull();
  });
});

describe('Jupiter: the moon parade', () => {
  // Screen position (in Jupiter radii) of a moon parked at its parade angle, seen from its orbital plane (worst case
  // for overlaps) — x across the screen, depth toward the camera.
  const place = (m: GalileanMoon, drift = 0) => {
    const a = MOON_PARADE[m] + drift;
    return { x: MOONS.jupiter[m].orbit * Math.sin(a), depth: MOONS.jupiter[m].orbit * Math.cos(a), r: MOONS.jupiter[m].radius };
  };

  it('keeps every moon clear of Jupiter’s disc, even while drifting', () => {
    for (const m of GALILEAN) for (const drift of [-0.07, 0, 0.07]) expect(Math.abs(place(m, drift).x) - place(m, drift).r, m).toBeGreaterThan(1.15);
  });

  it('shows the moons in their real order outward from Jupiter, alternating sides', () => {
    const across = GALILEAN.map((m) => Math.abs(place(m).x));
    for (let i = 1; i < across.length; i++) expect(across[i], GALILEAN[i]).toBeGreaterThan((across[i - 1] as number) + 0.1);
    expect(Math.sign(place('io').x)).toBe(1);
    expect(Math.sign(place('europa').x)).toBe(-1);
    expect(Math.sign(place('ganymede').x)).toBe(1);
    expect(Math.sign(place('callisto').x)).toBe(-1);
  });

  it('keeps neighbours on the same side far enough apart to tap', () => {
    for (const [a, b] of [['io', 'ganymede'], ['europa', 'callisto']] as const) {
      const pa = place(a);
      const pb = place(b);
      expect(Math.hypot(pa.x - pb.x, pa.depth - pb.depth), `${a}–${b}`).toBeGreaterThan(0.45);
    }
  });
});

describe('Uranus: tilt it onto its side', () => {
  function tapsToSolve(band: AgeBand): number {
    const cfg = tiltConfig(band);
    let angle = 0;
    let taps = 0;
    while (!tiltSolved(angle) && taps < 50) {
      const id = bestTiltButton(angle, cfg);
      const b = cfg.buttons.find((x) => x.id === id);
      if (!b) break;
      angle = applyTilt(angle, b.delta, cfg);
      taps++;
    }
    return tiltSolved(angle) ? taps : Infinity;
  }

  it('is solvable in every band, with the easiest path growing with age', () => {
    expect(tapsToSolve('tiny')).toBe(3);
    expect(tapsToSolve('junior')).toBe(7);
    expect(tapsToSolve('senior')).toBeLessThanOrEqual(8);
    expect(URANUS_TILT).toBe(98);
  });

  it('snaps to 98° when close enough (tiny, junior) but demands precision for seniors', () => {
    expect(applyTilt(66, 33, tiltConfig('tiny'))).toBe(98);
    expect(applyTilt(84, 14, tiltConfig('junior'))).toBe(98);
    expect(applyTilt(96, 2, tiltConfig('senior'))).toBe(98);
    expect(applyTilt(80, 20, tiltConfig('senior'))).toBe(100);
    expect(tiltSolved(100)).toBe(false);
  });

  it('never tilts below 0° or past the stop', () => {
    const cfg = tiltConfig('senior');
    expect(applyTilt(0, -2, cfg)).toBe(0);
    expect(applyTilt(cfg.max, 20, cfg)).toBe(cfg.max);
  });

  it('reports dots for tiny/junior and a 0–98 bar for seniors', () => {
    expect(tiltProgress(0, tiltConfig('tiny'))).toEqual({ done: 0, total: 3 });
    expect(tiltProgress(66, tiltConfig('tiny'))).toEqual({ done: 2, total: 3 });
    expect(tiltProgress(98, tiltConfig('tiny'))).toEqual({ done: 3, total: 3 });
    expect(tiltProgress(98, tiltConfig('junior'))).toEqual({ done: 7, total: 7 });
    expect(tiltProgress(60, tiltConfig('senior'))).toEqual({ done: 60, total: 98 });
    expect(tiltProgress(100, tiltConfig('senior'))).toEqual({ done: 96, total: 98 });
  });

  it('highlights the button that gets closest (overshoot → back)', () => {
    const cfg = tiltConfig('senior');
    expect(bestTiltButton(0, cfg)).toBe('big');
    expect(bestTiltButton(100, cfg)).toBe('back');
    expect(bestTiltButton(96, cfg)).toBe('nudge');
    expect(bestTiltButton(98, cfg)).toBeNull();
  });
});
