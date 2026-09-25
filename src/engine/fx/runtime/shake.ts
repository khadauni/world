import type { ShakeProfile } from '../store/fxStore';

/**
 * Smooth, deterministic 1D gradient (Perlin) noise in [-1, 1]. Zero at integer lattice points, C2-continuous
 * (quintic fade), so shake built from it never "pops".
 */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const g0 = gradient(i, seed);
  const g1 = gradient(i + 1, seed);
  const d0 = g0 * f;
  const d1 = g1 * (f - 1);
  const u = f * f * f * (f * (f * 6 - 15) + 10);
  return (d0 + (d1 - d0) * u) * 2;
}

/** Hashed lattice gradient in [-1, 1]. */
function gradient(i: number, seed: number): number {
  let h = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul(seed | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

/** Camera offsets for one frame of shake (camera-local): translation in world units, rotation in radians. */
export interface ShakeOffsets {
  x: number;
  y: number;
  yaw: number;
  pitch: number;
  roll: number;
}

export function createShakeOffsets(): ShakeOffsets {
  return { x: 0, y: 0, yaw: 0, pitch: 0, roll: 0 };
}

/**
 * Trauma-style shake sample: each axis follows its own smooth noise track, scaled by `amount` (0..1, already
 * trauma²) and the profile maxima. Writes into `out` (no allocation) and returns it.
 */
export function shakeOffsets(time: number, amount: number, profile: ShakeProfile, out: ShakeOffsets): ShakeOffsets {
  const a = amount <= 0 ? 0 : amount >= 1 ? 1 : amount;
  const t = time * profile.frequency;
  out.x = profile.maxOffset * a * noise1(t, 11);
  out.y = profile.maxOffset * a * noise1(t, 23);
  out.yaw = profile.maxAngle * a * noise1(t, 37);
  out.pitch = profile.maxAngle * a * noise1(t, 41);
  out.roll = profile.maxRoll * a * noise1(t * 0.8, 53);
  return out;
}
