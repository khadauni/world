import { create } from 'zustand';
import { applyTilt, tiltSolved, type TiltConfig } from './tasks/rules';

/**
 * Tiny shared store for the Uranus mission: the DOM overlay (buttons) writes the angle, the 3D scene animates
 * the planet toward it. Kept local to this world.
 */
export interface TiltState {
  /** Target tilt in degrees (the scene springs toward it). */
  readonly angle: number;
  readonly taps: number;
  readonly solved: boolean;
  /** Bumps on every tilt so the scene can react (sparkles, wobble). */
  readonly nonce: number;
  reset(): void;
  tilt(delta: number, cfg: TiltConfig): number;
}

export const useTiltStore = create<TiltState>((set, get) => ({
  angle: 0,
  taps: 0,
  solved: false,
  nonce: 0,
  reset: () => set({ angle: 0, taps: 0, solved: false, nonce: 0 }),
  tilt: (delta, cfg) => {
    const s = get();
    if (s.solved) return s.angle;
    const angle = applyTilt(s.angle, delta, cfg);
    set({ angle, taps: s.taps + 1, solved: tiltSolved(angle), nonce: s.nonce + 1 });
    return angle;
  },
}));
