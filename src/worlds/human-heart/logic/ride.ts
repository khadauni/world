/**
 * The blood-cell ride: one closed loop through the double circulation, laid out like a classic diagram —
 * lungs on top, body below, heart in the middle (right side on the viewer's left).
 *
 * body → vena cava → right atrium → right ventricle → pulmonary artery → lungs → pulmonary veins →
 * left atrium → left ventricle → aorta → body
 */
export type Vec3 = readonly [number, number, number];

export type Place =
  | 'muscle'
  | 'vena-cava'
  | 'right-atrium'
  | 'tricuspid'
  | 'right-ventricle'
  | 'pulmonary-valve'
  | 'pulmonary-artery'
  | 'lungs'
  | 'pulmonary-vein'
  | 'left-atrium'
  | 'mitral'
  | 'left-ventricle'
  | 'aortic-valve'
  | 'aorta'
  | 'body';

/**
 * Waypoints of the closed Catmull-Rom loop, each tagged with where the cell is. Inside the heart they
 * follow the cut-away model (section coordinates × RIDE_HEART_SCALE): through each cavity and valve.
 */
export const RIDE_HEART_SCALE = 1.35;

export const RIDE_POINTS: readonly { readonly p: Vec3; readonly place: Place }[] = [
  { p: [0.0, -4.7, 0.5], place: 'muscle' },
  { p: [-1.25, -4.45, 0.35], place: 'vena-cava' },
  { p: [-2.2, -2.9, 0.2], place: 'vena-cava' },
  { p: [-2.25, -1.3, 0.15], place: 'vena-cava' },
  { p: [-1.7, -0.42, 0.1], place: 'vena-cava' },
  { p: [-1.05, 0.46, 0.05], place: 'right-atrium' },
  { p: [-0.85, -0.05, 0.05], place: 'tricuspid' },
  { p: [-0.62, -0.8, 0.05], place: 'right-ventricle' },
  { p: [-0.2, -0.2, 0.05], place: 'right-ventricle' },
  { p: [-0.16, 0.9, 0.05], place: 'pulmonary-valve' },
  { p: [-0.25, 1.95, 0.15], place: 'pulmonary-artery' },
  { p: [0.35, 2.95, 0.2], place: 'pulmonary-artery' },
  { p: [1.6, 3.55, 0.15], place: 'lungs' },
  { p: [2.55, 4.1, 0.05], place: 'lungs' },
  { p: [3.2, 3.55, -0.05], place: 'lungs' },
  { p: [2.9, 2.75, 0.0], place: 'pulmonary-vein' },
  { p: [2.35, 1.6, 0.1], place: 'pulmonary-vein' },
  { p: [1.72, 0.72, 0.08], place: 'pulmonary-vein' },
  { p: [1.1, 0.5, 0.05], place: 'left-atrium' },
  { p: [0.98, -0.02, 0.05], place: 'mitral' },
  { p: [0.84, -0.78, 0.05], place: 'left-ventricle' },
  { p: [0.44, -0.25, 0.05], place: 'left-ventricle' },
  { p: [0.45, 0.9, 0.05], place: 'aortic-valve' },
  { p: [0.5, 1.85, -0.1], place: 'aorta' },
  { p: [1.0, 2.45, -0.35], place: 'aorta' },
  { p: [1.65, 1.95, -0.6], place: 'aorta' },
  { p: [2.05, 0.4, -0.6], place: 'aorta' },
  { p: [2.3, -1.2, -0.3], place: 'aorta' },
  { p: [2.05, -2.9, 0.0], place: 'aorta' },
  { p: [1.25, -4.35, 0.3], place: 'body' },
];

/** Waypoint ranges drawn as glassy vessels outside the heart (the heart itself is the cut-away model). */
export const OUTSIDE_RUNS: readonly (readonly [number, number])[] = [
  [29, 4],
  [10, 17],
  [23, 29],
];

/** Waypoint indices where the task pauses the ride. */
export const LUNG_STOP = 13;
export const MUSCLE_STOP = 0;
/** The ride starts just after the muscle, carrying oxygen-poor blood home. */
export const RIDE_START = 1;

