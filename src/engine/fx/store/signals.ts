/**
 * Turns the raw FX channels (speed, trauma, pulse envelopes) into the handful of numbers every effect reads:
 * how much to shake, how far to kick the FOV, how strong the warp streaks / blur / aberration / flash are.
 * Pure functions, zero allocations: `deriveSignals` writes into an existing object.
 */

/** Raw channel values, all roughly 0..1. */
export interface FxChannels {
  /** Smoothed forward speed 0..1. */
  speed: number;
  /** Camera trauma 0..1 (decays linearly). Shake amplitude is trauma². */
  trauma: number;
  /** Continuous low rumble 0..1 (engine thrust, re-entry…). */
  rumble: number;
  boost: number;
  impact: number;
  flash: number;
  warp: number;
  land: number;
}

/** Derived, ready-to-use effect drivers. Read them inside `useFrame` via `fxSignals()`. */
export interface FxSignals extends FxChannels {
  /** Seconds since the FX runtime started (pauses with the canvas). */
  time: number;
  /** Camera shake amount 0..1 (already 0 with reduced motion). */
  shake: number;
  /** Extra vertical camera dip 0..1 from a landing (0 with reduced motion). */
  dip: number;
  /** FOV change in degrees (positive = wider). 0 with reduced motion. */
  fovKick: number;
  /** Chromatic aberration 0..1. */
  aberration: number;
  /** Radial speed blur 0..1. */
  blur: number;
  /** Screen flash 0..1 (0 with reduced motion — no flashing). */
  flashAmount: number;
  /** Warp streak intensity 0..1. */
  streaks: number;
  /** Hyperspace tunnel intensity 0..1 (0 with reduced motion). */
  tunnel: number;
}

export const clamp01 = (v: number): number => (v <= 0 ? 0 : v >= 1 ? 1 : v);

/** Linear trauma decay: trauma never goes negative. `rate` is units per second. */
export function decayTrauma(trauma: number, dt: number, rate: number): number {
  return Math.max(0, trauma - Math.max(0, dt) * rate);
}

/** Frame-rate independent exponential approach of `current` towards `target` (`sharpness` ≈ 1/seconds). */
export function approach(current: number, target: number, sharpness: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-sharpness * Math.max(0, dt)));
}

/** Fresh zeroed signals object (allocate once, then reuse with `deriveSignals`). */
export function createSignals(): FxSignals {
  return {
    speed: 0,
    trauma: 0,
    rumble: 0,
    boost: 0,
    impact: 0,
    flash: 0,
    warp: 0,
    land: 0,
    time: 0,
    shake: 0,
    dip: 0,
    fovKick: 0,
    aberration: 0,
    blur: 0,
    flashAmount: 0,
    streaks: 0,
    tunnel: 0,
  };
}

/**
 * Mixes channels into effect drivers. With `reducedMotion` there is no shake, no FOV kick, no flashing and no
 * tunnel; speed cues (streaks, blur, aberration) stay but are much calmer.
 */
export function deriveSignals(ch: Readonly<FxChannels>, reducedMotion: boolean, out: FxSignals): FxSignals {
  out.speed = ch.speed;
  out.trauma = ch.trauma;
  out.rumble = ch.rumble;
  out.boost = ch.boost;
  out.impact = ch.impact;
  out.flash = ch.flash;
  out.warp = ch.warp;
  out.land = ch.land;

  const s2 = ch.speed * ch.speed;
  if (reducedMotion) {
    out.shake = 0;
    out.dip = 0;
    out.fovKick = 0;
    out.flashAmount = 0;
    out.tunnel = 0;
    out.aberration = clamp01(0.15 * ch.speed);
    out.blur = clamp01(0.2 * s2);
    out.streaks = clamp01(0.45 * ch.speed + 0.2 * ch.warp);
    return out;
  }
  out.shake = clamp01(ch.trauma * ch.trauma + 0.28 * ch.rumble * ch.rumble + 0.05 * s2 + 0.12 * ch.warp);
  out.dip = clamp01(ch.land);
  out.fovKick = 7 * ch.speed + 11 * ch.boost + 24 * ch.warp - 3 * ch.impact - 2 * ch.land;
  out.aberration = clamp01(0.22 * ch.speed + 0.55 * ch.boost + 0.9 * ch.impact + 0.85 * ch.warp);
  out.blur = clamp01(0.4 * s2 + 0.45 * ch.boost + 0.95 * ch.warp);
  out.flashAmount = clamp01(ch.flash + 0.3 * ch.impact);
  out.streaks = clamp01(0.85 * ch.speed + 0.35 * ch.boost + ch.warp);
  out.tunnel = clamp01(ch.warp);
  return out;
}
