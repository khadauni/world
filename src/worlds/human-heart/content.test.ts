import { describe, expect, it } from 'vitest';
import { tier } from '@/core/tier';
import { AGE_BANDS, type AgeBand, type Tiered } from '@/core/types';
import { content } from './content';
import { ITEM_INFO } from './content/healthy';
import { BEAT_LINES, CHAMBER_LINES, LAB_LINES, MEET_LINES, RIDE_LINES, ROOM_LINES, VALVE_LINES } from './content/lines';
import { PART_INFO } from './content/parts';
import { TUNING } from './logic/bands';
import { ITEM_IDS } from './logic/healthy';
import { PARTS, STOP_IDS } from './logic/ids';

/** World-specific content rules on top of the platform's shared content test. */
const words = (s: string) => s.replace(/[^\p{L}\p{N}'’\s-]/gu, ' ').split(/\s+/).filter(Boolean).length;

function allStrings(v: Tiered<string>): string[] {
  return AGE_BANDS.map((b) => tier(v, b));
}

describe('Inside the Human Heart — content', () => {
  it('has the seven stops, in order, with the agreed ids', () => {
    expect(content.stops.map((s) => s.id)).toEqual([...STOP_IDS]);
    expect(content.guide).toEqual({ name: 'Dr. Pulse', look: 'doc' });
    expect(tier(content.badge.name, 'junior')).toBe('Heart Hero');
  });

  it('writes genuinely different text for each band', () => {
    for (const stop of content.stops) {
      const n = (b: AgeBand) => tier(stop.narration, b).join(' ');
      expect(n('tiny')).not.toEqual(n('junior'));
      expect(n('junior')).not.toEqual(n('senior'));
      expect(tier(stop.task?.instruction ?? '', 'tiny')).not.toEqual(tier(stop.task?.instruction ?? '', 'senior'));
    }
  });

  it('keeps narration to 2–4 lines and facts to 2–3 per band', () => {
    for (const stop of content.stops)
      for (const b of AGE_BANDS) {
        const n = tier(stop.narration, b).length;
        const f = tier(stop.facts, b).length;
        expect(n, `${stop.id} narration [${b}]`).toBeGreaterThanOrEqual(2);
        expect(n, `${stop.id} narration [${b}]`).toBeLessThanOrEqual(4);
        expect(f, `${stop.id} facts [${b}]`).toBeGreaterThanOrEqual(2);
        expect(f, `${stop.id} facts [${b}]`).toBeLessThanOrEqual(3);
      }
  });

  it('keeps tiny lines short and read-aloud friendly', () => {
    for (const stop of content.stops) {
      for (const line of [...tier(stop.narration, 'tiny'), ...tier(stop.facts, 'tiny')]) expect(words(line), `${stop.id}: "${line}"`).toBeLessThanOrEqual(11);
    }
    for (const line of tier(content.intro, 'tiny')) expect(words(line)).toBeLessThanOrEqual(11);
  });

  it('has at least 2 tiny, 3 junior and 4 senior questions per stop, with picture choices for tiny', () => {
    for (const stop of content.stops) {
      const count = (b: AgeBand) => stop.quiz.filter((q) => q.bands.includes(b)).length;
      expect(count('tiny'), stop.id).toBeGreaterThanOrEqual(2);
      expect(count('junior'), stop.id).toBeGreaterThanOrEqual(3);
      expect(count('senior'), stop.id).toBeGreaterThanOrEqual(4);
      for (const q of stop.quiz) {
        expect(q.id.startsWith('hh-'), q.id).toBe(true);
        if (q.bands.includes('tiny')) {
          expect(q.choices.length).toBeLessThanOrEqual(3);
          for (const c of q.choices) expect(c.emoji ?? c.color).toBeTruthy();
        }
        if (q.bands.includes('senior') && !q.bands.includes('tiny')) expect(q.choices.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('personalises with {name} now and then', () => {
    const all = JSON.stringify(content);
    expect((all.match(/\{name\}/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it('states the key facts the brief asks for (carefully worded)', () => {
    const senior = content.stops.flatMap((s) => [...tier(s.narration, 'senior'), ...tier(s.facts, 'senior')]).join(' ');
    const junior = content.stops.flatMap((s) => [...tier(s.narration, 'junior'), ...tier(s.facts, 'junior')]).join(' ');
    expect(senior).toMatch(/70–110 beats per minute/);
    expect(senior).toMatch(/60–100/);
    expect(senior).toMatch(/SA node/);
    expect(senior).toMatch(/about 7,000 litres/);
    expect(senior).toMatch(/about 100,000 km/);
    expect(senior).toMatch(/never really blue/);
    expect(senior).toMatch(/left ventricle has the thickest wall/);
    expect(junior).toMatch(/about 100,000 times every day/);
    expect(junior).toMatch(/size of your fist|that big/);
    expect(JSON.stringify(content)).toMatch(/about a minute/);
    const beat = content.stops.find((s) => s.id === 'heartbeat');
    expect(tier(beat?.narration ?? [], 'senior').join(' ')).toMatch(/tricuspid and mitral valves closing.*aortic and pulmonary valves closing/);
  });

  it('keeps task instructions in step with the difficulty settings', () => {
    const find = (id: string) => content.stops.find((s) => s.id === id)?.task?.instruction ?? '';
    for (const b of AGE_BANDS) {
      expect(tier(find('heartbeat'), b)).toContain(String(TUNING[b].beat.goal));
      expect(tier(find('take-apart'), b)).toContain(String(TUNING[b].lab.goal));
      expect(tier(find('healthy-heart'), b)).toContain(String(TUNING[b].healthy.goal));
      expect(tier(find('blood-ride'), b)).toContain(String(TUNING[b].ride.bubbles));
    }
    expect(tier(find('valves'), 'junior')).toContain(String(TUNING.junior.valves.leaky.length));
    expect(tier(find('valves'), 'senior')).toContain(String(TUNING.senior.valves.leaky.length));
  });

  it('describes every Heart Lab part and every healthy choice for every band', () => {
    for (const id of PARTS) {
      const p = PART_INFO[id];
      for (const s of [...allStrings(p.name), ...allStrings(p.short), ...allStrings(p.without)]) expect(s.trim().length, id).toBeGreaterThan(0);
      expect(p.clue.length).toBeGreaterThan(10);
    }
    for (const id of ITEM_IDS) for (const s of [...allStrings(ITEM_INFO[id].label), ...allStrings(ITEM_INFO[id].line)]) expect(s.trim().length, id).toBeGreaterThan(0);
  });

  it('never shames food: treats are "sometimes", never "bad"', () => {
    const lines = ITEM_IDS.flatMap((id) => allStrings(ITEM_INFO[id].line)).join(' ');
    expect(lines).not.toMatch(/\bbad\b|\bjunk\b|\bnaughty\b|\bunhealthy\b/i);
    expect(lines).toMatch(/sometimes/i);
  });

  it('has cheer and help lines for every band', () => {
    const lines: Tiered<string>[] = [
      MEET_LINES.found,
      MEET_LINES.assist,
      BEAT_LINES.early,
      BEAT_LINES.late,
      BEAT_LINES.assist,
      BEAT_LINES.done,
      ROOM_LINES.assist,
      ROOM_LINES.done,
      LAB_LINES.rebuild,
      LAB_LINES.done,
      VALVE_LINES.healthy,
      VALVE_LINES.done,
      RIDE_LINES.lungs,
      RIDE_LINES.loaded,
      RIDE_LINES.muscle,
      RIDE_LINES.delivered,
      ...Object.values(CHAMBER_LINES),
    ];
    for (const l of lines) for (const s of allStrings(l)) expect(s.trim().length).toBeGreaterThan(0);
  });
});
