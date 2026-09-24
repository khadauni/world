import { describe, expect, it } from 'vitest';
import { AGE_BANDS, type AgeBand, type Tiered, type WorldModule } from '@/core/types';
import { tier } from '@/core/tier';
import { BANDS } from '@/core/tier';
import { WORLDS } from './registry';

/**
 * Quality gate every world must pass: complete age-tiered content, valid quizzes,
 * and ids that are safe to persist. Keeps many authors (and agents) consistent.
 */
const live = WORLDS.filter((w) => w.status === 'live' && w.load);

function nonEmpty(value: Tiered<string>, where: string) {
  for (const band of AGE_BANDS) {
    const v = tier(value, band);
    expect(typeof v === 'string' && v.trim().length > 0, `${where} [${band}] must be non-empty`).toBe(true);
  }
}

function nonEmptyList(value: Tiered<readonly string[]>, where: string, min = 1) {
  for (const band of AGE_BANDS) {
    const v = tier(value, band);
    expect(Array.isArray(v) && v.length >= min, `${where} [${band}] needs ≥${min} line(s)`).toBe(true);
    v.forEach((line, i) => expect(line.trim().length, `${where} [${band}] line ${i}`).toBeGreaterThan(0));
  }
}

describe.each(live.map((w) => [w.id, w] as const))('world %s', (id, meta) => {
  let mod: WorldModule;

  it('loads and matches the registry', async () => {
    mod = await (meta.load as () => Promise<WorldModule>)();
    expect(mod.content.id).toBe(id);
    expect(mod.content.stops.length, 'registry stopCount must match content').toBe(meta.stopCount);
    expect(typeof mod.Scene).toBe('function');
    expect(mod.canvas.background).toMatch(/^#[0-9a-f]{3,8}$/i);
  });

  it('has complete, age-tiered content', async () => {
    mod ??= await (meta.load as () => Promise<WorldModule>)();
    const c = mod.content;
    nonEmptyList(c.intro, `${id}.intro`);
    nonEmptyList(c.outro, `${id}.outro`);
    nonEmpty(c.badge.name, `${id}.badge.name`);
    nonEmpty(c.badge.description, `${id}.badge.description`);
    expect(c.guide.name.length).toBeGreaterThan(0);

    const stopIds = new Set<string>();
    for (const stop of c.stops) {
      expect(stop.id).toMatch(/^[a-z0-9-]{1,40}$/);
      expect(stopIds.has(stop.id), `duplicate stop id ${stop.id}`).toBe(false);
      stopIds.add(stop.id);
      expect(stop.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(stop.emoji.length).toBeGreaterThan(0);
      nonEmpty(stop.title, `${id}.${stop.id}.title`);
      nonEmptyList(stop.narration, `${id}.${stop.id}.narration`);
      nonEmptyList(stop.facts, `${id}.${stop.id}.facts`);
      if (stop.task) {
        expect(stop.task.kind).toMatch(/^[a-z0-9-]+$/);
        nonEmpty(stop.task.instruction, `${id}.${stop.id}.task.instruction`);
        if (stop.task.hint) nonEmpty(stop.task.hint, `${id}.${stop.id}.task.hint`);
      }
    }
  });

  it('has valid quizzes for every age band', async () => {
    mod ??= await (meta.load as () => Promise<WorldModule>)();
    const qIds = new Set<string>();
    for (const stop of mod.content.stops) {
      for (const band of AGE_BANDS as readonly AgeBand[]) {
        const count = stop.quiz.filter((q) => q.bands.includes(band)).length;
        expect(count, `${id}.${stop.id} needs ≥1 question for ${band}`).toBeGreaterThanOrEqual(1);
        expect(count, `${id}.${stop.id} should fill the ${band} quiz`).toBeGreaterThanOrEqual(Math.min(BANDS[band].quizLength, band === 'tiny' ? 1 : 2));
      }
      for (const q of stop.quiz) {
        expect(qIds.has(q.id), `duplicate question id ${q.id}`).toBe(false);
        qIds.add(q.id);
        expect(q.bands.length).toBeGreaterThan(0);
        const choiceIds = q.choices.map((ch) => ch.id);
        expect(new Set(choiceIds).size, `${q.id} choice ids unique`).toBe(choiceIds.length);
        expect(choiceIds, `${q.id} answer must be a choice`).toContain(q.answerId);
        expect(q.choices.length).toBeGreaterThanOrEqual(2);
        expect(q.choices.length).toBeLessThanOrEqual(4);
        if (q.bands.includes('tiny')) {
          expect(q.choices.length, `${q.id}: pre-readers get ≤3 picture choices`).toBeLessThanOrEqual(3);
          for (const ch of q.choices) expect(ch.emoji ?? ch.color, `${q.id}.${ch.id}: tiny choices need a picture (emoji or colour)`).toBeTruthy();
        }
        nonEmpty(q.prompt, `${q.id}.prompt`);
        nonEmpty(q.explain, `${q.id}.explain`);
        q.choices.forEach((ch) => nonEmpty(ch.label, `${q.id}.${ch.id}.label`));
      }
    }
  });
});
