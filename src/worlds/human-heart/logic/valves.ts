import type { ValveKind } from './beat';
import type { ValveId } from './ids';

/** "Fix the leaky door": which valves still leak, and gentle help after misses. */
export interface ValvesState {
  readonly leaky: readonly ValveId[];
  readonly fixed: readonly ValveId[];
  readonly misses: number;
  readonly assist: boolean;
}

export function valvesStart(leaky: readonly ValveId[]): ValvesState {
  return { leaky: [...leaky], fixed: [], misses: 0, assist: false };
}

export type ValveEvent = 'fixed' | 'done' | 'healthy' | 'ignored';

export function tapValve(state: ValvesState, id: ValveId, assistAfter: number): { state: ValvesState; event: ValveEvent } {
  if (state.fixed.includes(id)) return { state, event: 'ignored' };
  if (!state.leaky.includes(id)) {
    const misses = state.misses + 1;
    return { state: { ...state, misses, assist: misses >= assistAfter }, event: 'healthy' };
  }
  const leaky = state.leaky.filter((v) => v !== id);
  const fixed = [...state.fixed, id];
  return { state: { leaky, fixed, misses: 0, assist: false }, event: leaky.length === 0 ? 'done' : 'fixed' };
}

/** AV valves sit between atria and ventricles; semilunar valves guard the exits into the arteries. */
export const VALVE_KIND: Readonly<Record<ValveId, ValveKind>> = {
  tricuspid: 'av',
  mitral: 'av',
  pulmonary: 'sl',
  aortic: 'sl',
};

/** Number of flaps (leaflets / cusps) — the mitral valve is the only one with two. */
export const VALVE_FLAPS: Readonly<Record<ValveId, number>> = {
  tricuspid: 3,
  mitral: 2,
  pulmonary: 3,
  aortic: 3,
};
