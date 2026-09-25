import type { AgeBand, Tiered } from '@/core/types';
import type { GalileanMoon } from '../layout';

/**
 * Difficulty rules for every mission (pure data + functions, unit-tested).
 * tiny = very few, big, slow targets with early help · junior = a few more · senior = more targets, faster, precise.
 */

export const TASK_KINDS = [
  'collect-sparks',
  'tap-craters',
  'clear-clouds',
  'find-things',
  'collect-samples',
  'jupiter-moons',
  'collect-ice',
  'tilt-uranus',
  'catch-winds',
] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export function isTaskKind(kind: string | undefined): kind is TaskKind {
  return !!kind && (TASK_KINDS as readonly string[]).includes(kind);
}

export interface Tuning {
  /** Number of targets to collect. */
  readonly count: number;
  /** Target size multiplier (visual + hit area). */
  readonly size: number;
  /** Movement speed multiplier. */
  readonly speed: number;
  /** Misses before the world starts helping. */
  readonly assistAfterMisses: number;
  /** Seconds without progress before the world starts helping. */
  readonly assistAfterIdle: number;
}

type BandTable = Readonly<Record<AgeBand, Tuning>>;

const HELP = { tiny: { assistAfterMisses: 2, assistAfterIdle: 9 }, junior: { assistAfterMisses: 2, assistAfterIdle: 14 }, senior: { assistAfterMisses: 2, assistAfterIdle: 20 } } as const;

function table(counts: readonly [number, number, number], sizes: readonly [number, number, number], speeds: readonly [number, number, number]): BandTable {
  return {
    tiny: { count: counts[0], size: sizes[0], speed: speeds[0], ...HELP.tiny },
    junior: { count: counts[1], size: sizes[1], speed: speeds[1], ...HELP.junior },
    senior: { count: counts[2], size: sizes[2], speed: speeds[2], ...HELP.senior },
  };
}

export const TUNING: Readonly<Record<TaskKind, BandTable>> = {
  'collect-sparks': table([3, 5, 8], [1.5, 1.15, 0.9], [0.45, 0.75, 1.1]),
  'tap-craters': table([3, 4, 6], [1.45, 1.15, 0.9], [0, 0, 0]),
  'clear-clouds': table([3, 5, 7], [1.35, 1.1, 0.95], [0, 0, 0]),
  'find-things': table([1, 2, 3], [1.5, 1.2, 1], [0.5, 0.8, 1]),
  'collect-samples': table([2, 3, 5], [1.45, 1.15, 0.95], [1, 1.15, 1.3]),
  'jupiter-moons': table([1, 2, 4], [1.4, 1.2, 1], [0.35, 0.6, 0.8]),
  'collect-ice': table([3, 5, 8], [1.5, 1.15, 0.9], [0.35, 0.55, 0.8]),
  'tilt-uranus': table([3, 7, 1], [1.4, 1.15, 1], [0, 0, 0]),
  'catch-winds': table([3, 5, 7], [1.5, 1.15, 0.95], [0.45, 0.85, 1.3]),
};

export function tuningFor(kind: TaskKind, band: AgeBand): Tuning {
  return TUNING[kind][band];
}

// ---------------------------------------------------------------------------
// Help: after 2 misses (or a long pause) the world helps — highlights, slows down, points the way.
// ---------------------------------------------------------------------------

export interface HelpState {
  readonly misses: number;
  readonly helping: boolean;
}

export const NO_HELP: HelpState = { misses: 0, helping: false };

export function afterMiss(s: HelpState, t: Tuning): HelpState {
  const misses = s.misses + 1;
  return { misses, helping: s.helping || misses >= t.assistAfterMisses };
}

export function afterHit(s: HelpState): HelpState {
  // Keep helping once started (never take help away mid-task), but forget earlier misses.
  return { misses: 0, helping: s.helping };
}

/**
 * Has the child been stuck long enough (seconds since the start or the last success) for the world to help?
 * A plain predicate, so the per-frame idle clock can be a number that never allocates.
 */
export function idleHelps(idleSeconds: number, t: Tuning): boolean {
  return idleSeconds >= t.assistAfterIdle;
}

/** Speed multiplier once helping: things slow right down so small hands can catch them. */
export function assistSpeed(helping: boolean): number {
  return helping ? 0.45 : 1;
}

// ---------------------------------------------------------------------------
// Earth: what to find, by band
// ---------------------------------------------------------------------------

export type EarthThing = 'moon' | 'satellite' | 'hurricane';

export function earthThings(band: AgeBand): readonly EarthThing[] {
  if (band === 'tiny') return ['moon'];
  if (band === 'junior') return ['moon', 'satellite'];
  return ['moon', 'satellite', 'hurricane'];
}

// ---------------------------------------------------------------------------
// Jupiter: tiny taps the Great Red Spot; junior finds any 2 moons; senior finds all 4 in order from Jupiter.
// ---------------------------------------------------------------------------

export type JupiterGoal = { readonly mode: 'spot' } | { readonly mode: 'any'; readonly need: number } | { readonly mode: 'ordered'; readonly order: readonly GalileanMoon[] };

export function jupiterGoal(band: AgeBand): JupiterGoal {
  if (band === 'tiny') return { mode: 'spot' };
  if (band === 'junior') return { mode: 'any', need: 2 };
  return { mode: 'ordered', order: ['io', 'europa', 'ganymede', 'callisto'] };
}

