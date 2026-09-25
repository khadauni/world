import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  BELT,
  BODIES,
  HERO,
  MOONS,
  MARS_SITE,
  OVERVIEW_DIR,
  OVERVIEW_DIR_PORTRAIT,
  SATURN_RINGS,
  STOP_IDS,
  bodyPosition,
  fitDistance,
  fitView,
  framingDirection,
  freeFraction,
  isBodyId,
  lensShiftPx,
  orbitAngle,
  overviewDir,
  safeFrame,
  stageBasis,
  sunViewYaw,
  taskFraming,
  tiltAxis,
  type BodyId,
} from './layout';

const PLANETS = STOP_IDS.filter((id) => id !== 'sun');

/** How far a body's own system (moons, rings) reaches from its centre, in scene units. */
function reach(id: BodyId): number {
  return BODIES[id].radius * BODIES[id].system;
}

describe('the compact Solar System', () => {
  it('has the nine stops in order from the Sun', () => {
    expect(STOP_IDS).toEqual(['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);
    expect(isBodyId('mars')).toBe(true);
    expect(isBodyId('pluto')).toBe(false);
    expect(isBodyId(null)).toBe(false);
  });

  it('keeps the real size order: Sun > Jupiter > Saturn > Uranus ≈ Neptune > Earth ≈ Venus > Mars > Mercury', () => {
    const r = (id: BodyId) => BODIES[id].radius;
    expect(r('sun')).toBeGreaterThan(r('jupiter'));
    expect(r('jupiter')).toBeGreaterThan(r('saturn'));
    expect(r('saturn')).toBeGreaterThan(r('uranus'));
    expect(r('uranus')).toBeGreaterThanOrEqual(r('neptune'));
    expect(Math.abs(r('uranus') - r('neptune')) / r('uranus')).toBeLessThan(0.1);
    expect(r('neptune')).toBeGreaterThan(r('earth'));
    expect(r('earth')).toBeGreaterThanOrEqual(r('venus'));
    expect(Math.abs(r('earth') - r('venus'))).toBeLessThan(0.1);
    expect(r('venus')).toBeGreaterThan(r('mars'));
    expect(r('mars')).toBeGreaterThan(r('mercury'));
  });

  it('orders orbits outward and never lets neighbouring systems (moons, rings) overlap', () => {
    for (let i = 1; i < PLANETS.length; i++) {
      const a = PLANETS[i - 1] as BodyId;
      const b = PLANETS[i] as BodyId;
      expect(BODIES[b].orbit, `${b} beyond ${a}`).toBeGreaterThan(BODIES[a].orbit);
      expect(BODIES[a].orbit + reach(a), `${a} and ${b} systems overlap`).toBeLessThan(BODIES[b].orbit - reach(b));
    }
    expect(BODIES.mercury.orbit - reach('mercury')).toBeGreaterThan(BODIES.sun.radius * BODIES.sun.system);
  });

  it('puts the asteroid belt between the Mars and Jupiter systems', () => {
    expect(BELT.inner).toBeGreaterThan(BODIES.mars.orbit + reach('mars'));
    expect(BELT.outer).toBeLessThan(BODIES.jupiter.orbit - reach('jupiter'));
  });

  it('fits every moon and ring inside its planet’s declared system', () => {
    const moonReach = (id: 'earth' | 'mars' | 'jupiter') => Math.max(...Object.values(MOONS[id]).map((m) => m.orbit + m.radius));
    expect(moonReach('earth')).toBeLessThanOrEqual(BODIES.earth.system);
    expect(moonReach('mars')).toBeLessThanOrEqual(BODIES.mars.system);
    expect(moonReach('jupiter')).toBeLessThanOrEqual(BODIES.jupiter.system);
    expect(SATURN_RINGS.outer).toBeLessThanOrEqual(BODIES.saturn.system);
    // Galilean moons really are in order Io → Europa → Ganymede → Callisto, and Ganymede is the biggest.
    const j = MOONS.jupiter;
    expect(j.io.orbit).toBeLessThan(j.europa.orbit);
    expect(j.europa.orbit).toBeLessThan(j.ganymede.orbit);
    expect(j.ganymede.orbit).toBeLessThan(j.callisto.orbit);
    expect(j.ganymede.radius).toBeGreaterThan(j.callisto.radius);
  });

  it('tilts Uranus onto its side (~98°) and flips Venus (retrograde)', () => {
    expect((BODIES.uranus.tilt * 180) / Math.PI).toBeCloseTo(97.8, 0);
    expect((BODIES.venus.tilt * 180) / Math.PI).toBeGreaterThan(170);
  });

  it('orbits obey Kepler: inner planets go round faster', () => {
    const angle = (id: BodyId) => orbitAngle(id, 100) - orbitAngle(id, 0);
    for (let i = 1; i < PLANETS.length; i++) expect(angle(PLANETS[i - 1] as BodyId)).toBeGreaterThan(angle(PLANETS[i] as BodyId));
  });

  it('places bodies on circles of their orbit radius, deterministically', () => {
    const v = new Vector3();
    for (const id of PLANETS) {
      for (const t of [0, 37, 1000]) {
        bodyPosition(id, t, v);
        expect(v.length()).toBeCloseTo(BODIES[id].orbit, 6);
        expect(v.y).toBe(0);
      }
    }
    expect(bodyPosition('sun', 50, v).length()).toBe(0);
  });

  it('starts the map as a zig-zag line-up so tags alternate above and below', () => {
    const sides = PLANETS.map((id) => Math.sign(BODIES[id].phase));
    for (let i = 1; i < sides.length; i++) expect(sides[i]).toBe(-(sides[i - 1] as number));
  });
});

describe('camera framing', () => {
  it('fits a sphere exactly: its angular size matches the requested fill', () => {
    const d = fitDistance(2, 45, 16 / 10, 0.5, 0.9);
    const half = Math.asin(2 / d);
    expect(Math.tan(half) / Math.tan((22.5 * Math.PI) / 180)).toBeCloseTo(0.5, 5);
  });

  it('uses the narrower side on portrait screens', () => {
    expect(fitDistance(1, 45, 0.75, 0.6, 0.6)).toBeGreaterThan(fitDistance(1, 45, 1.6, 0.6, 0.6));
  });

  it('frames every close-up from the lit side and above the orbital plane', () => {
    const pos = new Vector3();
    const dir = new Vector3();
    for (const id of PLANETS) {
      bodyPosition(id, 0, pos);
      framingDirection(id, pos, HERO[id].yaw, HERO[id].pitch, dir);
      expect(dir.length()).toBeCloseTo(1, 6);
      expect(dir.y, `${id} camera above the plane`).toBeGreaterThan(0);
      for (const band of ['tiny', 'junior', 'senior'] as const) {
        const f = taskFraming(id, band);
        framingDirection(id, pos, f.yaw, f.pitch, dir);
        const toSun = pos.clone().negate().setY(0).normalize();
        expect(dir.dot(toSun), `${id} task view sees the day side`).toBeGreaterThan(0.2);
      }
    }
  });

  it('builds a right-handed, screen-aligned stage basis', () => {
    const b = stageBasis(new Vector3(0.3, 0.4, 0.8), { right: new Vector3(), up: new Vector3(), fwd: new Vector3() });
    expect(b.right.dot(b.up)).toBeCloseTo(0, 6);
    expect(b.right.dot(b.fwd)).toBeCloseTo(0, 6);
    expect(b.right.clone().cross(b.up).dot(b.fwd)).toBeCloseTo(1, 6);
    expect(b.right.y).toBeCloseTo(0, 6);
  });

  it('frames the whole system on the map', () => {
    const points = STOP_IDS.map((id) => ({ p: bodyPosition(id, 0, new Vector3()), r: BODIES[id].radius * 1.5 }));
    const out = { target: new Vector3(), distance: 0 };
    fitView(points, OVERVIEW_DIR, 45, 1.6, 0.94, 0.5, out);
    const cam = out.target.clone().addScaledVector(OVERVIEW_DIR, out.distance);
    const tanV = Math.tan((22.5 * Math.PI) / 180);
    const basis = stageBasis(OVERVIEW_DIR, { right: new Vector3(), up: new Vector3(), fwd: new Vector3() });
    for (const { p, r } of points) {
      const rel = p.clone().sub(cam);
      const depth = -rel.dot(basis.fwd);
      expect(depth).toBeGreaterThan(r);
      expect(Math.abs(rel.dot(basis.up)) + r).toBeLessThanOrEqual(depth * tanV * 0.5 + 1e-6);
      expect(Math.abs(rel.dot(basis.right)) + r).toBeLessThanOrEqual(depth * tanV * 1.6 * 0.94 + 1e-6);
    }
  });

  it('turns the map diagonally on portrait screens so the line-up uses the height too', () => {
    expect(overviewDir(16 / 10)).toBe(OVERVIEW_DIR);
    expect(overviewDir(768 / 1024)).toBe(OVERVIEW_DIR_PORTRAIT);
    // The line-up (+x) recedes from the camera on portrait, and runs across the screen on landscape.
    expect(OVERVIEW_DIR_PORTRAIT.x).toBeLessThan(-0.4);
    expect(Math.abs(OVERVIEW_DIR.x)).toBeLessThan(0.2);
  });

  it('frames the Mars rover site on the camera-facing surface', () => {
    const f = taskFraming('mars', 'junior');
    expect(f.look).toBeDefined();
    const look = new Vector3(...(f.look ?? [0, 0, 0]));
    expect(look.length()).toBeLessThanOrEqual(1);
    expect(look.length()).toBeGreaterThan(0.8);
    expect(new Vector3(...MARS_SITE).normalize().z).toBeGreaterThan(0.5);
  });

  it('chooses a Sun view with no inner planet in front', () => {
    const yaw = sunViewYaw([0, 0.3, -0.4, 0.1]);
    const gap = Math.min(...[0, 0.3, -0.4, 0.1].map((a) => Math.abs(Math.atan2(Math.sin(yaw - a), Math.cos(yaw - a)))));
    expect(gap).toBeGreaterThan(2.5);
  });

  it('keeps tilt axes horizontal', () => {
    const v = new Vector3();
    for (const id of STOP_IDS) {
      tiltAxis(id, bodyPosition(id, 12, new Vector3()), v);
      expect(v.y).toBeCloseTo(0, 6);
      expect(v.length()).toBeCloseTo(1, 6);
    }
  });
});

describe('HUD-aware framing', () => {
  it('shifts the picture up when the bottom HUD is tall and down when the task banner is showing', () => {
    expect(lensShiftPx(safeFrame('map', null, 800))).toBeGreaterThan(0);
    expect(lensShiftPx(safeFrame('explore', 'earth', 800))).toBeGreaterThan(0);
    expect(lensShiftPx(safeFrame('task', 'earth', 800))).toBeLessThan(0);
  });

  it('never reserves more than about two thirds of a small screen', () => {
    const f = safeFrame('map', null, 360);
    expect(f.top + f.bottom).toBeLessThanOrEqual(360 * 0.7);
    expect(freeFraction(f, 360)).toBeGreaterThanOrEqual(0.3);
  });
});
