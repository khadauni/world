import type { SpotId } from './ids';

/** "Find the heart": tiny explorers tap the glowing heart a few times; older ones pick the right spot. */
export interface MeetState {
  readonly taps: number;
  readonly found: boolean;
  readonly misses: number;
  readonly assist: boolean;
  /** Spots already tried (they fade so the choice gets easier). */
  readonly tried: readonly SpotId[];
}

export const MEET_START: MeetState = { taps: 0, found: false, misses: 0, assist: false, tried: [] };

export type MeetEvent = 'tap' | 'found' | 'miss' | 'ignored';

export function tapHeart(state: MeetState, goal: number): { state: MeetState; event: MeetEvent } {
  if (state.found) return { state, event: 'ignored' };
  const taps = state.taps + 1;
  return { state: { ...state, taps, found: taps >= goal }, event: taps >= goal ? 'found' : 'tap' };
}

export function tapSpot(state: MeetState, spot: SpotId, assistAfter: number): { state: MeetState; event: MeetEvent } {
  if (state.found || state.tried.includes(spot)) return { state, event: 'ignored' };
  if (spot === 'heart') return { state: { ...state, found: true, taps: 1 }, event: 'found' };
  const misses = state.misses + 1;
  return { state: { ...state, misses, assist: misses >= assistAfter, tried: [...state.tried, spot] }, event: 'miss' };
}
