/**
 * Marker state for the 3D mission map, mirroring the shell's unlock rule: every finished stop stays open,
 * and the first unfinished stop is the "next" one (it bounces). Everything after it is locked.
 */
export type MarkerState = 'done' | 'next' | 'open' | 'locked';

export function markerStates(stopIds: readonly string[], completed: readonly string[]): Record<string, MarkerState> {
  const done = new Set(completed);
  const out: Record<string, MarkerState> = {};
  let nextFound = false;
  for (const id of stopIds) {
    if (done.has(id)) out[id] = 'done';
    else if (!nextFound) {
      out[id] = 'next';
      nextFound = true;
    } else out[id] = 'locked';
  }
  return out;
}

/** Which "set" (3D diorama) should be on screen for a flow phase. */
export function setForPhase(phase: string, stopId: string | null): string {
  if (!stopId || phase === 'intro' || phase === 'map' || phase === 'finale') return 'map';
  return stopId;
}
