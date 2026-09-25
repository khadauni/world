import { Vector3 } from 'three';

/**
 * Rocket flight maths (pure, allocation-free in the per-frame paths).
 * A flight is a cubic Bézier that launches upward, arcs over the Solar System (never through the Sun)
 * and glides into a parking spot beside the destination.
 */

export interface Flight {
  readonly p0: Vector3;
  readonly p1: Vector3;
  readonly p2: Vector3;
  readonly p3: Vector3;
  /** Seconds. */
  duration: number;
  /** Straight-line distance between start and end. */
  length: number;
}

export function createFlight(): Flight {
  return { p0: new Vector3(), p1: new Vector3(), p2: new Vector3(), p3: new Vector3(), duration: 1, length: 0 };
}

const UP = new Vector3(0, 1, 0);
const tmp = new Vector3();
const dirH = new Vector3();

export const FLIGHT_MIN_S = 3;
export const FLIGHT_MAX_S = 5.2;

export function flightDuration(length: number): number {
  return Math.min(FLIGHT_MAX_S, Math.max(FLIGHT_MIN_S, 2.4 + length / 20));
}

/**
 * Plan a flight from `from` to `to`, lifting the arc until every sample keeps `clearance` away from `avoid`
 * (the Sun). Mutates and returns `out`.
 */
export function planFlight(from: Vector3, to: Vector3, avoid: Vector3, clearance: number, out: Flight): Flight {
  const length = from.distanceTo(to);
  out.length = length;
  out.duration = flightDuration(length);
  dirH.copy(to).sub(from).setY(0);
  if (dirH.lengthSq() < 1e-8) dirH.set(1, 0, 0);
  dirH.normalize();
  // A flight that starts or ends close to the Sun can't keep more clearance than its own endpoints have.
  const clear = Math.min(clearance, from.distanceTo(avoid) * 0.98, to.distanceTo(avoid) * 0.98);
  let lift = 0.28 * length + 0.6;
  for (let attempt = 0; attempt < 12; attempt++) {
    out.p0.copy(from);
    out.p3.copy(to);
    // Launch: mostly upward, a little toward the target.
    out.p1.copy(from).addScaledVector(UP, lift).addScaledVector(dirH, length * 0.18);
    // Approach: come in from behind and slightly above the parking spot.
    out.p2.copy(to).addScaledVector(UP, lift * 0.55).addScaledVector(dirH, -length * 0.28);
    if (minDistance(out, avoid, 48) >= clear) break;
    lift *= 1.35;
  }
  return out;
}

export function bezierPoint(f: Flight, t: number, out: Vector3): Vector3 {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return out.set(
    a * f.p0.x + b * f.p1.x + c * f.p2.x + d * f.p3.x,
    a * f.p0.y + b * f.p1.y + c * f.p2.y + d * f.p3.y,
    a * f.p0.z + b * f.p1.z + c * f.p2.z + d * f.p3.z,
  );
}

export function bezierTangent(f: Flight, t: number, out: Vector3): Vector3 {
  const u = 1 - t;
  const a = -3 * u * u;
  const b = 3 * u * u - 6 * u * t;
  const c = 6 * u * t - 3 * t * t;
  const d = 3 * t * t;
  out.set(
    a * f.p0.x + b * f.p1.x + c * f.p2.x + d * f.p3.x,
    a * f.p0.y + b * f.p1.y + c * f.p2.y + d * f.p3.y,
    a * f.p0.z + b * f.p1.z + c * f.p2.z + d * f.p3.z,
  );
  if (out.lengthSq() < 1e-10) out.copy(f.p3).sub(f.p0);
  return out.normalize();
}

export function minDistance(f: Flight, point: Vector3, samples: number): number {
  let best = Infinity;
  for (let i = 0; i <= samples; i++) {
    bezierPoint(f, i / samples, tmp);
    best = Math.min(best, tmp.distanceTo(point));
  }
  return best;
}

/** Smooth ease-in-out: gentle launch, cruise, gentle landing. */
export function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Squash-and-stretch for the rocket: squash while winding up, stretch at top speed, bounce on landing.
 * Returns the vertical scale; horizontal scale is its inverse square root (volume preserved).
 */
export function rocketStretch(t: number, elapsed: number): number {
  if (elapsed < 0.35) return 1 - 0.18 * Math.sin((elapsed / 0.35) * Math.PI);
  const speed = t > 0 && t < 1 ? Math.sin(Math.PI * Math.min(1, Math.max(0, t))) : 0;
  return 1 + 0.16 * speed;
}

/** Frame-rate independent exponential smoothing factor. */
export function damp(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * Math.min(dt, 0.25));
}
