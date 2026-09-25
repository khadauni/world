/**
 * Orbit-raising maths for the Earth-orbit stop.
 *
 * The ellipse is real geometry (Earth at one focus, r = a(1−e²)/(1+e·cos ν)). The craft's motion uses a
 * softened "faster near perigee" rule, dν/dt = c·(1 + k·cos ν), so children can see the swing-like speed-up
 * without the perigee pass becoming too quick to tap. With k = 0 the motion is uniform.
 */

export interface Ellipse {
  /** Semi-major axis. */
  readonly a: number;
  /** Eccentricity (0 = circle). */
  readonly e: number;
}

export function ellipseFromApsides(perigee: number, apogee: number): Ellipse {
  const rp = Math.min(perigee, apogee);
  const ra = Math.max(perigee, apogee);
  return { a: (rp + ra) / 2, e: (ra - rp) / (ra + rp) };
}

/** Distance from the focus at true anomaly ν (ν = 0 at perigee). */
export function radiusAt(nu: number, el: Ellipse): number {
  return (el.a * (1 - el.e * el.e)) / (1 + el.e * Math.cos(nu));
}

/** Wrap an angle to (−π, π]. */
export function wrapAngle(x: number): number {
  const t = (x + Math.PI) % (2 * Math.PI);
  return (t < 0 ? t + 2 * Math.PI : t) - Math.PI;
}

export function inPerigeeZone(nu: number, halfAngle: number): boolean {
  return Math.abs(wrapAngle(nu)) <= halfAngle;
}

/** The base rate c so one loop takes `period` seconds for a given perigee speed-up k (0 ≤ k < 1). */
export function baseRate(period: number, k: number): number {
  return (2 * Math.PI) / (period * Math.sqrt(1 - k * k));
}

/** dν/dt at anomaly ν. */
export function anomalyRate(nu: number, period: number, k: number): number {
  return baseRate(period, k) * (1 + k * Math.cos(nu));
}

/** Seconds spent inside the ±halfAngle perigee zone per loop (analytic). */
export function zoneSeconds(halfAngle: number, period: number, k: number): number {
  const c = baseRate(period, k);
  const s = Math.sqrt(1 - k * k);
  const inner = Math.atan(Math.sqrt((1 - k) / (1 + k)) * Math.tan(halfAngle / 2));
  return (2 / c) * (2 / s) * inner;
}

/** Advance ν by dt seconds (sub-stepped so large frame gaps stay accurate). */
export function advanceAnomaly(nu: number, dt: number, period: number, k: number): number {
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / steps;
  let v = nu;
  for (let i = 0; i < steps; i++) v += anomalyRate(v, period, k) * h;
  return v % (2 * Math.PI);
}

/**
 * Apogee after `boosts` good burns, growing from `start` towards `max` with slightly shrinking steps
 * (each burn visibly enlarges the orbit, the last one reaches the target).
 */
export function apogeeAfter(boosts: number, total: number, start: number, max: number): number {
  if (total <= 0) return max;
  const f = Math.min(1, Math.max(0, boosts / total));
  return start + (max - start) * (1 - Math.pow(1 - f, 1.4));
}

/** Position in the orbit plane (x along the perigee direction, y along the direction of motion). */
export function pointOnEllipse(nu: number, el: Ellipse): { x: number; y: number } {
  const r = radiusAt(nu, el);
  return { x: r * Math.cos(nu), y: r * Math.sin(nu) };
}
