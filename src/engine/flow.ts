import type { FlowPhase, WorldContent } from '@/core/types';

export interface FlowState {
  readonly phase: FlowPhase;
  readonly stopId: string | null;
  /** Stars earned on the stop just finished (reward phase). */
  readonly lastStars: 0 | 1 | 2 | 3;
  /** Bumps every time a stop is (re)started so quizzes reshuffle. */
  readonly attempt: number;
}

export type FlowEvent =
  | { type: 'START' }
  | { type: 'SELECT_STOP'; stopId: string }
  | { type: 'ARRIVED' }
  | { type: 'BEGIN_TASK'; hasTask: boolean }
  | { type: 'TASK_DONE' }
  | { type: 'QUIZ_DONE'; stars: 1 | 2 | 3 }
  | { type: 'CONTINUE'; allDone: boolean; badgeAlreadyEarned: boolean }
  | { type: 'TO_MAP' }
  | { type: 'FINALE_DONE' }
  /** The child chose "Skip to quiz" during the tour or the mission. */
  | { type: 'SKIP_TO_QUIZ' }
  /** Watch this stop's tour again from the reward card. */
  | { type: 'REPLAY_TOUR' };

export const initialFlow: FlowState = { phase: 'intro', stopId: null, lastStars: 0, attempt: 0 };

/**
 * The learning loop for every world:
 *   intro → map → travel → explore (guided tour) → (task) → quiz → reward → map … → finale
 * with "skip to quiz" shortcuts from the tour and the mission.
 * Pure reducer so it is trivially testable and the same for every world.
 */
export function flowReducer(state: FlowState, event: FlowEvent): FlowState {
  switch (event.type) {
    case 'START':
      return state.phase === 'intro' ? { ...state, phase: 'map', stopId: null } : state;
    case 'SELECT_STOP':
      if (state.phase !== 'map' && state.phase !== 'intro' && state.phase !== 'reward') return state;
      return { ...state, phase: 'travel', stopId: event.stopId, lastStars: 0, attempt: state.attempt + 1 };
    case 'ARRIVED':
      return state.phase === 'travel' ? { ...state, phase: 'explore' } : state;
    case 'BEGIN_TASK':
      if (state.phase !== 'explore') return state;
      return { ...state, phase: event.hasTask ? 'task' : 'quiz' };
    case 'TASK_DONE':
      return state.phase === 'task' ? { ...state, phase: 'quiz' } : state;
    case 'QUIZ_DONE':
      return state.phase === 'quiz' ? { ...state, phase: 'reward', lastStars: event.stars } : state;
    case 'CONTINUE':
      if (state.phase !== 'reward') return state;
      if (event.allDone && !event.badgeAlreadyEarned) return { ...state, phase: 'finale', stopId: null };
      return { ...state, phase: 'map', stopId: null };
    case 'TO_MAP':
      return state.phase === 'intro' ? state : { ...state, phase: 'map', stopId: null };
    case 'FINALE_DONE':
      return state.phase === 'finale' ? { ...state, phase: 'map', stopId: null } : state;
    case 'SKIP_TO_QUIZ':
      return state.phase === 'explore' || state.phase === 'task' ? { ...state, phase: 'quiz' } : state;
    case 'REPLAY_TOUR':
      return state.phase === 'reward' && state.stopId ? { ...state, phase: 'explore', attempt: state.attempt + 1 } : state;
  }
}

/**
 * Stops unlock in order so the story builds up, but every stop the child has finished stays open for replay,
 * and the next unfinished stop is always open.
 */
export function unlockedStops(content: WorldContent, completed: ReadonlySet<string>): Set<string> {
  const open = new Set<string>();
  for (const stop of content.stops) {
    open.add(stop.id);
    if (!completed.has(stop.id)) break;
  }
  for (const id of completed) open.add(id);
  return open;
}

export function nextStopId(content: WorldContent, completed: ReadonlySet<string>): string | null {
  return content.stops.find((s) => !completed.has(s.id))?.id ?? null;
}
