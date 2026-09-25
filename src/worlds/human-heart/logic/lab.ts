import { PARTS, type PartId } from './ids';

/**
 * Heart Lab rules: pull parts out (exploded view), then rebuild. Pure reducer — the scene animates,
 * the overlay shows the tray, and both send the same events here.
 */
export type LabStage = 'pull' | 'rebuild' | 'done';
export type RebuildMode = 'any' | 'names' | 'clues';

export interface LabState {
  readonly stage: LabStage;
  /** Parts currently out of the heart, in the order they were pulled. */
  readonly out: readonly PartId[];
  readonly pulls: number;
  readonly placed: number;
  readonly goal: number;
  readonly mode: RebuildMode;
  /** Senior rebuild: the part the current clue describes. */
  readonly clue: PartId | null;
  readonly misses: number;
  readonly assist: boolean;
}

export function labStart(goal: number, mode: RebuildMode): LabState {
  return { stage: 'pull', out: [], pulls: 0, placed: 0, goal: Math.max(1, Math.min(goal, PARTS.length)), mode, clue: null, misses: 0, assist: false };
}

export type LabEvent = 'pulled' | 'rebuild-time' | 'placed' | 'done' | 'wrong' | 'ignored';

export function pullPart(state: LabState, id: PartId): { state: LabState; event: LabEvent } {
  if (state.stage !== 'pull' || state.out.includes(id)) return { state, event: 'ignored' };
  const out = [...state.out, id];
  const pulls = state.pulls + 1;
  if (pulls >= state.goal) {
    return { state: { ...state, out, pulls, stage: 'rebuild', clue: state.mode === 'clues' ? (out[0] ?? null) : null }, event: 'rebuild-time' };
  }
  return { state: { ...state, out, pulls }, event: 'pulled' };
}

export function placePart(state: LabState, id: PartId, assistAfter: number): { state: LabState; event: LabEvent } {
  if (state.stage !== 'rebuild' || !state.out.includes(id)) return { state, event: 'ignored' };
  if (state.mode === 'clues' && state.clue && id !== state.clue) {
    const misses = state.misses + 1;
    return { state: { ...state, misses, assist: misses >= assistAfter }, event: 'wrong' };
  }
  const out = state.out.filter((p) => p !== id);
  const placed = state.placed + 1;
  if (out.length === 0) return { state: { ...state, out, placed, stage: 'done', clue: null, misses: 0, assist: false }, event: 'done' };
  const clue = state.mode === 'clues' ? (out[0] ?? null) : null;
  return { state: { ...state, out, placed, clue, misses: 0, assist: false }, event: 'placed' };
}

/** Progress dots: every pull and every snap-back counts. */
export function labProgress(state: LabState): { done: number; total: number } {
  return { done: state.pulls + state.placed, total: state.goal * 2 };
}

