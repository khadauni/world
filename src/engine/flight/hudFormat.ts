import type { AgeBand } from '@/core/types';
import type { FlightPopup, FlightPopupKind } from './session';

/** Override any callout per kind; receives the combo and whether the ring was dead-centre. */
export type FlightMessages = Partial<Record<FlightPopupKind, (combo: number, perfect: boolean, band: AgeBand) => string>>;

const TINY_CHEERS = ['Yay!', 'Wheee!', 'Super!', 'WOW!', 'Amazing!'];

/** Kid-friendly callout text. Kind and encouraging — a bump is a "Boing!", never a failure. */
export function popupText(p: Pick<FlightPopup, 'kind' | 'combo' | 'perfect'>, band: AgeBand, messages?: FlightMessages): string {
  const custom = messages?.[p.kind];
  if (custom) return custom(p.combo, p.perfect, band);
  switch (p.kind) {
    case 'ring':
      if (band === 'tiny') return TINY_CHEERS[Math.min(TINY_CHEERS.length - 1, Math.max(0, p.combo - 1))] ?? 'Yay!';
      if (band === 'junior') return p.combo > 1 ? `Ring ×${p.combo}!` : p.perfect ? 'Perfect!' : 'Ring!';
      return p.perfect ? `Perfect ×${p.combo}` : `Ring ×${p.combo}`;
    case 'nearMiss':
      return band === 'tiny' ? 'Whoosh!' : band === 'junior' ? 'Close one!' : 'Near miss!';
    case 'bump':
      return band === 'tiny' ? 'Boing!' : band === 'junior' ? 'Bonk! Keep going!' : 'Bump! Shake it off';
    case 'boost':
      return band === 'tiny' ? 'Zoom!' : 'BOOST!';
    case 'go':
      return band === 'tiny' ? 'Go go go!' : 'GO!';
    case 'arrive':
      return band === 'tiny' ? 'We made it!' : band === 'junior' ? 'You made it!' : 'Arrived!';
  }
}

const NF0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const NF1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/** Friendly big-number formatting: 12,345 · 5.4 million · 1.2 billion · 7.5. */
export function formatBig(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${NF1.format(n / 1e9)} billion`;
  if (a >= 1e6) return `${NF1.format(n / 1e6)} million`;
  if (a < 10) return NF1.format(n);
  return NF0.format(n);
}

export interface SpeedDisplay {
  /** Number to show (senior/junior), e.g. "24.3". */
  readonly value: string;
  readonly unit: string;
  /** Playful word for the current speed ("Cruising", "Super fast!", "WARP!"). */
  readonly word: string;
  /** 0–5 filled pips for the tiny meter. */
  readonly pips: number;
}

export interface SpeedScale {
  /** Displayed value at full boost (speed01 = 1). */
  readonly max: number;
  readonly unit: string;
  readonly decimals?: number;
}

export function speedWord(speed01: number, band: AgeBand): string {
  if (band === 'tiny') return speed01 > 0.8 ? 'ZOOM!' : speed01 > 0.45 ? 'Fast!' : 'Go!';
  if (speed01 > 0.86) return 'WARP!';
  if (speed01 > 0.64) return 'Super fast!';
  if (speed01 > 0.3) return 'Fast';
  return 'Cruising';
}

export function speedDisplay(speed01: number, band: AgeBand, scale: SpeedScale = { max: 60, unit: 'km/s' }): SpeedDisplay {
  const v = Math.max(0, speed01) * scale.max;
  const decimals = scale.decimals ?? (scale.max < 100 ? 1 : 0);
  return {
    value: new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v),
    unit: scale.unit,
    word: speedWord(speed01, band),
    pips: Math.max(0, Math.min(5, Math.round(speed01 * 5))),
  };
}

export interface DistanceLabelOptions {
  readonly progress: number;
  readonly band: AgeBand;
  /** Destination name, e.g. "Mars". */
  readonly destination?: string;
  /** Total journey distance in `unit`s (e.g. 54 with unit "million km", or 54_000_000 with unit "km"). */
  readonly totalDistance?: number;
  readonly unit?: string;
}

/** "Mars · 54 million km" → … → "Almost there!" (tiny: just the destination until the end). */
export function distanceLabel(o: DistanceLabelOptions): string {
  const remaining = Math.max(0, 1 - o.progress);
  if (o.progress >= 1) return o.destination ? `${o.destination}!` : 'Arrived!';
  if (remaining < (o.band === 'tiny' ? 0.2 : 0.04)) return 'Almost there!';
  const dest = o.destination ?? '';
  if (o.band === 'tiny' || o.totalDistance === undefined) return dest ? `Off to ${dest}!` : 'Keep flying!';
  const left = `${formatBig(o.totalDistance * remaining)}${o.unit ? ` ${o.unit}` : ''}`;
  return dest ? `${dest} · ${left}` : left;
}
