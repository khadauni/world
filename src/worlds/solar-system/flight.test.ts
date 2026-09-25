import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { FLIGHT_MAX_S, FLIGHT_MIN_S, bezierPoint, bezierTangent, createFlight, damp, easeInOut, flightDuration, minDistance, planFlight, rocketStretch } from './flight';
import { BODIES, STOP_IDS, bodyPosition } from './layout';

const SUN = new Vector3();
const CLEAR = BODIES.sun.radius * 1.55;

function parkingNear(id: (typeof STOP_IDS)[number], clock: number): Vector3 {
  // The Sun's parking spot sits outside its corona, like the director's close-up framing.
  if (id === 'sun') return new Vector3(BODIES.sun.radius * 1.8, BODIES.sun.radius * 0.4, BODIES.sun.radius * 0.6);
  const p = bodyPosition(id, clock, new Vector3());
  // Park beside the body, as the director does (roughly one framed radius out, toward the camera side).
  const out = p.lengthSq() > 0 ? p.clone().normalize() : new Vector3(1, 0, 0);
  return p.addScaledVector(out, -BODIES[id].radius * 1.4).add(new Vector3(0, BODIES[id].radius * 0.4, 0));
}

describe('rocket flights', () => {
  it('start and end exactly where asked', () => {
    const f = createFlight();
    const a = new Vector3(20, 1, 3);
    const b = new Vector3(-30, 0, 10);
    planFlight(a, b, SUN, CLEAR, f);
    expect(bezierPoint(f, 0, new Vector3()).distanceTo(a)).toBeLessThan(1e-9);
    expect(bezierPoint(f, 1, new Vector3()).distanceTo(b)).toBeLessThan(1e-9);
  });

  it('never fly through the Sun, between any two stops, at any time on the map', () => {
    const f = createFlight();
    for (const clock of [0, 45, 190, 600]) {
      for (const from of STOP_IDS) {
        for (const to of STOP_IDS) {
          if (from === to) continue;
          planFlight(parkingNear(from, clock), parkingNear(to, clock), SUN, CLEAR, f);
          expect(minDistance(f, SUN, 96), `${from} → ${to} @${clock}`).toBeGreaterThan(CLEAR * 0.97);
        }
      }
    }
  });

  it('take between 3 and ~5 seconds, so the shell’s 9 s safety net never has to step in', () => {
    expect(flightDuration(0)).toBe(FLIGHT_MIN_S);
    expect(flightDuration(10_000)).toBe(FLIGHT_MAX_S);
    expect(FLIGHT_MAX_S + 0.35 + 1.9).toBeLessThan(9);
  });

  it('launch upward first (the nose points up at lift-off)', () => {
    const f = createFlight();
    planFlight(new Vector3(17, 0, 0), new Vector3(34, 0, 0), SUN, CLEAR, f);
    const t = bezierTangent(f, 0.001, new Vector3());
    expect(t.y).toBeGreaterThan(0.5);
    expect(t.length()).toBeCloseTo(1, 6);
  });
});

describe('motion helpers', () => {
  it('ease smoothly and monotonically from 0 to 1', () => {
    let prev = -1;
    for (let i = 0; i <= 100; i++) {
      const v = easeInOut(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(-2)).toBe(0);
    expect(easeInOut(3)).toBe(1);
  });

  it('squash on the wind-up, stretch at top speed, and rest at 1', () => {
    expect(rocketStretch(0, 0.17)).toBeLessThan(0.9);
    expect(rocketStretch(0.5, 2)).toBeGreaterThan(1.1);
    expect(rocketStretch(1, 5)).toBeCloseTo(1, 6);
  });

  it('damp is frame-rate independent and bounded', () => {
    const once = damp(3, 0.1);
    const twice = 1 - (1 - damp(3, 0.05)) ** 2;
    expect(once).toBeCloseTo(twice, 9);
    expect(damp(100, 10)).toBeLessThanOrEqual(1);
    expect(damp(3, 0)).toBe(0);
  });
});
