import type { Tiered } from '@/core/types';

/**
 * Elements Pragyan's LIBS instrument detected near the lunar south pole (Aug 2023).
 * Sulphur is always first — it was the headline discovery.
 */
export interface MoonElement {
  readonly symbol: string;
  readonly name: string;
  readonly color: string;
  readonly cheer: Tiered<string>;
}

export const MOON_ELEMENTS: readonly MoonElement[] = [
  {
    symbol: 'S',
    name: 'Sulphur',
    color: '#FFD43B',
    cheer: {
      tiny: 'Sulphur! A big surprise! 💛',
      junior: 'Sulphur found! That was Pragyan’s big discovery!',
      senior: 'S — sulphur! LIBS confirmed it near the south pole, a first for measurements made on the surface there.',
    },
  },
  {
    symbol: 'Al',
    name: 'Aluminium',
    color: '#CAD5E2',
    cheer: { tiny: 'Shiny aluminium! ✨', junior: 'Aluminium — a light, shiny metal!', senior: 'Al — aluminium, common in the pale highland rocks.' },
  },
  {
    symbol: 'Fe',
    name: 'Iron',
    color: '#E07A45',
    cheer: { tiny: 'Iron! Magnets love iron! 🧲', junior: 'Iron — the metal in nails and bridges!', senior: 'Fe — iron, which glows in the spark with its own set of colours.' },
  },
  {
    symbol: 'Ca',
    name: 'Calcium',
    color: '#F4EEDC',
    cheer: { tiny: 'Calcium! Like in milk! 🥛', junior: 'Calcium — the same element in your bones!', senior: 'Ca — calcium, found in the Moon’s feldspar minerals.' },
  },
  {
    symbol: 'Ti',
    name: 'Titanium',
    color: '#9FB0C8',
    cheer: { tiny: 'Titanium! Super strong! 💪', junior: 'Titanium — a super-strong metal!', senior: 'Ti — titanium, a strong, light metal used in aircraft.' },
  },
];

export function samplesFor(count: number): MoonElement[] {
  return MOON_ELEMENTS.slice(0, Math.max(1, Math.min(MOON_ELEMENTS.length, count)));
}
