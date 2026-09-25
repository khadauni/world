import { wrap01 } from './beat';

/**
 * A stylised ECG trace (lead II look) over one cardiac cycle, in the same phase units as beat.ts
 * (phase 0 = start of the ventricular squeeze). Electricity comes just before the squeeze:
 * P wave (atria) → QRS spike (ventricles) → T wave (ventricles resetting).
 */
const WAVES: readonly { at: number; amp: number; width: number }[] = [
  { at: 0.8, amp: 0.16, width: 0.028 }, // P
  { at: 0.965, amp: -0.12, width: 0.007 }, // Q
  { at: 0.98, amp: 1, width: 0.009 }, // R
  { at: 0.996, amp: -0.28, width: 0.008 }, // S
  { at: 0.25, amp: 0.3, width: 0.045 }, // T
];

function gauss(d: number, w: number): number {
  return Math.exp(-(d * d) / (2 * w * w));
}

/** Signed shortest distance between two phases. */
export function phaseDelta(a: number, b: number): number {
  return wrap01(a - b + 0.5) - 0.5;
}

export function ecgValue(phase: number): number {
  const p = wrap01(phase);
  let v = 0;
  for (const w of WAVES) v += w.amp * gauss(phaseDelta(p, w.at), w.width);
  return v;
}

/** Phase of the R peak (the tall spike). */
export const R_PEAK = 0.98;
