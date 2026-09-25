import { ASSIST_AFTER_MISSES } from './bands';

/**
 * A set of tap targets (checks, waypoints, latches, rock samples…), optionally in a required order.
 * Pure + immutable so every task rule is unit-testable. A wrong tap is a "miss": it never blocks,
 * it only counts towards auto-assist.
 */
export interface SeqState {
  readonly total: number;
  readonly ordered: boolean;
  readonly done: readonly number[];
  readonly misses: number;
}

export type SeqResult = 'hit' | 'miss' | 'repeat' | 'complete';

export function createSeq(total: number, ordered: boolean): SeqState {
  return { total: Math.max(0, Math.floor(total)), ordered, done: [], misses: 0 };
}

export function isDone(s: SeqState, index: number): boolean {
  return s.done.includes(index);
}

export function isComplete(s: SeqState): boolean {
  return s.done.length >= s.total;
}

/** The target the child should tap next (for ordered sets), or the first open one. */
export function nextTarget(s: SeqState): number | null {
  for (let i = 0; i < s.total; i++) if (!s.done.includes(i)) return i;
  return null;
}

export function needsAssist(s: SeqState): boolean {
  return s.misses >= ASSIST_AFTER_MISSES;
}

export function tapSeq(s: SeqState, index: number): { state: SeqState; result: SeqResult } {
  if (index < 0 || index >= s.total || isComplete(s)) return { state: s, result: 'repeat' };
  if (s.done.includes(index)) return { state: s, result: 'repeat' };
  if (s.ordered && nextTarget(s) !== index) return { state: { ...s, misses: s.misses + 1 }, result: 'miss' };
  const state: SeqState = { ...s, done: [...s.done, index] };
  return { state, result: isComplete(state) ? 'complete' : 'hit' };
}

/** Count a miss that did not come from tapping a target (e.g. boosting outside the zone). */
export function addMiss(s: SeqState): SeqState {
  return { ...s, misses: s.misses + 1 };
}
