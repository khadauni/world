import { MathUtils, Vector3 } from 'three';
import type { AgeBand, FlowPhase } from '@/core/types';

/**
 * The stylised, compact Solar System: every size, distance, speed and camera framing lives here as plain data
 * + pure maths, so it can be unit-tested and the 3D components stay small.
 *
 * Distances are squeezed and sizes exaggerated (the real Solar System would be almost all empty space),
 * but the ORDER is right: Sun > Jupiter > Saturn > Uranus ≈ Neptune > Earth ≈ Venus > Mars > Mercury.
 */

export const STOP_IDS = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const;
export type BodyId = (typeof STOP_IDS)[number];

export function isBodyId(id: string | null | undefined): id is BodyId {
  return !!id && (STOP_IDS as readonly string[]).includes(id);
}

export interface BodyDef {
  readonly id: BodyId;
  /** Visual radius in scene units. */
  readonly radius: number;
  /** Orbit radius around the Sun (0 for the Sun). */
  readonly orbit: number;
  /** Real sidereal orbital period in Earth years — keeps the relative orbit speeds honest (Kepler). */
  readonly periodYears: number;
  /** Starting orbital angle (radians): a gentle zig-zag "line-up" so every planet is easy to spot on the map. */
  readonly phase: number;
  /** Axial tilt (radians) — Uranus really does lie on its side. */
  readonly tilt: number;
  /** How far the tilt axis swings away from the close-up line of sight (radians). 0 = a pure sideways lean. */
  readonly tiltAz: number;
  /** Visual spin speed (rad/s). Negative = retrograde (Venus, Uranus). */
  readonly spin: number;
  /**
   * How far the body's "system" reaches, in body radii (rings, moons, corona). Used to keep neighbours apart
   * and to frame hero shots.
   */
  readonly system: number;
  /** Framing radius for the explore close-up, in body radii. */
  readonly heroFit: number;
}

const deg = MathUtils.degToRad;

/** Radians of zig-zag off the line-up axis, so name tags alternate and nothing overlaps. */
function lineup(orbit: number, side: 1 | -1): number {
  return side * Math.asin(Math.min(0.5, 3.2 / orbit));
}

export const BODIES: Readonly<Record<BodyId, BodyDef>> = {
  sun: { id: 'sun', radius: 4.5, orbit: 0, periodYears: 1, phase: 0, tilt: deg(7.25), tiltAz: 0, spin: 0.035, system: 1.45, heroFit: 1.38 },
  mercury: { id: 'mercury', radius: 0.5, orbit: 10, periodYears: 0.241, phase: lineup(10, 1), tilt: deg(0.03), tiltAz: 0, spin: 0.02, system: 1.4, heroFit: 1.25 },
  venus: { id: 'venus', radius: 0.95, orbit: 13.5, periodYears: 0.615, phase: lineup(13.5, -1), tilt: deg(177.4), tiltAz: 0, spin: 0.018, system: 1.3, heroFit: 1.25 },
  earth: { id: 'earth', radius: 1, orbit: 17.5, periodYears: 1, phase: lineup(17.5, 1), tilt: deg(23.4), tiltAz: deg(22), spin: 0.07, system: 2.35, heroFit: 1.25 },
  mars: { id: 'mars', radius: 0.7, orbit: 22, periodYears: 1.881, phase: lineup(22, -1), tilt: deg(25.2), tiltAz: deg(-18), spin: 0.07, system: 2.7, heroFit: 1.25 },
  jupiter: { id: 'jupiter', radius: 2.8, orbit: 34.5, periodYears: 11.86, phase: lineup(34.5, 1), tilt: deg(3.1), tiltAz: 0, spin: 0.12, system: 2.4, heroFit: 1.28 },
  saturn: { id: 'saturn', radius: 2.4, orbit: 47.5, periodYears: 29.46, phase: lineup(47.5, -1), tilt: deg(26.7), tiltAz: deg(62), spin: 0.11, system: 2.35, heroFit: 2.1 },
  uranus: { id: 'uranus', radius: 1.5, orbit: 57, periodYears: 84.01, phase: lineup(57, 1), tilt: deg(97.8), tiltAz: deg(34), spin: 0.09, system: 2.1, heroFit: 1.75 },
  neptune: { id: 'neptune', radius: 1.45, orbit: 64.5, periodYears: 164.8, phase: lineup(64.5, -1), tilt: deg(28.3), tiltAz: deg(20), spin: 0.08, system: 2.6, heroFit: 1.3 },
};

