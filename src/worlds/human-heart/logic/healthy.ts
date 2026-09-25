import type { AgeBand } from '@/core/types';

/** Friendly choices around the heart. "Sometimes" items are never wrong to like — they're just for sometimes. */
export const ITEM_IDS = ['run', 'sleep', 'water', 'apple', 'broccoli', 'bike', 'banana', 'carrot', 'donut', 'lolly', 'fries', 'fizzy', 'screens'] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export const EVERYDAY: ReadonlySet<ItemId> = new Set<ItemId>(['run', 'sleep', 'water', 'apple', 'broccoli', 'bike', 'banana', 'carrot']);

export function isEveryday(id: ItemId): boolean {
  return EVERYDAY.has(id);
}

/** Items on stage per band (everyday choices first, then treats — the scene spreads them around). */
export const BAND_ITEMS: Readonly<Record<AgeBand, readonly ItemId[]>> = {
  tiny: ['run', 'water', 'apple', 'donut', 'lolly'],
  junior: ['run', 'sleep', 'water', 'apple', 'broccoli', 'donut', 'fizzy', 'fries'],
  senior: ['bike', 'sleep', 'water', 'broccoli', 'banana', 'carrot', 'donut', 'fizzy', 'fries', 'screens'],
};

/**
 * Interleave everyday choices and treats so the healthy ones are spread all around the ring
 * (a deterministic layout: no two treats side by side when it can be avoided).
 */
export function ringOrder(items: readonly ItemId[]): ItemId[] {
  const good = items.filter(isEveryday);
  const treats = items.filter((i) => !isEveryday(i));
  const out: ItemId[] = [];
  const step = treats.length > 0 ? good.length / treats.length : Infinity;
  let gi = 0;
  for (let t = 0; t < treats.length; t++) {
    const until = Math.round((t + 0.5) * step);
    while (gi < until && gi < good.length) out.push(good[gi++] as ItemId);
    out.push(treats[t] as ItemId);
  }
  while (gi < good.length) out.push(good[gi++] as ItemId);
  return out;
}

export interface HealthyState {
  readonly picked: readonly ItemId[];
  readonly treats: readonly ItemId[];
  readonly misses: number;
  readonly assist: boolean;
  readonly goal: number;
}

export function healthyStart(goal: number): HealthyState {
  return { picked: [], treats: [], misses: 0, assist: false, goal };
}

export type HealthyEvent = 'picked' | 'done' | 'treat' | 'ignored';

export function tapItem(state: HealthyState, id: ItemId, assistAfter: number): { state: HealthyState; event: HealthyEvent } {
  if (state.picked.length >= state.goal || state.picked.includes(id)) return { state, event: 'ignored' };
  if (!isEveryday(id)) {
    const misses = state.misses + 1;
    const treats = state.treats.includes(id) ? state.treats : [...state.treats, id];
    return { state: { ...state, treats, misses, assist: misses >= assistAfter }, event: 'treat' };
  }
  const picked = [...state.picked, id];
  return { state: { ...state, picked }, event: picked.length >= state.goal ? 'done' : 'picked' };
}

/** 0 → 1: how happy/strong the heart looks. */
export function heartPower(state: HealthyState): number {
  return state.goal > 0 ? Math.min(1, state.picked.length / state.goal) : 1;
}
