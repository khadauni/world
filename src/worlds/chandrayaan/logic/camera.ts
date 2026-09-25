/**
 * Camera framing helpers. A "shot" frames a box of world units around a target from a direction,
 * and the distance is solved per viewport so the subject fits both landscape (1280×800) and
 * portrait tablets (768×1024) inside the area the HUD leaves free.
 */
export type Vec3 = readonly [number, number, number];

export interface Shot {
  readonly target: Vec3;
  /** Direction from the target towards the camera (need not be normalised). */
  readonly dir: Vec3;
  /** Width × height (world units, at the target) that must stay visible. */
  readonly fit: readonly [number, number];
}

/** Default HUD reservation: ~150px at the top (bar + banner) and ~260px at the bottom (guide bubble / stop track). */
export const HUD_TOP = 150;
export const HUD_BOTTOM = 260;

/**
 * What the HUD covers in each phase at 1280×800 (measured): the map shows a compact bubble + stop track,
 * explore shows the full guide bubble, the task phase has the banner on top and our controls below.
 */
export const HUD_BY_PHASE: Readonly<Record<string, readonly [number, number]>> = {
  intro: [70, 250],
  map: [70, 335],
  travel: [140, 40],
  explore: [70, 250],
  task: [165, 250],
  quiz: [70, 250],
  reward: [70, 250],
  finale: [70, 250],
};

/** Tasks whose controls live in the DOM overlay at the bottom of the screen (the rest are pure 3D taps). */
export const OVERLAY_TASKS: ReadonlySet<string> = new Set(['launch-countdown', 'orbit-boost', 'land-vikram', 'hop-and-sleep']);

/** Bottom reservation during a task that has no overlay controls (only the safe-area margin). */
const TASK_FREE_BOTTOM = 40;

/**
 * Scale the reservation down on short screens so the subject never gets squeezed out. During a pure-3D task
 * (waypoints, latches, rock samples) the bottom of the screen is free, so the subject gets that room too.
 */
export function hudFor(phase: string, heightPx: number, taskKind: string | null = null): [number, number] {
  const [top, reserved] = HUD_BY_PHASE[phase] ?? [HUD_TOP, HUD_BOTTOM];
  const bottom = phase === 'task' && taskKind !== null && !OVERLAY_TASKS.has(taskKind) ? TASK_FREE_BOTTOM : reserved;
  const k = Math.min(1, heightPx / 800);
  return [Math.round(top * Math.max(0.7, k)), Math.round(Math.min(bottom * Math.max(0.7, k), heightPx * 0.42))];
}

/** Fraction of the canvas height that is free for the subject. */
export function usableFraction(heightPx: number, top = HUD_TOP, bottom = HUD_BOTTOM): number {
  if (heightPx <= 0) return 1;
  return Math.min(1, Math.max(0.42, (heightPx - top - bottom) / heightPx));
}

/** Pixels to shift the rendered image up so its centre sits in the free band between the HUD bars. */
export function hudShiftPx(heightPx: number, top = HUD_TOP, bottom = HUD_BOTTOM): number {
  if (heightPx < 360) return 0;
  return (bottom - top) / 2;
}

/** Distance from target so a `fit` box is fully visible for this aspect, vertical fov and usable height. */
export function fitDistance(fit: readonly [number, number], aspect: number, fovDeg: number, usable = 1): number {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  const byH = fit[1] / 2 / (t * usable);
  const byW = fit[0] / 2 / (t * Math.max(0.1, aspect) * 0.94);
  return Math.max(byH, byW);
}

export function normalize(v: Vec3): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** Orbit-control limits that keep the child close to the hero angle (no getting lost). */
export function orbitLimits(shot: Shot, distance: number, spread = 0.5) {
  const d = normalize(shot.dir);
  const az = Math.atan2(d[0], d[2]);
  const polar = Math.acos(Math.min(1, Math.max(-1, d[1])));
  return {
    minAzimuthAngle: az - spread,
    maxAzimuthAngle: az + spread,
    minPolarAngle: Math.max(0.15, polar - spread * 0.55),
    maxPolarAngle: Math.min(Math.PI - 0.15, polar + spread * 0.45),
    minDistance: distance * 0.8,
    maxDistance: distance * 1.3,
  };
}

/** Rotate a point about the Z axis (same convention as Object3D.rotation.z). */
export function rotateZ(v: Vec3, angle: number): [number, number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

/**
 * A shot that frames round things (x, y, z, radius) after the whole set is tipped by `angle` about Z — used to
 * stand a wide diorama upright on portrait tablets (Earth below, Moon above).
 */
export function fitAround(items: readonly (readonly [number, number, number, number])[], angle: number, dir: Vec3, pad = 0.4): Shot {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y, z, r] of items) {
    const [rx, ry] = rotateZ([x, y, z], angle);
    minX = Math.min(minX, rx - r);
    maxX = Math.max(maxX, rx + r);
    minY = Math.min(minY, ry - r);
    maxY = Math.max(maxY, ry + r);
  }
  if (!Number.isFinite(minX)) return { target: [0, 0, 0], dir, fit: [1, 1] };
  return { target: [(minX + maxX) / 2, (minY + maxY) / 2, 0], dir, fit: [maxX - minX + pad * 2, maxY - minY + pad * 2] };
}
