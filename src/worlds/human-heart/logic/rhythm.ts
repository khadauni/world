import { CYCLE, offsetFromSqueeze } from './beat';

/**
 * "Tap when the heart squeezes" — judged against the peak of the ventricular squeeze.
 * Pure so the rules (and their kindness) are unit-tested.
 */
export type TapJudgement = 'good' | 'early' | 'late' | 'again';

export interface RhythmState {
  readonly good: number;
  readonly misses: number;
  readonly assist: boolean;
  /** Index of the last beat that already earned a point (one point per squeeze). */
  readonly lastScored: number;
}

export const RHYTHM_START: RhythmState = { good: 0, misses: 0, assist: false, lastScored: -1 };

/** Which beat's squeeze a tap at `phase` is closest to (`beats` counts lubs so far). */
export function nearestBeatIndex(phase: number, beats: number): number {
  return phase < CYCLE.ventPeak + 0.5 ? beats : beats + 1;
}

export function judgeTap(phase: number, bpm: number, window: number): { judgement: Exclude<TapJudgement, 'again'>; offset: number } {
  const offset = offsetFromSqueeze(phase, bpm);
  if (Math.abs(offset) <= window) return { judgement: 'good', offset };
  return { judgement: offset < 0 ? 'early' : 'late', offset };
}

export interface TapInput {
  readonly phase: number;
  readonly beats: number;
  readonly bpm: number;
  readonly window: number;
  readonly assistWindow: number;
  readonly assistAfter: number;
}

export function reduceTap(state: RhythmState, tap: TapInput): { state: RhythmState; judgement: TapJudgement } {
  const win = state.assist ? tap.assistWindow : tap.window;
  const { judgement } = judgeTap(tap.phase, tap.bpm, win);
  const index = nearestBeatIndex(tap.phase, tap.beats);
  if (judgement === 'good') {
    if (index === state.lastScored) return { state, judgement: 'again' };
    return { state: { ...state, good: state.good + 1, lastScored: index }, judgement };
  }
  const misses = state.misses + 1;
  return { state: { ...state, misses, assist: state.assist || misses >= tap.assistAfter }, judgement };
}
