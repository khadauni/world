import { hashString, mulberry32 } from '@/core/random';
import type { AgeBand } from '@/core/types';
import { FLIGHT_TUNING } from './difficulty';
import { buildLine, lineAt, type LineSample } from './line';
import { buildPath, swoopPoints, type Vec3Tuple } from './path';
import type { Collectible, Course, FlightMode, FlightTuning, Obstacle, RingGate, Scenery } from './types';

export interface CreateCourseOptions {
  /** Same seed → same course. Strings are hashed (e.g. `'earth->mars'`). */
  readonly seed: number | string;
  readonly band: AgeBand;
  /** Explicit control points for the path (e.g. a blood vessel's centre line). Wins over from/to. */
  readonly points?: readonly Vec3Tuple[];
  /** Start and end of a swooping path generated between two positions. */
  readonly from?: Vec3Tuple;
  readonly to?: Vec3Tuple;
  /** Path length when neither `points` nor `from`/`to` is given (flies along −Z). Default 720. */
  readonly length?: number;
  /** 0 = straight line, 1 = default S-bends, 2 = wild. Only for generated paths. */
  readonly curviness?: number;
  /** Radius of the flyable tube around the path, world units. Default 6. */
  readonly tubeRadius?: number;
  /** QualityProfile.particleScale — scales decorative scenery only (gameplay is identical on every device). */
  readonly particleScale?: number;
  /** Override the band's default mode (e.g. force 'auto' for a cut-scene-like run). */
  readonly mode?: FlightMode;
  /** Override the target run time at cruise speed, seconds. */
  readonly runSeconds?: number;
  /** Include obstacles (default true). A calm "orbit" leg might turn them off. */
  readonly obstacles?: boolean;
  /** Base scenery count before particleScale (default 64). */
  readonly scenery?: number;
}

type Pattern = 'line' | 'slalom' | 'spiral' | 'wave' | 'sweep';
const PATTERNS: Readonly<Record<FlightMode, readonly Pattern[]>> = {
  auto: ['line', 'wave', 'sweep'],
  assist: ['slalom', 'wave', 'sweep', 'spiral'],
  pilot: ['slalom', 'spiral', 'sweep', 'wave'],
};

interface Mutable {
  s: number;
  x: number;
  y: number;
}

function clampToDisc(p: Mutable, max: number): void {
  const d = Math.hypot(p.x, p.y);
  if (d > max) {
    p.x *= max / d;
    p.y *= max / d;
  }
}

function unitAxis(rand: () => number): [number, number, number] {
  const u = rand() * 2 - 1;
  const t = rand() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return [r * Math.cos(t), u, r * Math.sin(t)];
}

/**
 * Generate a complete, deterministic flight course: a smooth path, chains of ring gates, trails of collectibles,
 * obstacles placed clear of the racing line, and decorative scenery — tuned by age band.
 *
 * ```ts
 * const course = createCourse({ seed: 'earth->mars', band, from: [0, 0, 0], to: [40, 10, -800] });
 * ```
 */
