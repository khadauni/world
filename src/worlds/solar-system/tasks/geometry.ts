import { Quaternion, Vector3 } from 'three';
import { mulberry32 } from '@/core/random';

/**
 * Pure placement helpers for tasks (unit-tested). Stage space: x right, y up, z toward the camera,
 * lengths in body radii.
 */

/**
 * `n` well-spread directions on the camera-facing cap of a sphere (within `maxAngle` of +z), via a jittered
 * sunflower spiral. Deterministic for a given seed. Keeps targets away from the very edge where they'd be
 * foreshortened and hard to tap.
 */
export function capPoints(n: number, maxAngle: number, seed = 1): Vector3[] {
  const rand = mulberry32(seed);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const out: Vector3[] = [];
  const cosMax = Math.cos(maxAngle);
  const offset = rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0.35 : (i + 0.5) / n;
    const cosT = 1 - f * (1 - cosMax);
    const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
    const phi = offset + i * golden + (rand() - 0.5) * 0.25;
    out.push(new Vector3(Math.cos(phi) * sinT, Math.sin(phi) * sinT, cosT));
  }
  return out;
}

export function minSeparation(points: readonly Vector3[]): number {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      best = Math.min(best, (points[i] as Vector3).angleTo(points[j] as Vector3));
    }
  }
  return best;
}

const X_AXIS = new Vector3(1, 0, 0);
const Z_AXIS = new Vector3(0, 0, 1);

/**
 * The Mars mission layout around the rover's work site (stage space, unit directions): `count` rock samples
 * scattered a little beyond the site (up the screen), and the rover's start nearer the camera (low on the screen),
 * well clear of every rock, so it visibly drives out to each one.
 */
export function marsLayout(count: number, site: Vector3, seed = 5): { start: Vector3; rocks: Vector3[] } {
  const s = site.clone().normalize();
  const field = s.clone().applyAxisAngle(X_AXIS, -0.1);
  const onto = new Quaternion().setFromUnitVectors(Z_AXIS, field);
  return {
    start: s.clone().applyAxisAngle(X_AXIS, 0.42),
    rocks: capPoints(count, 0.3, seed).map((p) => p.applyQuaternion(onto).normalize()),
  };
}

/** Evenly spread orbit phases with a little jitter so moving targets never bunch up. */
export function spreadPhases(n: number, seed = 1): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => (i / Math.max(1, n)) * Math.PI * 2 + (rand() - 0.5) * 0.4);
}

/** Azimuth used by a Y-axis spin: rotation.y = θ adds θ to this angle. */
export function azimuth(v: Vector3): number {
  return Math.atan2(-v.z, v.x);
}

const inv = new Quaternion();
const local = new Vector3();

/**
 * Spin angle (rotation about the body's own axis) that turns a surface feature (`featureDir`, body space)
 * toward `viewDir` (world), given the body's tilt quaternion.
 */
export function spinToFace(featureDir: Vector3, viewDir: Vector3, tilt: Quaternion): number {
  inv.copy(tilt).invert();
  local.copy(viewDir).applyQuaternion(inv);
  return azimuth(local) - azimuth(featureDir);
}

/** Move angle `from` a fraction `k` (0..1) of the way toward `to`, the short way round (radians). */
export function easeAngle(from: number, to: number, k: number): number {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;
}

/** Point on a unit sphere moving along the great circle from a to b (t in 0..1). */
export function slerpDir(a: Vector3, b: Vector3, t: number, out: Vector3): Vector3 {
  const angle = a.angleTo(b);
  if (angle < 1e-5) return out.copy(b);
  const s = Math.sin(angle);
  const wa = Math.sin((1 - t) * angle) / s;
  const wb = Math.sin(t * angle) / s;
  return out.set(a.x * wa + b.x * wb, a.y * wa + b.y * wb, a.z * wa + b.z * wb).normalize();
}
