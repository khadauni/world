import type { AgeBand } from '@/core/types';
import type { ChamberId } from './ids';

/**
 * "Tap the chamber I name" rounds. Tiny explorers go by colour and top/bottom, juniors by name,
 * seniors by function clues and the mirror-image left/right trick.
 */
export interface RoomRound {
  readonly target: ChamberId;
  readonly prompt: string;
}

export const ROOM_ROUNDS: Readonly<Record<AgeBand, readonly RoomRound[]>> = {
  tiny: [
    { target: 'ra', prompt: 'Tap the BLUE room on TOP! 🔵' },
    { target: 'lv', prompt: 'Tap the RED room at the BOTTOM! 🔴' },
    { target: 'la', prompt: 'Tap the RED room on TOP! 🔴' },
    { target: 'rv', prompt: 'Tap the BLUE room at the BOTTOM! 🔵' },
  ],
  junior: [
    { target: 'ra', prompt: 'Tap the RIGHT ATRIUM!' },
    { target: 'lv', prompt: 'Tap the LEFT VENTRICLE — the strongest pump!' },
    { target: 'la', prompt: 'Tap the LEFT ATRIUM!' },
    { target: 'rv', prompt: 'Tap the RIGHT VENTRICLE!' },
  ],
  senior: [
    { target: 'ra', prompt: 'Tap the chamber that receives oxygen-poor blood from the body.' },
    { target: 'lv', prompt: 'Tap the strongest pump — the chamber with the thickest wall.' },
    { target: 'rv', prompt: 'Tap the chamber that pumps blood to the lungs.' },
    { target: 'la', prompt: 'Tap the chamber where oxygen-rich blood from the lungs arrives.' },
    { target: 'ra', prompt: 'Mirror trick! Tap the heart’s RIGHT atrium — it’s on YOUR left.' },
  ],
};

export function roomRounds(band: AgeBand, count: number): readonly RoomRound[] {
  const all = ROOM_ROUNDS[band];
  return all.slice(0, Math.max(1, Math.min(count, all.length)));
}

export interface RoomsState {
  readonly round: number;
  readonly misses: number;
  readonly assist: boolean;
  readonly done: boolean;
}

export const ROOMS_START: RoomsState = { round: 0, misses: 0, assist: false, done: false };

export function reduceRoomTap(
  state: RoomsState,
  tapped: ChamberId,
  rounds: readonly RoomRound[],
  assistAfter: number,
): { state: RoomsState; correct: boolean } {
  if (state.done) return { state, correct: false };
  const round = rounds[state.round];
  if (!round) return { state: { ...state, done: true }, correct: false };
  if (tapped === round.target) {
    const next = state.round + 1;
    return { state: { round: next, misses: 0, assist: false, done: next >= rounds.length }, correct: true };
  }
  const misses = state.misses + 1;
  return { state: { ...state, misses, assist: misses >= assistAfter }, correct: false };
}
