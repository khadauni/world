import type { Object3D } from 'three';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { FX_PULSE_KINDS, PULSE_ENVELOPES, envelopeAt, envelopeDuration, retriggerAge, type FxPulseKind } from './envelopes';
import { approach, clamp01, createSignals, decayTrauma, deriveSignals, type FxChannels, type FxSignals } from './signals';

/** How strongly the camera shakes at full trauma. Angles in radians, offsets in world units. */
export interface ShakeProfile {
  /** Max yaw/pitch at shake = 1 (default 0.045 rad ≈ 2.6°). */
  readonly maxAngle: number;
  /** Max roll at shake = 1 (default 0.06 rad). */
  readonly maxRoll: number;
  /** Max sideways/vertical camera offset at shake = 1, in world units (default 0.08). */
  readonly maxOffset: number;
  /** Noise speed — higher is jitterier (default 13). */
  readonly frequency: number;
}

/** FOV-kick settings, switched on by mounting `<FovKick />`. */
export interface FovKickConfig {
  readonly enabled: boolean;
  /** Clamp for the kick, in degrees (default 18). */
  readonly maxDegrees: number;
  /** Multiplier on the derived kick (default 1). */
  readonly scale: number;
}

export const DEFAULT_SHAKE: ShakeProfile = { maxAngle: 0.045, maxRoll: 0.06, maxOffset: 0.08, frequency: 13 };
export const DEFAULT_FOV_KICK: FovKickConfig = { enabled: false, maxDegrees: 18, scale: 1 };

/** Trauma added automatically by each pulse (× strength). */
export const PULSE_TRAUMA: Readonly<Record<FxPulseKind, number>> = { boost: 0.22, impact: 0.62, flash: 0, warp: 0.3, land: 0.5 };

/** Trauma lost per second. */
export const TRAUMA_DECAY = 0.95;
/** How quickly the smoothed speed follows `setSpeed` (1/s). */
export const SPEED_SHARPNESS = 3.2;

interface PulseChannel {
  age: number;
  strength: number;
}

/** Mutable internals — mutated in place every frame so reading/writing never allocates or notifies React. */
interface FxInternals {
  speedTarget: number;
  channels: FxChannels;
  pulses: Record<FxPulseKind, PulseChannel>;
}

export interface FxState {
  /**
   * Live, derived effect drivers. The SAME object is mutated every frame — read it inside `useFrame`
   * (`fxSignals().shake`), never copy it into React state.
   */
  readonly signals: FxSignals;
  /** The registered sun (god-rays light source) — reactive, so the composer can mount GodRays. */
  readonly sun: Object3D | null;
  readonly reducedMotion: boolean;
  readonly shake: ShakeProfile;
  readonly fovKick: FovKickConfig;
  /** Fire a one-shot cinematic pulse. `strength` 0..1 (values up to 2 are allowed for huge hits). */
  pulse(kind: FxPulseKind, strength?: number): void;
  /** Continuous forward speed 0..1 (drives warp streaks, blur, aberration, FOV). Smoothed unless `immediate`. */
  setSpeed(value: number, immediate?: boolean): void;
  /** Add camera trauma (0..1). Shake amplitude is trauma², so small knocks stay small. */
  addTrauma(amount: number): void;
  /** Continuous low rumble 0..1 (engine burn, re-entry). Set it back to 0 when done. */
  setRumble(level: number): void;
  /** Register the god-rays light source. Returns an unregister function (safe to call twice). */
  registerSun(object: Object3D | null): () => void;
  setReducedMotion(on: boolean): void;
  setShakeProfile(profile: Partial<ShakeProfile>): void;
  setFovKick(config: Partial<FovKickConfig>): void;
  /** Advance time: decays trauma and pulses and re-derives `signals`. Called once per frame by `<FxRuntime>`. */
  tick(dt: number): void;
  /** Back to calm (called when a world unmounts). Keeps the registered sun. */
  reset(): void;
}

function idlePulses(): Record<FxPulseKind, PulseChannel> {
  return {
    boost: { age: Infinity, strength: 0 },
    impact: { age: Infinity, strength: 0 },
    flash: { age: Infinity, strength: 0 },
    warp: { age: Infinity, strength: 0 },
    land: { age: Infinity, strength: 0 },
  };
}

function channelValue(kind: FxPulseKind, p: PulseChannel): number {
  return p.strength * envelopeAt(PULSE_ENVELOPES[kind], p.age);
}

