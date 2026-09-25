import { create } from 'zustand';
import type { CheckId } from './logic/bands';

/**
 * State shared between the 3D Scene and the DOM Overlay of this world.
 * - Discrete UI state lives in a tiny zustand store (changes a handful of times per task).
 * - Continuous values (hold fill, altitude, speed…) live in the mutable `live` object: the scene writes
 *   them in useFrame and the overlay reads them in its own rAF loop — no React renders per frame.
 * - Overlay → Scene commands go through `send()` to a handler the active stop registers.
 */

export type Command =
  | { type: 'check'; id: CheckId }
  | { type: 'launch' }
  | { type: 'boost' }
  | { type: 'hop' }
  | { type: 'tuck'; who: 'rover' | 'lander' };

export type LaunchStage = 'checks' | 'hold' | 'countdown' | 'liftoff';
export type LandingStage = 'descent' | 'gate' | 'soft' | 'hard';

export interface MissionUi {
  readonly launch: {
    readonly done: readonly CheckId[];
    readonly assist: CheckId | null;
    readonly stage: LaunchStage;
    readonly count: number;
    /** Bumps when a check was tapped out of order (the card wiggles). */
    readonly wiggle: { readonly id: CheckId | null; readonly n: number };
  };
  readonly orbit: { readonly inZone: boolean; readonly assist: boolean; readonly busy: boolean };
  readonly landing: { readonly stage: LandingStage; readonly assist: boolean; readonly holdNow: boolean };
  readonly night: { readonly step: number; readonly busy: boolean; readonly assist: boolean };
}

interface MissionStore extends MissionUi {
  thrust: boolean;
  handler: ((cmd: Command) => void) | null;
  patch: <K extends keyof MissionUi>(key: K, value: Partial<MissionUi[K]>) => void;
  setThrust: (on: boolean) => void;
  send: (cmd: Command) => void;
  setHandler: (fn: ((cmd: Command) => void) | null) => void;
  reset: () => void;
}

const initial: MissionUi = {
  launch: { done: [], assist: null, stage: 'checks', count: 0, wiggle: { id: null, n: 0 } },
  orbit: { inZone: false, assist: false, busy: false },
  landing: { stage: 'descent', assist: false, holdNow: false },
  night: { step: 0, busy: false, assist: false },
};

export const useMission = create<MissionStore>((set, get) => ({
  ...initial,
  thrust: false,
  handler: null,
  patch: (key, value) => set({ [key]: { ...get()[key], ...value } } as Partial<MissionStore>),
  setThrust: (on) => {
    if (get().thrust !== on) set({ thrust: on });
  },
  send: (cmd) => get().handler?.(cmd),
  setHandler: (fn) => set({ handler: fn }),
  reset: () => set({ ...initial, thrust: false }),
}));

/** Continuous telemetry (scene writes, overlay reads each animation frame). */
export const live = {
  /** LAUNCH ring fill 0..1 (overlay writes, scene reads for rumble). */
  launchFill: 0,
  /** Landing: altitude (m), vertical speed (m/s, +down), fuel 0..1, safe speed (m/s). */
  alt: 0,
  speed: 0,
  fuel: 1,
  safeSpeed: 2,
  startAlt: 100,
  /** Short THRUST pulse from a tap (timestamp, ms). */
  pulseUntil: 0,
  /** Hop gauge in cm (senior). */
  gauge: 0,
  gaugeMax: 60,
  gaugeWindow: [35, 45] as [number, number],
  /** Pixels the HUD currently covers at the top / bottom (animated by the Scene per phase). */
  hudTop: 70,
  hudBottom: 250,
};

export function resetLive(): void {
  live.launchFill = 0;
  live.alt = 0;
  live.speed = 0;
  live.fuel = 1;
  live.pulseUntil = 0;
  live.gauge = 0;
}
