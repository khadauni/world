/**
 * Vikram's hop (3 Sep 2023): it rose about 40 cm and landed 30–40 cm away.
 * Seniors stop a moving height gauge inside a window around 40 cm.
 */

/** Triangle wave 0 → max → 0 over one period. */
export function gaugeValue(t: number, period: number, max: number): number {
  if (period <= 0) return 0;
  const phase = (((t / period) % 1) + 1) % 1;
  return (phase < 0.5 ? phase * 2 : (1 - phase) * 2) * max;
}

export type HopResult = 'good' | 'low' | 'high';

export function judgeHop(cm: number, window: readonly [number, number]): HopResult {
  if (cm < window[0]) return 'low';
  if (cm > window[1]) return 'high';
  return 'good';
}

/** After two misses the window widens and the gauge slows down. */
export function assistedWindow(window: readonly [number, number], assist: boolean): readonly [number, number] {
  if (!assist) return window;
  const mid = (window[0] + window[1]) / 2;
  const half = Math.max(10, (window[1] - window[0]) / 2 + 8);
  return [mid - half, mid + half];
}

/** Hop arc: height (0..1 of peak) and sideways progress (0..1) for t in 0..1 with a squashy launch. */
export function hopArc(t: number): { up: number; side: number } {
  const x = Math.min(1, Math.max(0, t));
  return { up: 4 * x * (1 - x), side: x * x * (3 - 2 * x) };
}