/** Creates an isolated FX store (the app uses the shared `fxStore`; tests create their own). */
export function createFxStore(): StoreApi<FxState> {
  const internals: FxInternals = {
    speedTarget: 0,
    channels: { speed: 0, trauma: 0, rumble: 0, boost: 0, impact: 0, flash: 0, warp: 0, land: 0 },
    pulses: idlePulses(),
  };
  const signals = createSignals();

  return createStore<FxState>()((set, get) => ({
    signals,
    sun: null,
    reducedMotion: false,
    shake: DEFAULT_SHAKE,
    fovKick: DEFAULT_FOV_KICK,

    pulse(kind, strength = 1) {
      const s = Math.max(0, Math.min(2, Number.isFinite(strength) ? strength : 0));
      if (s <= 0) return;
      const p = internals.pulses[kind];
      const env = PULSE_ENVELOPES[kind];
      const current = channelValue(kind, p);
      const peak = Math.max(s, current);
      p.age = retriggerAge(env, current, peak);
      p.strength = peak;
      const ch = internals.channels;
      ch.trauma = clamp01(ch.trauma + PULSE_TRAUMA[kind] * s);
      ch[kind] = channelValue(kind, p);
      deriveSignals(ch, get().reducedMotion, signals);
    },

    setSpeed(value, immediate = false) {
      const v = clamp01(Number.isFinite(value) ? value : 0);
      internals.speedTarget = v;
      if (immediate) {
        internals.channels.speed = v;
        deriveSignals(internals.channels, get().reducedMotion, signals);
      }
    },

    addTrauma(amount) {
      if (!Number.isFinite(amount)) return;
      const ch = internals.channels;
      ch.trauma = clamp01(ch.trauma + amount);
    },

    setRumble(level) {
      internals.channels.rumble = clamp01(Number.isFinite(level) ? level : 0);
    },

    registerSun(object) {
      set({ sun: object });
      return () => {
        if (get().sun === object) set({ sun: null });
      };
    },

    setReducedMotion(on) {
      if (get().reducedMotion === on) return;
      set({ reducedMotion: on });
      deriveSignals(internals.channels, on, signals);
    },

    setShakeProfile(profile) {
      set({ shake: { ...get().shake, ...profile } });
    },

    setFovKick(config) {
      set({ fovKick: { ...get().fovKick, ...config } });
    },

    tick(dtRaw) {
      // Clamp so a background tab (huge dt) cannot skip a whole envelope in one frame.
      const dt = Math.min(0.1, Math.max(0, Number.isFinite(dtRaw) ? dtRaw : 0));
      const ch = internals.channels;
      signals.time += dt;
      ch.speed = approach(ch.speed, internals.speedTarget, SPEED_SHARPNESS, dt);
      ch.trauma = decayTrauma(ch.trauma, dt, TRAUMA_DECAY);
      for (const kind of FX_PULSE_KINDS) {
        const p = internals.pulses[kind];
        if (p.age === Infinity) {
          ch[kind] = 0;
          continue;
        }
        p.age += dt;
        if (p.age > envelopeDuration(PULSE_ENVELOPES[kind])) {
          p.age = Infinity;
          p.strength = 0;
          ch[kind] = 0;
        } else {
          ch[kind] = channelValue(kind, p);
        }
      }
      deriveSignals(ch, get().reducedMotion, signals);
    },

    reset() {
      internals.speedTarget = 0;
      const ch = internals.channels;
      ch.speed = ch.trauma = ch.rumble = ch.boost = ch.impact = ch.flash = ch.warp = ch.land = 0;
      internals.pulses = idlePulses();
      deriveSignals(ch, get().reducedMotion, signals);
      set({ shake: DEFAULT_SHAKE, fovKick: DEFAULT_FOV_KICK });
    },
  }));
}

/** The shared FX store used by `<WorldCanvas>` and every kit component. */
export const fxStore: StoreApi<FxState> = createFxStore();

/** Live effect drivers (a stable, mutated-in-place object). Safe to call inside `useFrame`. */
export function fxSignals(): FxSignals {
  return fxStore.getState().signals;
}

/**
 * The world-facing FX remote control. Call from anywhere — event handlers, `useFrame`, task logic:
 *
 * ```ts
 * fx.pulse('boost');          // whoosh!
 * fx.pulse('impact', 0.6);    // bonk (shake + flash + aberration)
 * fx.setSpeed(throttle);      // 0..1 continuous
 * ```
 */
export const fx = {
  pulse: (kind: FxPulseKind, strength = 1): void => fxStore.getState().pulse(kind, strength),
  setSpeed: (value: number, immediate = false): void => fxStore.getState().setSpeed(value, immediate),
  addTrauma: (amount: number): void => fxStore.getState().addTrauma(amount),
  setRumble: (level: number): void => fxStore.getState().setRumble(level),
  registerSun: (object: Object3D | null): (() => void) => fxStore.getState().registerSun(object),
  setShakeProfile: (profile: Partial<ShakeProfile>): void => fxStore.getState().setShakeProfile(profile),
  signals: fxSignals,
} as const;