/**
 * Signature surface features (latitude, longitude in degrees) turned toward the camera as the rocket arrives,
 * `lead` radians before centre so the planet's own spin brings them into view.
 */
export const FEATURES: Partial<Record<BodyId, { readonly lat: number; readonly lon: number; readonly lead: number }>> = {
  earth: { lat: 8, lon: 18, lead: 0.35 },
  mars: { lat: 18.65, lon: -133.8, lead: 1.15 },
  jupiter: { lat: -22, lon: 40, lead: 0.55 },
  neptune: { lat: -22, lon: 60, lead: 0.45 },
};

/** Asteroid belt between Mars and Jupiter (scene units from the Sun). */
export const BELT = { inner: 24.2, outer: 27.4, thickness: 0.9 } as const;

/** Moons and rings, in units of the parent's radius (compressed, but in the right order). */
export const MOONS = {
  earth: { moon: { orbit: 2.05, radius: 0.27, period: 38 } },
  mars: {
    phobos: { orbit: 1.75, radius: 0.13, period: 9 },
    deimos: { orbit: 2.55, radius: 0.09, period: 22 },
  },
  jupiter: {
    io: { orbit: 1.4, radius: 0.1, period: 9 },
    europa: { orbit: 1.66, radius: 0.088, period: 18 },
    ganymede: { orbit: 1.94, radius: 0.14, period: 36 },
    callisto: { orbit: 2.25, radius: 0.128, period: 84 },
  },
} as const;

/** Saturn's rings in Saturn radii (real proportions: C 1.24–1.53, B 1.53–1.95, Cassini 1.95–2.03, A 2.03–2.27). */
export const SATURN_RINGS = { inner: 1.24, outer: 2.32 } as const;
export const URANUS_RINGS = { inner: 1.6, outer: 2.02 } as const;
export const NEPTUNE_RINGS = { inner: 2.1, outer: 2.56 } as const;

export const GALILEAN = ['io', 'europa', 'ganymede', 'callisto'] as const;
export type GalileanMoon = (typeof GALILEAN)[number];

/** Seconds of map time for one Earth year. Other planets follow their real period ratios. */
export const EARTH_YEAR_SECONDS = 900;

export function orbitAngle(id: BodyId, clock: number): number {
  const b = BODIES[id];
  return b.phase + (Math.PI * 2 * clock) / (b.periodYears * EARTH_YEAR_SECONDS);
}

/** Position of a body on its (circular, coplanar) orbit. Counter-clockwise seen from above, like the real planets. */
export function bodyPosition(id: BodyId, clock: number, out: Vector3): Vector3 {
  const b = BODIES[id];
  if (b.orbit === 0) return out.set(0, 0, 0);
  const a = orbitAngle(id, clock);
  return out.set(Math.cos(a) * b.orbit, 0, -Math.sin(a) * b.orbit);
}

// ---------------------------------------------------------------------------
// Camera framing
// ---------------------------------------------------------------------------

export interface Framing {
  /** Rotation (radians) of the camera around the body, measured from the body→Sun direction (Sun: from +x). */
  readonly yaw: number;
  /** Camera elevation above the orbital plane (radians). */
  readonly pitch: number;
  /** Radius to keep in frame, in body radii. */
  readonly fit: number;
  /**
   * Optional point to look at instead of the body's centre, in task-stage units (x right, y up, z toward the
   * camera; body radii) — e.g. a spot on the surface for a close-up of the Mars rover.
   */
  readonly look?: readonly [number, number, number];
  /** Where the rocket waits during the task, relative to the look point, in units of the framed radius. */
  readonly park?: readonly [number, number, number];
}

/** Where the Mars rover works: high on the camera-facing side, so the ground is seen at a friendly angle. */
export const MARS_SITE: readonly [number, number, number] = [0, 0.74, 0.67];

export const HERO: Readonly<Record<BodyId, Framing>> = {
  sun: { yaw: 0, pitch: deg(20), fit: BODIES.sun.heroFit },
  mercury: { yaw: deg(118), pitch: deg(12), fit: BODIES.mercury.heroFit },
  venus: { yaw: deg(-42), pitch: deg(14), fit: BODIES.venus.heroFit },
  earth: { yaw: deg(48), pitch: deg(16), fit: BODIES.earth.heroFit },
  mars: { yaw: deg(-68), pitch: deg(8), fit: BODIES.mars.heroFit },
  jupiter: { yaw: deg(36), pitch: deg(10), fit: BODIES.jupiter.heroFit },
  saturn: { yaw: deg(-38), pitch: deg(21), fit: BODIES.saturn.heroFit },
  uranus: { yaw: deg(44), pitch: deg(10), fit: BODIES.uranus.heroFit },
  neptune: { yaw: deg(-40), pitch: deg(12), fit: BODIES.neptune.heroFit },
};

