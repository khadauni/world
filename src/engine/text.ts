import { tier } from '@/core/tier';
import type { AgeBand, Tiered } from '@/core/types';

/** Resolve a tiered string for the band and personalise `{name}` with the explorer's nickname. */
export function fmt(value: Tiered<string>, band: AgeBand, name: string): string {
  return tier(value, band).replaceAll('{name}', name);
}

export function fmtList(value: Tiered<readonly string[]>, band: AgeBand, name: string): string[] {
  return tier(value, band).map((line) => line.replaceAll('{name}', name));
}
