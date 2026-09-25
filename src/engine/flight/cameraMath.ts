/** Critically damped spring state for one scalar. */
export interface Spring {
  value: number;
  velocity: number;
}

export function createSpring(value = 0): Spring {
  return { value, velocity: 0 };
}

/**
 * Move a spring toward `target` without overshoot (Game Programming Gems 4 "SmoothDamp"). Frame-rate
 * independent; `smoothTime` ≈ seconds to get most of the way there. Mutates and returns the spring value.
 */
export function smoothDamp(s: Spring, target: number, smoothTime: number, dt: number): number {
  if (dt <= 0) return s.value;
  const st = Math.max(1e-4, smoothTime);
  const omega = 2 / st;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = s.value - target;
  const temp = (s.velocity + omega * change) * dt;
  s.velocity = (s.velocity - omega * temp) * exp;
  s.value = target + (change + temp) * exp;
  return s.value;
}

/** Snap a spring to a value (no motion). */
export function snapSpring(s: Spring, value: number): void {
  s.value = value;
  s.velocity = 0;
}

export interface FovOptions {
  readonly base: number;
  /** Extra degrees at full speed. */
  readonly speedKick: number;
  /** Extra degrees while boosting. */
  readonly boostKick: number;
  readonly reducedMotion: boolean;
}

/** Speed-based field of view: wider as you go faster, wider still on boost. Constant with reduced motion. */
export function chaseFov(speed01: number, boost01: number, o: FovOptions): number {
  if (o.reducedMotion) return o.base;
  const s = Math.max(0, Math.min(1, speed01));
  const b = Math.max(0, Math.min(1, boost01));
  return o.base + s * s * o.speedKick + b * o.boostKick;
}

/** Cheap smooth 1D noise in −1…1 (sum of sines) for camera shake. */
export function shakeNoise(t: number, seed: number): number {
  return (Math.sin(t * 31.7 + seed * 12.9) * 0.5 + Math.sin(t * 47.3 + seed * 3.1) * 0.3 + Math.sin(t * 73.1 + seed * 7.7) * 0.2);
}
