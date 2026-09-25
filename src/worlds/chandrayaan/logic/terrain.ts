import { mulberry32 } from '@/core/random';

/**
 * Procedural lunar terrain near the south pole: bowl-shaped craters with raised rims on gently rolling
 * regolith, plus flat "safe spots" (the landing site). Pure and deterministic so the rover can drive on
 * exactly the ground that is rendered, and so it can be unit-tested.
 */
export interface Crater {
  readonly x: number;
  readonly z: number;
  readonly r: number;
  readonly depth: number;
}

export interface FlatSpot {
  readonly x: number;
  readonly z: number;
  readonly r: number;
}

export interface TerrainSpec {
  readonly seed: number;
  readonly size: number;
  readonly craters: number;
  readonly flats: readonly FlatSpot[];
  /** Extra hand-placed craters (hero craters framing a shot). */
  readonly hero?: readonly Crater[];
  /** Horizon drop-off (fake curvature), units per unit² from the centre. */
  readonly curvature?: number;
}

/** Crater cross-section: bowl inside (d < 1) and a soft rim just outside. d = distance / radius. */
export function craterProfile(d: number): number {
  if (d < 1) return d * d - 1 + 0.35 * Math.exp(-((d - 1) * (d - 1)) / 0.02);
  return 0.35 * Math.exp(-((d - 1) * (d - 1)) / 0.06);
}

function hash2(ix: number, iz: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 2D value noise in [-1, 1]. */
export function valueNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return (a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz) * 2 - 1;
}

export interface Terrain {
  readonly spec: TerrainSpec;
  readonly craters: readonly Crater[];
  height(x: number, z: number): number;
}

export function makeTerrain(spec: TerrainSpec): Terrain {
  const rand = mulberry32(spec.seed);
  const list: Crater[] = [...(spec.hero ?? [])];
  const half = spec.size / 2;
  let guard = 0;
  while (list.length < spec.craters + (spec.hero?.length ?? 0) && guard++ < spec.craters * 20) {
    const r = 0.6 + Math.pow(rand(), 2.6) * 7;
    const x = (rand() * 2 - 1) * half;
    const z = (rand() * 2 - 1) * half;
    // Keep safe spots clear of crater bowls and rims.
    if (spec.flats.some((f) => Math.hypot(x - f.x, z - f.z) < f.r + r * 1.4)) continue;
    list.push({ x, z, r, depth: r * (0.16 + rand() * 0.1) });
  }
  const curvature = spec.curvature ?? 0;

  function height(x: number, z: number): number {
    let h = valueNoise(x * 0.06, z * 0.06, spec.seed) * 0.9 + valueNoise(x * 0.21, z * 0.21, spec.seed + 1) * 0.22;
    for (const c of list) {
      const dx = x - c.x;
      const dz = z - c.z;
      const reach = c.r * 1.8;
      if (dx > reach || dx < -reach || dz > reach || dz < -reach) continue;
      const d = Math.sqrt(dx * dx + dz * dz) / c.r;
      if (d < 1.8) h += craterProfile(d) * c.depth;
    }
    // Flatten safe spots smoothly to height 0.
    for (const f of spec.flats) {
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < f.r * 1.8) {
        const t = d <= f.r ? 0 : (d - f.r) / (f.r * 0.8);
        const k = t * t * (3 - 2 * t);
        h *= k;
      }
    }
    if (curvature > 0) h -= curvature * (x * x + z * z);
    return h;
  }

  return { spec, craters: list, height };
}
