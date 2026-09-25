/**
 * The cardiac cycle as a tiny, pure model shared by every stop.
 *
 * Phase runs 0 → 1 once per beat. Phase 0 is the start of ventricular systole — the moment the
 * tricuspid and mitral valves snap shut ("lub"). The ventricles squeeze until `ventEnd`, when the aortic
 * and pulmonary valves close ("dub"). Late in the cycle the atria give their small top-up squeeze, so the
 * order on screen is always: atria squeeze → ventricles squeeze → relax.
 */
export const CYCLE = {
  ventPeak: 0.11,
  ventEnd: 0.36,
  /** Cartoon overshoot after relaxing: the ventricles bulge a little as they refill. */
  refillEnd: 0.52,
  atriaStart: 0.76,
  atriaPeak: 0.86,
  atriaEnd: 0.97,
} as const;

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function smooth01(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

/** Wrap any number into [0, 1). */
export function wrap01(x: number): number {
  return x - Math.floor(x);
}

export function periodFor(bpm: number): number {
  return 60 / Math.max(1, bpm);
}

/**
 * Ventricle squeeze 0…1 (slightly negative during the springy refill bulge).
 * Fast attack, held push, softer release — reads as a strong, bouncy pump.
 */
export function ventSqueeze(phase: number): number {
  const p = wrap01(phase);
  const { ventPeak, ventEnd, refillEnd } = CYCLE;
  if (p < ventPeak) return smooth01(p / ventPeak);
  if (p < ventEnd) return 1 - smooth01((p - ventPeak) / (ventEnd - ventPeak));
  if (p < refillEnd) return -0.16 * Math.sin(((p - ventEnd) / (refillEnd - ventEnd)) * Math.PI);
  return 0;
}

/** Atrial squeeze 0…1 — a gentle top-up just before the ventricles fire. */
export function atriaSqueeze(phase: number): number {
  const p = wrap01(phase);
  const { atriaStart, atriaPeak, atriaEnd } = CYCLE;
  if (p < atriaStart || p >= atriaEnd) return 0;
  if (p < atriaPeak) return smooth01((p - atriaStart) / (atriaPeak - atriaStart));
  return 1 - smooth01((p - atriaPeak) / (atriaEnd - atriaPeak));
}

export type ValveKind = 'av' | 'sl';

/**
 * How open a valve is (0 shut … 1 wide open).
 * - AV valves (tricuspid, mitral) are shut while the ventricles squeeze, open while they fill.
 * - Semilunar valves (aortic, pulmonary) open only while blood is pushed out.
 */
export function valveOpen(kind: ValveKind, phase: number): number {
  const p = wrap01(phase);
  if (kind === 'av') {
    if (p < CYCLE.ventEnd + 0.04) return 0;
    if (p < CYCLE.ventEnd + 0.14) return smooth01((p - CYCLE.ventEnd - 0.04) / 0.1);
    if (p < 0.94) return 1;
    return 1 - smooth01((p - 0.94) / 0.06);
  }
  if (p < 0.03 || p >= CYCLE.ventEnd) return 0;
  if (p < 0.09) return smooth01((p - 0.03) / 0.06);
  if (p < CYCLE.ventEnd - 0.07) return 1;
  return 1 - smooth01((p - (CYCLE.ventEnd - 0.07)) / 0.07);
}

/**
 * Squash-and-stretch for a squeezing chamber: it gets shorter and a touch fatter (roughly keeping volume),
 * then overshoots the other way while refilling. Returns [horizontal, vertical] scale.
 */
export function squash(amount: number, strength: number): [number, number] {
  const v = amount * strength;
  return [1 + v * 0.45, 1 - v];
}

/**
 * Signed time (s) from the nearest peak ventricular squeeze: negative = the tap came early, positive = late.
 * Used by the rhythm game — the child taps when they SEE the big squeeze.
 */
export function offsetFromSqueeze(phase: number, bpm: number): number {
  const d = wrap01(phase - CYCLE.ventPeak + 0.5) - 0.5;
  return d * periodFor(bpm);
}

/**
 * A running heartbeat. `step()` mutates in place (no allocations) so it can live in useFrame.
 * `lub`/`dub` are true only on the frame the sound happens.
 */
export class BeatClock {
  time = 0;
  phase = 0.5;
  bpm = 70;
  beats = 0;
  vent = 0;
  atria = 0;
  lub = false;
  dub = false;
  /** Seconds since the last "lub" (large when the heart is resting). */
  sinceLub = 99;

  step(dt: number, bpm: number): void {
    const d = Math.max(0, Math.min(dt, 0.25));
    const prev = this.phase;
    this.bpm = bpm;
    this.time += d;
    this.sinceLub += d;
    const raw = prev + d / periodFor(bpm);
    this.lub = raw >= 1;
    this.dub = (prev < CYCLE.ventEnd && raw >= CYCLE.ventEnd) || (raw >= 1 && raw - 1 >= CYCLE.ventEnd);
    if (this.lub) {
      this.beats += 1;
      this.sinceLub = (raw - 1) * periodFor(bpm);
    }
    this.phase = wrap01(raw);
    this.vent = ventSqueeze(this.phase);
    this.atria = atriaSqueeze(this.phase);
  }

  /** Freeze in the relaxed pose (used while a part is missing in the lab, or for stills). */
  rest(dt: number): void {
    const k = Math.min(1, dt * 6);
    this.vent += (0 - this.vent) * k;
    this.atria += (0 - this.atria) * k;
    this.lub = false;
    this.dub = false;
  }

  reset(phase = 0.5): void {
    this.time = 0;
    this.phase = phase;
    this.beats = 0;
    this.vent = ventSqueeze(phase);
    this.atria = atriaSqueeze(phase);
    this.lub = false;
    this.dub = false;
    this.sinceLub = 99;
  }
}