/** Task close-ups: framed for the interaction (e.g. Jupiter zooms out so all four moons fit). */
export function taskFraming(id: BodyId, band: AgeBand): Framing {
  const h = HERO[id];
  switch (id) {
    case 'sun':
      return { ...h, pitch: deg(14), fit: 1.75 };
    case 'mercury':
      return { yaw: deg(38), pitch: deg(18), fit: 1.12 };
    case 'venus':
      return { ...h, yaw: deg(-26), fit: 1.2 };
    case 'earth':
      return { ...h, yaw: deg(34), fit: band === 'tiny' ? 2.45 : 2.3 };
    case 'mars':
      return { yaw: deg(-30), pitch: deg(18), fit: 0.5, look: [MARS_SITE[0] * 0.95, MARS_SITE[1] * 0.95, MARS_SITE[2] * 0.95], park: [1.35, 0.7, 0.2] };
    case 'jupiter':
      // Tiny: a big Jupiter with the camera aimed a little low, so the Great Red Spot sits near the middle.
      return band === 'tiny' ? { ...h, yaw: deg(22), fit: 1.36, look: [0, -0.3, 0] } : { ...h, yaw: deg(24), pitch: deg(16), fit: 2.3 };
    case 'saturn':
      return { ...h, pitch: deg(26), fit: 2.35 };
    case 'uranus':
      return { ...h, yaw: deg(30), fit: 2.15 };
    case 'neptune':
      return { ...h, yaw: deg(-25), fit: 1.85 };
  }
}

const UP = new Vector3(0, 1, 0);
const tmpA = new Vector3();

/** Unit vector from the body toward where the camera should sit. */
export function framingDirection(id: BodyId, bodyPos: Vector3, yaw: number, pitch: number, out: Vector3): Vector3 {
  if (id === 'sun' || bodyPos.lengthSq() < 1e-6) out.set(1, 0, 0);
  else out.copy(bodyPos).negate().setY(0).normalize();
  out.applyAxisAngle(UP, yaw);
  return out.multiplyScalar(Math.cos(pitch)).addScaledVector(UP, Math.sin(pitch)).normalize();
}

/**
 * The Sun close-up must not have a planet parked in front of it: pick the viewing azimuth farthest from every
 * inner planet (orbit angles, radians). Returns a yaw for `framingDirection('sun', …)`.
 */
export function sunViewYaw(planetAngles: readonly number[]): number {
  let best = 0;
  let bestGap = -1;
  for (let k = 0; k < 36; k++) {
    const yaw = (k / 36) * Math.PI * 2;
    let gap = Math.PI;
    for (const a of planetAngles) gap = Math.min(gap, Math.abs(Math.atan2(Math.sin(yaw - a), Math.cos(yaw - a))));
    if (gap > bestGap + 1e-9) {
      best = yaw;
      bestGap = gap;
    }
  }
  return best;
}

/**
 * Axis the body's tilt rotates around. Chosen relative to the close-up camera so the tilt reads clearly on
 * screen (Earth leans like a desk globe, Uranus lies on its side with its rings opened toward the camera).
 */
export function tiltAxis(id: BodyId, bodyPos: Vector3, out: Vector3): Vector3 {
  const b = BODIES[id];
  // Rotating about (nearly) the line of sight makes the lean happen in the picture — like a desk globe, or
  // Uranus rolling over onto its side. tiltAz swings the axis a little so rings open into ellipses.
  framingDirection(id, bodyPos, HERO[id].yaw, 0, out);
  return out.applyAxisAngle(UP, b.tiltAz).normalize();
}

/**
 * Camera distance so that a sphere of `radius` fills `fillH` of the screen height and at most `fillW` of its width.
 * Exact for a sphere (uses the tangent cone), so it also works for close-ups.
 */
export function fitDistance(radius: number, fovYDeg: number, aspect: number, fillH: number, fillW: number): number {
  const tanV = Math.tan(MathUtils.degToRad(fovYDeg) / 2);
  const tanH = tanV * aspect;
  const angV = Math.atan(tanV * fillH);
  const angH = Math.atan(tanH * fillW);
  const ang = Math.min(angV, angH);
  return radius / Math.sin(ang);
}

export interface StageBasis {
  readonly right: Vector3;
  readonly up: Vector3;
  readonly fwd: Vector3;
}

