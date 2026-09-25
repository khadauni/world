import { create } from 'zustand';
import { BeatClock } from './logic/beat';
import type { PartId } from './logic/ids';
import { labStart, type LabState } from './logic/lab';
import type { Place, RideStage } from './logic/ride';
import type { TapJudgement } from './logic/rhythm';

/**
 * State shared between the 3D Scene and the DOM Overlay of this world.
 * - Discrete UI state lives in a small zustand store (changes a few times per task).
 * - Continuous values (the heartbeat) live in mutable singletons: the scene advances them in useFrame,
 *   the overlay reads them in its own rAF loop — no React renders per frame.
 * - Overlay → Scene commands go through `send()` to the handler the active stop registers.
 */
export type Command = { type: 'beat-tap' } | { type: 'lab-pull'; id: PartId } | { type: 'lab-place'; id: PartId } | { type: 'ride-bubble' } | { type: 'ride-deliver' };

export interface HeartUi {
  readonly beat: {
    readonly good: number;
    readonly goal: number;
    readonly assist: boolean;
    /** Last judgement + a counter so the overlay can re-trigger its pop animation. */
    readonly feedback: { readonly kind: TapJudgement | null; readonly n: number };
  };
  readonly rooms: { readonly round: number; readonly total: number; readonly prompt: string; readonly done: boolean };
  readonly lab: LabState & { readonly last: PartId | null; readonly wiggle: { readonly id: PartId | null; readonly n: number } };
  readonly ride: { readonly stage: RideStage; readonly bubbles: number; readonly goal: number; readonly place: Place };
}

interface HeartStore extends HeartUi {
  handler: ((cmd: Command) => void) | null;
  patch: <K extends keyof HeartUi>(key: K, value: Partial<HeartUi[K]>) => void;
  send: (cmd: Command) => void;
  setHandler: (fn: ((cmd: Command) => void) | null) => void;
  reset: () => void;
}

const initial: HeartUi = {
  beat: { good: 0, goal: 0, assist: false, feedback: { kind: null, n: 0 } },
  rooms: { round: 0, total: 0, prompt: '', done: false },
  lab: { ...labStart(1, 'any'), last: null, wiggle: { id: null, n: 0 } },
  ride: { stage: 'to-lungs', bubbles: 0, goal: 0, place: 'vena-cava' },
};

export const useHeart = create<HeartStore>((set, get) => ({
  ...initial,
  handler: null,
  patch: (key, value) => set({ [key]: { ...get()[key], ...value } } as Partial<HeartStore>),
  send: (cmd) => get().handler?.(cmd),
  setHandler: (fn) => set({ handler: fn }),
  reset: () => set({ ...initial }),
}));

/** The one heartbeat every part of the current set follows. Advanced by the active set's BeatDriver. */
export const beat = new BeatClock();

/** Continuous values shared with the overlay and the camera (mutated, never re-rendered). */
export const live = {
  /** Pixels the HUD covers at the top / bottom (animated by the Scene per phase). */
  hudTop: 70,
  hudBottom: 255,
  /** Measured height of our own task controls at the bottom (0 = none). Written by the Overlay. */
  overlayBottom: 0,
};
