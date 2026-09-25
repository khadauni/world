import type { AgeBand } from '@/core/types';
import type { SpotId, ValveId } from './ids';

/**
 * Difficulty for every task, per age band. Tiny = very easy, forgiving, big targets, auto-assist;
 * senior = more targets, tighter timing, reasoning. Content strings read their numbers from here so the
 * instructions always match what the scene asks for.
 */
export interface Tuning {
  readonly meet: {
    /** 'tap-heart': the heart glows and the child taps it; 'spots': pick the right glowing spot. */
    readonly mode: 'tap-heart' | 'spots';
    readonly taps: number;
    readonly spots: readonly SpotId[];
  };
  readonly beat: {
    readonly goal: number;
    readonly bpm: number;
    /** ± seconds around the peak squeeze that count as "on the beat". */
    readonly window: number;
    readonly ecg: boolean;
  };
  readonly rooms: { readonly rounds: number };
  readonly lab: {
    readonly goal: number;
    /** How parts go back: any order, by name, or by a function clue. */
    readonly rebuild: 'any' | 'names' | 'clues';
  };
  readonly valves: { readonly leaky: readonly ValveId[]; readonly bpm: number };
  readonly ride: { readonly bubbles: number };
  readonly healthy: { readonly goal: number; readonly items: number };
  /** Misses before the world lends a hand (glow, slower beat, wider window…). */
  readonly assistAfter: number;
}

export const TUNING: Readonly<Record<AgeBand, Tuning>> = {
  tiny: {
    meet: { mode: 'tap-heart', taps: 3, spots: ['heart'] },
    beat: { goal: 3, bpm: 48, window: 0.42, ecg: false },
    rooms: { rounds: 3 },
    lab: { goal: 2, rebuild: 'any' },
    valves: { leaky: ['mitral'], bpm: 24 },
    ride: { bubbles: 3 },
    healthy: { goal: 3, items: 5 },
    assistAfter: 2,
  },
  junior: {
    meet: { mode: 'spots', taps: 1, spots: ['heart', 'head', 'tummy'] },
    beat: { goal: 5, bpm: 56, window: 0.28, ecg: false },
    rooms: { rounds: 4 },
    lab: { goal: 4, rebuild: 'names' },
    valves: { leaky: ['tricuspid', 'aortic'], bpm: 24 },
    ride: { bubbles: 4 },
    healthy: { goal: 5, items: 8 },
    assistAfter: 2,
  },
  senior: {
    meet: { mode: 'spots', taps: 1, spots: ['heart', 'mirror', 'belly'] },
    beat: { goal: 7, bpm: 66, window: 0.2, ecg: true },
    rooms: { rounds: 5 },
    lab: { goal: 10, rebuild: 'clues' },
    valves: { leaky: ['mitral', 'pulmonary', 'aortic'], bpm: 24 },
    ride: { bubbles: 6 },
    healthy: { goal: 6, items: 10 },
    assistAfter: 2,
  },
};

export function tuning(band: AgeBand): Tuning {
  return TUNING[band];
}

/** Timing window after the world starts helping: much wider, so nobody gets stuck. */
export function assistedWindow(band: AgeBand): number {
  return Math.min(0.5, TUNING[band].beat.window * 1.8);
}

/** Beat tempo while assisting: a little slower gives more time to react. */
export function assistedBpm(band: AgeBand): number {
  return Math.round(TUNING[band].beat.bpm * 0.85);
}