/** Is tapping `moon` right now correct, given the moons already found? */
export function isCorrectMoon(goal: JupiterGoal, found: readonly GalileanMoon[], moon: GalileanMoon): boolean {
  if (goal.mode === 'spot') return false;
  if (found.includes(moon)) return false;
  if (goal.mode === 'any') return found.length < goal.need;
  return goal.order[found.length] === moon;
}

export function nextMoon(goal: JupiterGoal, found: readonly GalileanMoon[]): GalileanMoon | null {
  if (goal.mode !== 'ordered') return null;
  return goal.order[found.length] ?? null;
}

/**
 * Where each Galilean moon waits during the hunt: its orbital angle measured from the camera direction (radians,
 * + = screen right), near greatest elongation. Io and Ganymede sit on the right, Europa and Callisto on the left,
 * so the order outward from Jupiter is plain to see on screen — free orbits would keep swapping the apparent order.
 */
export const MOON_PARADE: Readonly<Record<GalileanMoon, number>> = { io: 1.2, europa: -1.25, ganymede: 1.95, callisto: -1.95 };

// ---------------------------------------------------------------------------
// Uranus: roll it onto its side (~98°)
// ---------------------------------------------------------------------------

export const URANUS_TILT = 98;

export interface TiltButton {
  readonly id: string;
  readonly delta: number;
  readonly label: Tiered<string>;
  readonly emoji: string;
}

export interface TiltConfig {
  readonly buttons: readonly TiltButton[];
  /** Snap to 98° when this close. 0 = must be exact. */
  readonly tolerance: number;
  readonly max: number;
  /** Show the angle in degrees. */
  readonly showDegrees: boolean;
}

export function tiltConfig(band: AgeBand): TiltConfig {
  if (band === 'tiny') {
    return { buttons: [{ id: 'tilt', delta: 33, label: 'Tilt it!', emoji: '🔄' }], tolerance: 4, max: 132, showDegrees: false };
  }
  if (band === 'junior') {
    return { buttons: [{ id: 'tilt', delta: 14, label: 'Tilt it!', emoji: '🔄' }], tolerance: 2, max: 140, showDegrees: true };
  }
  return {
    buttons: [
      { id: 'big', delta: 20, label: 'Tilt +20°', emoji: '⏩' },
      { id: 'nudge', delta: 2, label: 'Nudge +2°', emoji: '▶️' },
      { id: 'back', delta: -2, label: 'Back −2°', emoji: '◀️' },
    ],
    tolerance: 0,
    max: 160,
    showDegrees: true,
  };
}

export function applyTilt(angle: number, delta: number, cfg: TiltConfig): number {
  const next = Math.min(cfg.max, Math.max(0, angle + delta));
  return Math.abs(next - URANUS_TILT) <= cfg.tolerance ? URANUS_TILT : next;
}

export function tiltSolved(angle: number): boolean {
  return Math.abs(angle - URANUS_TILT) < 0.01;
}

/** Progress for the task banner: dots (taps) for tiny/junior, a 0–98 bar for senior. */
export function tiltProgress(angle: number, cfg: TiltConfig): { done: number; total: number } {
  const first = cfg.buttons[0];
  if (cfg.buttons.length === 1 && first) {
    const total = Math.ceil((URANUS_TILT - cfg.tolerance) / first.delta);
    return { done: tiltSolved(angle) ? total : Math.min(total - 1, Math.round(angle / first.delta)), total };
  }
  return { done: Math.max(0, Math.round(URANUS_TILT - Math.abs(URANUS_TILT - angle))), total: URANUS_TILT };
}

/** Which button gets the angle closest to 98° — highlighted when the world is helping. */
export function bestTiltButton(angle: number, cfg: TiltConfig): string | null {
  if (tiltSolved(angle)) return null;
  let best: TiltButton | null = null;
  let bestErr = Infinity;
  for (const b of cfg.buttons) {
    const err = Math.abs(applyTilt(angle, b.delta, cfg) - URANUS_TILT);
    if (err < bestErr - 1e-9) {
      best = b;
      bestErr = err;
    }
  }
  return best?.id ?? null;
}

// ---------------------------------------------------------------------------
// Cheers — short, varied, never on every tap (the banner already shows progress).
// ---------------------------------------------------------------------------

const FIRST: Tiered<string> = { tiny: 'Yay! One! 🎉', junior: 'Nice one, {name}!', senior: 'First one — great start, {name}.' };
const HALF: Tiered<string> = { tiny: 'You are super! ⭐', junior: 'Halfway there — keep going!', senior: 'Halfway. Steady hands, Commander.' };
const LAST: readonly Tiered<string>[] = [
  { tiny: 'You did it! Hooray! 🎉', junior: 'Mission complete! Brilliant, {name}!', senior: 'Mission complete. Outstanding work, {name}.' },
  { tiny: 'All done! Woo-hoo! 🚀', junior: 'You got them all! Amazing!', senior: 'All targets collected — flawless.' },
];

export function cheerFor(done: number, total: number, seed = 0): Tiered<string> | null {
  if (total <= 0 || done <= 0) return null;
  if (done >= total) return LAST[seed % LAST.length] ?? null;
  if (done === 1 && total >= 3) return FIRST;
  if (total >= 5 && done === Math.ceil(total / 2)) return HALF;
  return null;
}

export const HELP_LINE: Tiered<string> = {
  tiny: 'I will help! Look for the glow! ✨',
  junior: "Let me help — tap the one that's glowing!",
  senior: "Here's a hint: the highlighted target is next.",
};

export const OOPS_LINE: Tiered<string> = {
  tiny: 'Oops! Try again! 😊',
  junior: 'Almost! Try again.',
  senior: 'Not quite — try again.',
};