/**
 * Arc-length position (0…1) of every waypoint, from the cumulative lengths of the curve
 * (`lengths[k]` is the length at curve parameter t = k / (lengths.length - 1)).
 */
export function waypointU(lengths: readonly number[], count = RIDE_POINTS.length): number[] {
  const total = lengths[lengths.length - 1] ?? 1;
  const div = lengths.length - 1;
  return Array.from({ length: count }, (_, i) => (lengths[Math.round((i / count) * div)] ?? 0) / total);
}

/** Which waypoint segment the cell is in for arc position u (0…1), given each waypoint's u. */
export function segmentIndex(u: number, us: readonly number[]): number {
  const x = u - Math.floor(u);
  let idx = 0;
  for (let i = 0; i < us.length; i++) if ((us[i] ?? 0) <= x) idx = i;
  return idx;
}

export function placeAt(u: number, us: readonly number[]): Place {
  return RIDE_POINTS[segmentIndex(u, us)]?.place ?? 'body';
}

/** Oxygen level of blood at a point of the loop in the diagram: rich from the lungs to the muscle. */
export function oxygenAt(u: number, us: readonly number[]): number {
  const i = segmentIndex(u, us);
  return i >= LUNG_STOP ? 1 : 0;
}

function smooth(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

/**
 * Smooth oxygen level for colouring vessels and cells: it rises across the lung capillaries
 * (waypoints 12 → 14) and falls across the muscle capillaries (29 → 1, wrapping through 0).
 */
export function oxygenSmooth(u: number, us: readonly number[]): number {
  const x = u - Math.floor(u);
  const a = us[12] ?? 0.4;
  const b = us[14] ?? 0.5;
  const c = us[29] ?? 0.95;
  const d = us[1] ?? 0.02;
  if (x >= a && x <= b) return smooth((x - a) / Math.max(1e-6, b - a));
  if (x > b && x < c) return 1;
  const span = 1 - c + d;
  if (x >= c) return 1 - smooth((x - c) / span);
  if (x <= d) return 1 - smooth((x + 1 - c) / span);
  return 0;
}

/** Forward distance (in u) from a to b around the loop. */
export function forwardGap(a: number, b: number): number {
  return (((b - a) % 1) + 1) % 1;
}

export type RideStage = 'to-lungs' | 'lungs' | 'to-muscle' | 'muscle' | 'done';

export interface RideState {
  readonly stage: RideStage;
  readonly bubbles: number;
  readonly goal: number;
}

export function rideStart(goal: number): RideState {
  return { stage: 'to-lungs', bubbles: 0, goal };
}

export type RideEvent = 'arrived' | 'bubble' | 'loaded' | 'delivered' | 'ignored';

export function rideArrive(state: RideState): { state: RideState; event: RideEvent } {
  if (state.stage === 'to-lungs') return { state: { ...state, stage: 'lungs' }, event: 'arrived' };
  if (state.stage === 'to-muscle') return { state: { ...state, stage: 'muscle' }, event: 'arrived' };
  return { state, event: 'ignored' };
}

export function rideBubble(state: RideState): { state: RideState; event: RideEvent } {
  if (state.stage !== 'lungs') return { state, event: 'ignored' };
  const bubbles = state.bubbles + 1;
  if (bubbles >= state.goal) return { state: { ...state, bubbles, stage: 'to-muscle' }, event: 'loaded' };
  return { state: { ...state, bubbles }, event: 'bubble' };
}

export function rideDeliver(state: RideState): { state: RideState; event: RideEvent } {
  if (state.stage !== 'muscle') return { state, event: 'ignored' };
  return { state: { ...state, stage: 'done' }, event: 'delivered' };
}

/** Progress for the banner: every bubble, plus the delivery. */
export function rideProgress(state: RideState): { done: number; total: number } {
  return { done: state.bubbles + (state.stage === 'done' ? 1 : 0), total: state.goal + 1 };
}
