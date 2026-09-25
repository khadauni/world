import { tier } from '@/core/tier';
import type { AgeBand, TourBeat, WorldStop } from '@/core/types';

/**
 * The beats a child sees for a stop: the stop's own tour filtered to their band, or — for worlds that
 * have no tour yet — one built from the narration lines and facts.
 */
export function tourFor(stop: WorldStop, band: AgeBand): TourBeat[] {
  if (stop.tour?.length) return stop.tour.filter((b) => !b.bands || b.bands.includes(band));
  const lines = tier(stop.narration, band).map<TourBeat>((say, i) => ({ id: `narration-${i}`, shot: `narration-${i}`, say }));
  const facts = tier(stop.facts, band).map<TourBeat>((say, i) => ({
    id: `fact-${i}`,
    shot: `fact-${i}`,
    say,
    title: 'Did you know?',
  }));
  return [...lines, ...facts];
}

export function introTourFor(beats: readonly TourBeat[] | undefined, band: AgeBand): TourBeat[] {
  return (beats ?? []).filter((b) => !b.bands || b.bands.includes(band));
}

const MS_PER_WORD: Readonly<Record<AgeBand, number>> = { tiny: 520, junior: 420, senior: 330 };

/** How long a beat stays up when it is read rather than heard (or as a floor while it is heard). */
export function readingTime(text: string, band: AgeBand, hold = 0): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const ms = 1400 + words * MS_PER_WORD[band];
  return Math.max(hold, Math.min(14_000, Math.max(2600, ms)));
}

/** Pull a leading number out of a stat value ("1,300" → 1300, "~22 km" → 22) so it can count up. */
export function parseStat(value: string): { prefix: string; number: number; decimals: number; suffix: string } | null {
  const m = /^([^\d-]*)(-?\d[\d,]*(?:\.\d+)?)(.*)$/.exec(value.trim());
  if (!m) return null;
  const raw = (m[2] ?? '').replace(/,/g, '');
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const decimals = raw.includes('.') ? (raw.split('.')[1]?.length ?? 0) : 0;
  return { prefix: m[1] ?? '', number: n, decimals, suffix: m[3] ?? '' };
}

export function formatStat(p: { prefix: string; decimals: number; suffix: string }, n: number, useGrouping: boolean): string {
  return `${p.prefix}${n.toLocaleString('en-US', { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals, useGrouping })}${p.suffix}`;
}