/** Screen-aligned basis for a camera looking along -fwd: tasks lay out targets in "x right, y up, z toward you". */
export function stageBasis(fwd: Vector3, out: StageBasis): StageBasis {
  out.fwd.copy(fwd).normalize();
  out.right.crossVectors(UP, out.fwd);
  if (out.right.lengthSq() < 1e-8) out.right.set(1, 0, 0);
  out.right.normalize();
  out.up.crossVectors(out.fwd, out.right).normalize();
  return out;
}

export interface FitPoint {
  readonly p: Vector3;
  readonly r: number;
}

/** Scratch basis for fitView (it runs every frame on the map, so it must not allocate). */
const fitBasis: StageBasis = { right: new Vector3(), up: new Vector3(), fwd: new Vector3() };

/**
 * Frame a set of spheres from a fixed viewing direction (the overview map). Returns the look-at target and
 * the camera distance needed so every sphere fits inside `fill` of the (lens-shifted) safe frame.
 * Allocation-free: safe to call per frame.
 */
export function fitView(points: readonly FitPoint[], dir: Vector3, fovYDeg: number, aspect: number, fillW: number, fillH: number, out: { target: Vector3; distance: number }) {
  const basis = stageBasis(dir, fitBasis);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const { p, r } of points) {
    const x = p.dot(basis.right);
    const y = p.dot(basis.up);
    const z = p.dot(basis.fwd);
    minX = Math.min(minX, x - r);
    maxX = Math.max(maxX, x + r);
    minY = Math.min(minY, y - r);
    maxY = Math.max(maxY, y + r);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  out.target.copy(basis.right).multiplyScalar(cx).addScaledVector(basis.up, cy).addScaledVector(basis.fwd, cz);
  const tanV = Math.tan(MathUtils.degToRad(fovYDeg) / 2) * fillH;
  const tanH = Math.tan(MathUtils.degToRad(fovYDeg) / 2) * aspect * fillW;
  let d = 1;
  for (const { p, r } of points) {
    tmpA.copy(p).sub(out.target);
    const dx = Math.abs(tmpA.dot(basis.right)) + r;
    const dy = Math.abs(tmpA.dot(basis.up)) + r;
    const dz = tmpA.dot(basis.fwd);
    d = Math.max(d, dz + dx / tanH, dz + dy / tanV, dz + r * 2.5);
  }
  out.distance = d;
  return out;
}

/** Direction the overview camera looks from: in front of the line-up, raised so the orbits read as ellipses. */
export const OVERVIEW_DIR = new Vector3(0, Math.sin(deg(31)), Math.cos(deg(31))).applyAxisAngle(UP, deg(-8)).normalize();
/** On tall (portrait) screens the line-up runs diagonally away from the camera, using the height too. */
export const OVERVIEW_DIR_PORTRAIT = new Vector3(0, Math.sin(deg(40)), Math.cos(deg(40))).applyAxisAngle(UP, deg(-48)).normalize();

export function overviewDir(aspect: number): Vector3 {
  return aspect < 0.95 ? OVERVIEW_DIR_PORTRAIT : OVERVIEW_DIR;
}

// ---------------------------------------------------------------------------
// HUD-aware framing: how much of the screen each phase leaves free
// ---------------------------------------------------------------------------

export interface SafeFrame {
  /** Pixels covered at the top / bottom by the HUD in this phase. */
  readonly top: number;
  readonly bottom: number;
}

export function safeFrame(phase: FlowPhase, stopId: string | null, height: number): SafeFrame {
  const cap = (v: number) => Math.min(v, height * 0.34);
  switch (phase) {
    case 'intro':
      return { top: cap(84), bottom: cap(250) };
    case 'map':
      return { top: cap(84), bottom: cap(300) };
    case 'travel':
      return { top: cap(140), bottom: 0 };
    case 'explore':
      return { top: cap(84), bottom: cap(250) };
    case 'task':
      return { top: cap(150), bottom: stopId === 'uranus' ? cap(170) : cap(20) };
    default:
      return { top: cap(84), bottom: cap(60) };
  }
}

/** Vertical lens shift (px, + moves the picture up) that centres the scene in the free area. */
export function lensShiftPx(frame: SafeFrame): number {
  return (frame.bottom - frame.top) / 2;
}

/** Fraction of the full screen height that is free. */
export function freeFraction(frame: SafeFrame, height: number): number {
  return Math.max(0.3, (height - frame.top - frame.bottom) / Math.max(1, height));
}