export function createCourse(opts: CreateCourseOptions): Course {
  const seed = typeof opts.seed === 'string' ? hashString(opts.seed) : opts.seed >>> 0;
  const rand = mulberry32(seed);
  const base = FLIGHT_TUNING[opts.band];
  const mode = opts.mode ?? base.mode;
  const tuning: FlightTuning = mode === base.mode ? base : { ...base, mode, assist: mode === 'auto' ? 1 : mode === 'pilot' ? 0 : base.assist };
  const R = opts.tubeRadius ?? 6;

  const points: readonly Vec3Tuple[] = opts.points
    ? opts.points
    : swoopPoints(opts.from ?? [0, 0, 0], opts.to ?? [0, 0, -(opts.length ?? 720)], rand, opts.curviness ?? 1);
  const path = buildPath(points);
  const L = path.length;

  const runSeconds = opts.runSeconds ?? tuning.runSeconds;
  const cruiseSpeed = L / runSeconds;
  const boostSpeed = cruiseSpeed * tuning.boostMultiplier;
  const brakeSpeed = cruiseSpeed * (tuning.brakeMultiplier > 0 ? tuning.brakeMultiplier : 1);
  const shipRadius = R * 0.1;

  const start = Math.max(L * 0.07, cruiseSpeed * 1.6);
  const end = L - Math.max(L * 0.07, cruiseSpeed * 1.8);
  const ringGap = cruiseSpeed * (mode === 'auto' ? 1.1 : 0.95);
  const chainGap = cruiseSpeed * (mode === 'auto' ? 2.6 : mode === 'assist' ? 2.3 : 1.9);
  const ringRadius = R * tuning.ringRadius;

  // --- rings, in chains ------------------------------------------------------------------------------------
  const rings: Mutable[] = [];
  const ringChain: number[] = [];
  const gaps: [number, number][] = [];
  const chainLen = tuning.chainLength;
  const span = (chainLen - 1) * ringGap;
  let s = start;
  let chain = 0;
  let lastEnd = 0;
  const patterns = PATTERNS[mode];
  while (s + span <= end) {
    const pattern = patterns[Math.floor(rand() * patterns.length)] ?? 'line';
    const amp = R * tuning.ringOffset * (0.75 + rand() * 0.25);
    const phase = rand() * Math.PI * 2;
    const dir = rand() < 0.5 ? -1 : 1;
    gaps.push([lastEnd, s]);
    for (let k = 0; k < chainLen; k++) {
      const u = chainLen > 1 ? k / (chainLen - 1) : 0;
      const p: Mutable = { s: s + k * ringGap, x: 0, y: 0 };
      switch (pattern) {
        case 'line':
          p.x = amp * 0.4 * Math.sin(phase + k * 0.9);
          p.y = amp * 0.3 * Math.cos(phase + k * 0.7);
          break;
        case 'slalom':
          p.x = amp * (k % 2 === 0 ? -1 : 1) * dir;
          p.y = amp * 0.3 * Math.sin(phase + k);
          break;
        case 'spiral': {
          const th = phase + dir * k * 1.25;
          p.x = amp * Math.cos(th);
          p.y = amp * Math.sin(th);
          break;
        }
        case 'wave':
          p.x = amp * 0.35 * Math.sin(phase + k * 0.8);
          p.y = amp * Math.sin(phase + k * 1.4);
          break;
        case 'sweep':
          p.x = amp * (u * 2 - 1) * dir;
          p.y = amp * 0.45 * Math.cos(phase + u * Math.PI);
          break;
      }
      clampToDisc(p, Math.max(0, R - ringRadius * 0.6));
      rings.push(p);
      ringChain.push(chain);
    }
    lastEnd = s + span;
    s = lastEnd + chainGap;
    chain++;
  }
  gaps.push([lastEnd, L]);

  // --- collectibles: pairs between rings in a chain, spiralling trails between chains ------------------------
  const collect: Mutable[] = [];
  for (let i = 0; i + 1 < rings.length; i++) {
    const a = rings[i] as Mutable;
    const b = rings[i + 1] as Mutable;
    if (ringChain[i] !== ringChain[i + 1]) continue;
    for (const t of [1 / 3, 2 / 3]) collect.push({ s: a.s + (b.s - a.s) * t, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  const perGap = Math.max(3, Math.round((tuning.collectibleCount - collect.length) / Math.max(1, gaps.length)));
  for (let g = 0; g < gaps.length; g++) {
    const [g0, g1] = gaps[g] as [number, number];
    const a = g === 0 ? { s: start * 0.45, x: 0, y: 0 } : (rings.find((r) => Math.abs(r.s - g0) < 1e-6) ?? { s: g0, x: 0, y: 0 });
    const b = g === gaps.length - 1 ? { s: end + (L - end) * 0.35, x: 0, y: 0 } : (rings.find((r) => Math.abs(r.s - g1) < 1e-6) ?? { s: g1, x: 0, y: 0 });
    const n = g === 0 || g === gaps.length - 1 ? Math.max(3, Math.round(perGap * 0.7)) : perGap;
    const swirl = R * (mode === 'auto' ? 0.12 : 0.32);
    const phase = rand() * Math.PI * 2;
    const turn = (rand() < 0.5 ? -1 : 1) * (1.2 + rand());
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1);
      const w = Math.sin(Math.PI * t);
      const p: Mutable = {
        s: a.s + (b.s - a.s) * t,
        x: a.x + (b.x - a.x) * t + Math.cos(phase + t * turn * Math.PI) * swirl * w,
        y: a.y + (b.y - a.y) * t + Math.sin(phase + t * turn * Math.PI) * swirl * w,
      };
      clampToDisc(p, R * 0.85);
      collect.push(p);
    }
  }
  collect.sort((p, q) => p.s - q.s);

  // --- racing line -------------------------------------------------------------------------------------------
  const line = buildLine(
    [{ s: 0, x: 0, y: 0 }, { s: start * 0.3, x: 0, y: 0 }, ...rings, ...collect, { s: end + (L - end) * 0.6, x: 0, y: 0 }, { s: L, x: 0, y: 0 }],
    Math.max(0.5, ringGap * 0.12),
  );

  // --- obstacles, clear of the racing line and the ring gates ------------------------------------------------
  const obstacles: Obstacle[] = [];
  const wantObstacles = opts.obstacles === false ? 0 : tuning.obstacleCount;
  const margin = R * (mode === 'auto' ? 0.32 : mode === 'assist' ? 0.16 : 0.1);
  const ringClear = Math.max(4, ringGap * 0.3);
  const ls: LineSample = { x: 0, y: 0 };
  const lineClear = (s0: number, x: number, y: number, need: number): boolean => {
    for (let k = -1; k <= 1; k++) {
      lineAt(line, s0 + (k * need) / 1.5, ls);
      if (Math.hypot(x - ls.x, y - ls.y) < need) return false;
    }
    return true;
  };
  const midGaps = gaps.slice(1, -1).filter(([a, b]) => b - a > 8);
  for (let tries = 0; obstacles.length < wantObstacles && tries < wantObstacles * 60; tries++) {
    const radius = R * (tuning.obstacleRadius[0] + rand() * (tuning.obstacleRadius[1] - tuning.obstacleRadius[0]));
    // Most obstacles gather in the gaps between ring chains ("asteroid fields"); some sit beside the rings.
    let os: number;
    const gap = midGaps.length > 0 && rand() < 0.72 ? midGaps[Math.floor(rand() * midGaps.length)] : undefined;
    if (gap) os = gap[0] + 4 + rand() * Math.max(0, gap[1] - gap[0] - 8);
    else os = start + 6 + rand() * Math.max(0, end - start - 6);
    if (os < start + 4 || os > end) continue;
    if (rings.some((r) => Math.abs(r.s - os) < ringClear + radius)) continue;
    const th = rand() * Math.PI * 2;
    const rho = R * (0.1 + 0.8 * Math.sqrt(rand()));
    const x = Math.cos(th) * rho;
    const y = Math.sin(th) * rho;
    const need = radius + shipRadius + margin;
    if (!lineClear(os, x, y, need)) continue;
    if (obstacles.some((o) => Math.hypot(o.s - os, o.x - x, o.y - y) < o.radius + radius + shipRadius * 3)) continue;
    let amp = 0;
    let freq = 0;
    const angle = rand() * Math.PI * 2;
    const phase = rand() * Math.PI * 2;
    if (rand() < tuning.driftShare) {
      amp = R * (0.15 + rand() * 0.25);
      freq = 0.5 + rand() * 0.6;
      // Shrink the wobble until every point of it stays clear of the racing line.
      for (let shrink = 0; shrink < 5 && amp > 0; shrink++) {
        let ok = true;
        for (let k = -2; k <= 2 && ok; k++) {
          const off = (amp * k) / 2;
          ok = lineClear(os, x + Math.cos(angle) * off, y + Math.sin(angle) * off, need);
        }
        if (ok) break;
        amp *= 0.5;
        if (amp < R * 0.05) amp = 0;
      }
      if (amp === 0) freq = 0;
    }
    obstacles.push({
      index: 0,
      s: os,
      x,
      y,
      radius,
      spinAxis: unitAxis(rand),
      spinSpeed: (0.3 + rand() * 0.9) * (rand() < 0.5 ? -1 : 1),
      drift: { amp, freq, phase, angle },
      seed: rand(),
    });
  }
  obstacles.sort((a, b) => a.s - b.s);

  // --- scenery (decor only) ----------------------------------------------------------------------------------
  const scenery: Scenery[] = [];
  const sceneryCount = Math.max(8, Math.round((opts.scenery ?? 64) * (opts.particleScale ?? 1)));
  for (let i = 0; i < sceneryCount; i++) {
    const giant = i < Math.max(3, Math.round(sceneryCount * 0.07));
    const th = rand() * Math.PI * 2;
    const dist = giant ? R * (6 + rand() * 6) : R * (1.7 + Math.pow(rand(), 1.4) * 4.5);
    const radius = giant ? R * (0.9 + rand() * 1.3) : R * (0.12 + Math.pow(rand(), 2.2) * 0.7);
    scenery.push({
      s: -20 + rand() * (L + 60),
      x: Math.cos(th) * dist,
      y: Math.sin(th) * dist * 0.8,
      radius,
      spinAxis: unitAxis(rand),
      spinSpeed: (0.05 + rand() * 0.35) * (rand() < 0.5 ? -1 : 1),
      seed: rand(),
    });
  }
  scenery.sort((a, b) => a.s - b.s);

  return {
    seed,
    band: opts.band,
    mode,
    tuning,
    length: L,
    tubeRadius: R,
    shipRadius,
    cruiseSpeed,
    boostSpeed,
    brakeSpeed,
    path,
    rings: rings.map<RingGate>((r, index) => ({ index, s: r.s, x: r.x, y: r.y, radius: ringRadius, chain: ringChain[index] ?? 0 })),
    collectibles: collect.map<Collectible>((c, index) => ({ index, s: c.s, x: c.x, y: c.y })),
    obstacles: obstacles.map((o, index) => ({ ...o, index })),
    scenery,
    line,
  };
}

/** Rough run time in seconds at steady cruise (no boosting) — handy for world pacing and tests. */
export function cruiseSeconds(course: Course): number {
  return course.length / course.cruiseSpeed;
}

/** The lateral offset of a (possibly drifting) obstacle at flight time `t`. Allocation-free. */
export function obstacleOffset(o: Obstacle, t: number, out: { x: number; y: number }): { x: number; y: number } {
  const d = o.drift;
  const w = d.amp === 0 ? 0 : d.amp * Math.sin(t * d.freq + d.phase);
  out.x = o.x + Math.cos(d.angle) * w;
  out.y = o.y + Math.sin(d.angle) * w;
  return out;
}
