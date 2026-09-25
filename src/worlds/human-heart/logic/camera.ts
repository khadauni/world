/**
 * Camera framing. A shot frames a box (world units) around a target from a direction; the distance is
 * solved per viewport so the subject fits landscape (1280×800) and portrait tablets (768×1024) inside the
 * band the HUD leaves free.
 */
export type Vec3 = readonly [number, number, number];

export interface Shot {
  readonly target: Vec3;
  /** Direction from the target towards the camera (need not be normalised). */
  readonly dir: Vec3;
  /** Width × height (world units, at the target) that must stay visible. */
  readonly fit: readonly [number, number];
}

/**
 * Pixels the HUD covers [top, bottom] per phase at 1280×800. The task phase has the banner on top and,
 * for some tasks, our own controls at the bottom (see TASK_BOTTOM).
 */
export const HUD_BY_PHASE: Readonly<Record<string, readonly [number, number]>> = {
  intro: [80, 240],
  map: [80, 325],
  travel: [130, 30],
  explore: [80, 245],
  task: [145, 30],
  quiz: [80, 245],
  reward: [80, 245],
  finale: [80, 245],
};

/** Bottom space our Overlay uses during each task (0 = the task is pure 3D taps). */
export const TASK_BOTTOM: Readonly<Record<string, number>> = {
  'find-heart': 30,
  'beat-rhythm': 170,
  'name-chambers': 120,
  'take-apart': 225,
  'fix-valves': 30,
  'blood-ride': 110,
  'healthy-choices': 30,
};

export function hudFor(phase: string, taskKind: string | null, heightPx: number, big = false): [number, number] {
  const base = HUD_BY_PHASE[phase] ?? [150, 260];
  // Pre-readers get larger type in the HUD (measured ≈ +16px top, +25px bottom).
  const top = base[0] + (big ? 16 : 0);
  const bottom = phase === 'task' && taskKind ? (TASK_BOTTOM[taskKind] ?? base[1]) + (big ? 20 : 0) : base[1] + (big ? 25 : 0);
  const k = Math.min(1, heightPx / 800);
  return [Math.round(top * Math.max(0.75, k)), Math.round(Math.min(bottom * Math.max(0.75, k), heightPx * 0.42))];
}

/** Fraction of the canvas height that is free for the subject. */
export function usableFraction(heightPx: number, top: number, bottom: number): number {
  if (heightPx <= 0) return 1;
  return Math.min(1, Math.max(0.4, (heightPx - top - bottom) / heightPx));
}

/** Pixels to shift the rendered image so its centre sits in the middle of the free band. */
export function hudShiftPx(heightPx: number, top: number, bottom: number): number {
  if (heightPx < 360) return 0;
  return (bottom - top) / 2;
}

/** Distance from the target so a `fit` box is fully visible for this aspect, vertical fov and usable height. */
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

/** Critically damped approach factor for a frame of length dt (frame-rate independent). */
export function damp(dt: number, smoothTime: number): number {
  return 1 - Math.exp(-Math.max(0, dt) * (4 / Math.max(0.05, smoothTime)));
}
