import type { FlightEvent, FlightEventType } from './types';

/** Fixed-size pool of gameplay events filled by the physics step — no allocations while flying. */
export interface FlightEventQueue {
  readonly items: readonly FlightEvent[];
  count: number;
}

export const EVENT_POOL_SIZE = 48;

export function createEventQueue(size = EVENT_POOL_SIZE): FlightEventQueue {
  return {
    items: Array.from({ length: size }, () => ({ type: 'go' as FlightEventType, index: -1, combo: 0, value: 0 })),
    count: 0,
  };
}

/** Append an event (silently dropped if the pool is full — events are cosmetic, physics state is authoritative). */
export function pushEvent(q: FlightEventQueue, type: FlightEventType, index = -1, combo = 0, value = 0): void {
  if (q.count >= q.items.length) return;
  const e = q.items[q.count] as FlightEvent;
  e.type = type;
  e.index = index;
  e.combo = combo;
  e.value = value;
  q.count++;
}

export function clearEvents(q: FlightEventQueue): void {
  q.count = 0;
}
