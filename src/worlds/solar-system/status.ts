import { STOP_IDS, type BodyId } from './layout';

export type StopStatus = 'done' | 'next' | 'open' | 'locked';

/**
 * How each stop should look on the map. Mirrors the shell's unlock rule: stops open in order, finished
 * stops stay open, and the first unfinished stop is "next".
 */
export function stopStatus(completed: readonly string[]): Record<BodyId, StopStatus> {
  const done = new Set(completed);
  const next = STOP_IDS.find((id) => !done.has(id)) ?? null;
  let reachedNext = false;
  const out = {} as Record<BodyId, StopStatus>;
  for (const id of STOP_IDS) {
    if (done.has(id)) out[id] = 'done';
    else if (id === next) {
      out[id] = 'next';
      reachedNext = true;
    } else out[id] = reachedNext ? 'locked' : 'open';
  }
  return out;
}
