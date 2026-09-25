/**
 * Pulse envelopes — the "shape over time" of every one-shot cinematic hit (boost, impact, flash, warp, land).
 * Pure math, no three.js: easy to unit-test and cheap to evaluate every frame.
 */

/** One-shot cinematic events a world can fire with `fx.pulse(kind, strength)`. */
export type FxPulseKind = 'boost' | 'impact' | 'flash' | 'warp' | 'land';

export const FX_PULSE_KINDS: readonly FxPulseKind[] = ['boost', 'impact', 'flash', 'warp', 'land'];

/** Attack → hold → release envelope, all in seconds. */
export interface PulseEnvelope {
  /** Seconds to reach the peak (ease-out). 0 = instant hit. */
  readonly attack: number;
  /** Seconds held at the peak. */
  readonly hold: number;
  /** Seconds to fade back to 0. */
  readonly release: number;
  /** Release curve exponent: 1 = linear, >1 = fast drop with a long soft tail. */
  readonly curve: number;
}

/** Tuned envelopes. Impacts are instant and short; boosts swell; warps build, hold and linger. */
export const PULSE_ENVELOPES: Readonly<Record<FxPulseKind, PulseEnvelope>> = {
  boost: { attack: 0.09, hold: 0.18, release: 1.15, curve: 2 },
  impact: { attack: 0, hold: 0.03, release: 0.55, curve: 2.5 },
  flash: { attack: 0.03, hold: 0.05, release: 0.5, curve: 2.2 },
  warp: { attack: 0.5, hold: 0.9, release: 1.7, curve: 1.6 },
  land: { attack: 0, hold: 0.04, release: 0.85, curve: 2.2 },
};

/** Total length of an envelope in seconds. */
export function envelopeDuration(env: PulseEnvelope): number {
  return env.attack + env.hold + env.release;
}

/**
 * Envelope value (0..1) at `t` seconds after the trigger. Negative / NaN times return 0.
 * Attack uses an ease-out quad so hits feel punchy; release uses `(1 - x)^curve`.
 */
export function envelopeAt(env: PulseEnvelope, t: number): number {
  if (!(t >= 0)) return 0;
  if (t < env.attack) {
    const x = t / env.attack;
    return 1 - (1 - x) * (1 - x);
  }
  let r = t - env.attack;
  if (r < env.hold) return 1;
  r -= env.hold;
  if (env.release <= 0 || r >= env.release) return 0;
  return Math.pow(1 - r / env.release, env.curve);
}

/**
 * Where to restart an envelope when it is re-triggered while still active, so the value never dips.
 * Returns the age (seconds) inside the attack at which `envelopeAt(env, age) * newStrength ≈ current`.
 * `current` is the channel's present value (strength × envelope), `newStrength` the new peak.
 */
export function retriggerAge(env: PulseEnvelope, current: number, newStrength: number): number {
  if (env.attack <= 0 || newStrength <= 0 || current <= 0) return 0;
  const v = Math.min(1, current / newStrength);
  // Invert the ease-out attack: v = 1 - (1 - x)^2  →  x = 1 - sqrt(1 - v)
  const x = 1 - Math.sqrt(1 - v);
  return x * env.attack;
}