/** The part a tiny explorer is nudged towards (a gentle glow) — first part not yet pulled. */
export function suggestedPull(state: LabState, order: readonly PartId[] = PARTS): PartId | null {
  if (state.stage !== 'pull') return null;
  // A plain loop: this runs every frame, so no closures.
  for (let i = 0; i < order.length; i++) {
    const p = order[i] as PartId;
    if (!state.out.includes(p)) return p;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------
// Exploded view: where pulled parts park, so every part is clearly separate, readable and labelled.
// ---------------------------------------------------------------------------------------------------

export type Vec3 = readonly [number, number, number];

/** What the layout needs to know about a part (heart space: x = viewer's right). */
export interface PartShape {
  /** 'right' = the heart's right side (oxygen-poor, blue) — parks on the viewer's LEFT. */
  readonly side: 'right' | 'left';
  readonly center: Vec3;
  readonly size: Vec3;
}

export interface Parking {
  /** Where the part's centre ends up (heart space). */
  readonly slot: Vec3;
  /** Uniform scale while parked (big parts shrink a little so the shelf stays tidy). */
  readonly scale: number;
}

/**
 * Landscape screens have width to spare: up to two columns per side, the outer one staggered half a row
 * lower so neighbouring name tags never sit side by side. Portrait tablets have height to spare: one
 * taller column per side. Each cell leaves room above the part for its name tag.
 */
export const LAB_GRID = {
  landscape: { cols: [2.6, 4.15], pitch: 1.5, cell: 1.05, minScale: 0.42, centerY: 0.3, maxSpan: 3.2, z: 0.35 },
  portrait: { cols: [2.4], pitch: 1.4, cell: 0.95, minScale: 0.38, centerY: 0.3, maxSpan: 5.6, z: 0.35 },
} as const;

/** Heart half-width (heart space) that parked parts must stay clear of. */
export const HEART_HALF_WIDTH = 1.45;

/**
 * Park every pulled part beside the heart: blue (right-side) parts on the viewer's left, red on the right,
 * ordered top-to-bottom like the real heart so it reads as an exploded diagram. Pure; recomputed only when
 * a part comes or goes (the shelf re-flows as parts are snapped back).
 */
export function labLayout(out: readonly PartId[], shapes: Readonly<Record<PartId, PartShape>>, portrait: boolean): Partial<Record<PartId, Parking>> {
  const g = portrait ? LAB_GRID.portrait : LAB_GRID.landscape;
  const result: Partial<Record<PartId, Parking>> = {};
  for (const side of ['right', 'left'] as const) {
    const ids = out.filter((id) => shapes[id].side === side).sort((a, b) => shapes[b].center[1] - shapes[a].center[1]);
    if (ids.length === 0) continue;
    // Up to three parts stack in one column (reads like the real heart, top to bottom); more zig-zag in two.
    const cols = ids.length <= 3 ? 1 : g.cols.length;
    const rows = Math.ceil(ids.length / cols);
    const pitch = rows > 1 ? Math.min(g.pitch, g.maxSpan / (rows - 1)) : g.pitch;
    // A lone part on its side can stay big; otherwise it must fit its cell.
    const cell = ids.length === 1 ? g.cell * 1.6 : Math.min(g.cell, pitch * 0.75);
    const sign = side === 'right' ? -1 : 1;
    const stagger = cols > 1 ? pitch / 2 : 0;
    ids.forEach((id, k) => {
      const col = cols > 1 ? k % 2 : 0;
      const row = cols > 1 ? Math.floor(k / 2) : k;
      const s = shapes[id];
      const scale = Math.min(1, Math.max(g.minScale, cell / Math.max(0.01, s.size[0], s.size[1])));
      const y = g.centerY + stagger / 2 + ((rows - 1) / 2 - row) * pitch - (col === 1 ? stagger : 0);
      result[id] = { slot: [sign * (g.cols[col] as number), y, g.z], scale };
    });
  }
  return result;
}

/** How much the camera must frame (width, height, centre y) to see the heart plus every parked part and its tag. */
export function labFit(parking: Partial<Record<PartId, Parking>>, portrait: boolean, shapes?: Readonly<Record<PartId, PartShape>>): { fit: [number, number]; y: number } {
  const g = portrait ? LAB_GRID.portrait : LAB_GRID.landscape;
  let maxX = 0;
  let top = 2.05;
  let bottom = -1.95;
  for (const [id, p] of Object.entries(parking) as [PartId, Parking | undefined][]) {
    if (!p) continue;
    const size = shapes?.[id].size;
    const half = size ? (Math.max(size[0], size[1]) * p.scale) / 2 : g.cell / 2;
    maxX = Math.max(maxX, Math.abs(p.slot[0]) + half);
    // Name tags sit above parts.
    top = Math.max(top, p.slot[1] + half + 0.5);
    bottom = Math.min(bottom, p.slot[1] - half - 0.1);
  }
  // Tags can be wider than the part itself.
  const halfW = maxX > 0 ? maxX + (portrait ? 0.4 : 0.3) : 2.3;
  return { fit: [halfW * 2, top - bottom], y: (top + bottom) / 2 };
}
