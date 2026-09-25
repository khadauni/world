import { describe, expect, it } from 'vitest';
import { tier } from '@/core/tier';
import { AGE_BANDS, type AgeBand, type Tiered } from '@/core/types';
import { content } from './content';
import { STOP_IDS } from './layout';

/** World-specific content checks on top of the platform's shared content gate. */
const words = (s: string) => s.replace(/[^\p{L}\p{N}' -]/gu, ' ').split(/\s+/).filter(Boolean).length;

function isTiered<T>(v: Tiered<T>): v is { tiny: T; junior: T; senior: T } {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && 'tiny' in v;
}

describe('Solar System Voyage content', () => {
  it('visits exactly the nine stops, in order, with Cosmo as the guide', () => {
    expect(content.stops.map((s) => s.id)).toEqual([...STOP_IDS]);
    expect(content.guide).toEqual({ name: 'Cosmo', look: 'astro' });
    expect(content.badge.emoji).toBe('🪐');
  });

  it('writes genuinely different narration and facts for each band', () => {
    for (const stop of content.stops) {
      for (const field of [stop.narration, stop.facts] as const) {
        expect(isTiered(field), `${stop.id} must be tiered`).toBe(true);
        const t = tier(field, 'tiny').join(' ');
        const j = tier(field, 'junior').join(' ');
        const s = tier(field, 'senior').join(' ');
        expect(new Set([t, j, s]).size, stop.id).toBe(3);
      }
    }
  });

  it('has 2–4 narration lines and 2–3 facts per band', () => {
    for (const stop of content.stops) {
      for (const band of AGE_BANDS) {
        const n = tier(stop.narration, band).length;
        const f = tier(stop.facts, band).length;
        expect(n, `${stop.id} ${band} narration`).toBeGreaterThanOrEqual(2);
        expect(n, `${stop.id} ${band} narration`).toBeLessThanOrEqual(4);
        expect(f, `${stop.id} ${band} facts`).toBeGreaterThanOrEqual(2);
        expect(f, `${stop.id} ${band} facts`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('keeps tiny lines short and sensory (3–10 words)', () => {
    for (const stop of content.stops) {
      for (const line of [...tier(stop.narration, 'tiny'), ...tier(stop.facts, 'tiny')]) {
        expect(words(line), `${stop.id}: "${line}"`).toBeGreaterThanOrEqual(3);
        expect(words(line), `${stop.id}: "${line}"`).toBeLessThanOrEqual(10);
      }
    }
  });

  it('asks exactly as many questions as each band’s quiz shows (2 tiny, 3 junior, 4 senior) — none wasted', () => {
    const want: Record<AgeBand, number> = { tiny: 2, junior: 3, senior: 4 };
    for (const stop of content.stops) {
      for (const band of AGE_BANDS) expect(stop.quiz.filter((q) => q.bands.includes(band)).length, `${stop.id} ${band}`).toBe(want[band]);
    }
  });

  it('gives tiny quizzes picture choices only (≤3)', () => {
    for (const stop of content.stops) {
      for (const q of stop.quiz.filter((x) => x.bands.includes('tiny'))) {
        expect(q.choices.length).toBeLessThanOrEqual(3);
        for (const c of q.choices) expect(c.emoji ?? c.color, `${q.id}.${c.id}`).toBeTruthy();
      }
    }
  });

  it('never gives an answer away with a lone picture (a question pictures all of its choices or none)', () => {
    for (const stop of content.stops) {
      for (const q of stop.quiz) {
        const pictured = q.choices.filter((c) => c.emoji || c.color).length;
        expect(pictured === 0 || pictured === q.choices.length, q.id).toBe(true);
      }
    }
  });

  it('includes real numbers for seniors', () => {
    for (const stop of content.stops) {
      const senior = [...tier(stop.narration, 'senior'), ...tier(stop.facts, 'senior')].join(' ');
      expect(/\d/.test(senior), stop.id).toBe(true);
    }
  });

  it('personalises with {name} now and then', () => {
    const all = JSON.stringify(content);
    expect((all.match(/\{name\}/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it('phrases changing moon counts carefully', () => {
    const all = JSON.stringify(content);
    expect(all).toMatch(/more than 90/);
    expect(all).not.toMatch(/\b(95|97|146|274) moons\b/);
  });

  it('gets the headline facts right', () => {
    const all = JSON.stringify(content);
    for (const fact of ['109', '8 minutes 20 seconds', '88 Earth days', '465 °C', '71%', 'iron oxide', '22 km', 'more than 1,300', 'water ice', '98°', '2,000 km/h', '165 Earth years', 'dwarf planet']) {
      expect(all, fact).toContain(fact);
    }
  });
});
