import { mulberry32 } from './random';

export interface GateChallenge {
  readonly a: number;
  readonly b: number;
  readonly answer: number;
  readonly choices: readonly number[];
}

/**
 * A grown-ups-only gate (as recommended for kids' apps): a multiplication a pre-reader can't guess,
 * answered by tapping one of four numbers. Not a security boundary against adults — it keeps little
 * hands out of settings, resets and anything outward-facing.
 */
export function makeChallenge(seed: number): GateChallenge {
  const rand = mulberry32(seed);
  const a = 6 + Math.floor(rand() * 7); // 6–12
  const b = 3 + Math.floor(rand() * 7); // 3–9
  const answer = a * b;
  const set = new Set<number>([answer]);
  const offsets = [-b, b, -a, a, 1, -1, 10, -10];
  let i = 0;
  while (set.size < 4 && i < 64) {
    const off = offsets[Math.floor(rand() * offsets.length)] ?? 1;
    const candidate = answer + off;
    if (candidate > 0) set.add(candidate);
    i++;
  }
  const choices = Array.from(set).sort((x, y) => x - y);
  return { a, b, answer, choices };
}

export function numberWords(n: number): string {
  const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  return ones[n] ?? String(n);
}
