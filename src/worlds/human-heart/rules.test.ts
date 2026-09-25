import { describe, expect, it } from 'vitest';
import { AGE_BANDS } from '@/core/types';
import { TUNING, assistedBpm, assistedWindow } from './logic/bands';
import { BAND_ITEMS, EVERYDAY, healthyStart, heartPower, isEveryday, ringOrder, tapItem } from './logic/healthy';
import { PARTS, VALVES } from './logic/ids';
import { labProgress, labStart, placePart, pullPart, suggestedPull } from './logic/lab';
import { MEET_START, tapHeart, tapSpot } from './logic/meet';
import { RHYTHM_START, judgeTap, reduceTap } from './logic/rhythm';
import { ROOMS_START, ROOM_ROUNDS, reduceRoomTap, roomRounds } from './logic/rooms';
import { VALVE_FLAPS, VALVE_KIND, tapValve, valvesStart } from './logic/valves';
import { CYCLE } from './logic/beat';

describe('difficulty by age band', () => {
  it('asks more of older children, and is gentlest for the youngest', () => {
    const [tiny, junior, senior] = AGE_BANDS.map((b) => TUNING[b]);
    if (!tiny || !junior || !senior) throw new Error('bands');
    expect(tiny.beat.goal).toBeLessThan(junior.beat.goal);
    expect(junior.beat.goal).toBeLessThan(senior.beat.goal);
    expect(tiny.beat.window).toBeGreaterThan(junior.beat.window);
    expect(junior.beat.window).toBeGreaterThan(senior.beat.window);
    expect(tiny.beat.bpm).toBeLessThan(senior.beat.bpm);
    expect(tiny.lab.goal).toBeLessThan(junior.lab.goal);
    expect(junior.lab.goal).toBeLessThan(senior.lab.goal);
    expect(tiny.valves.leaky.length).toBeLessThan(junior.valves.leaky.length);
    expect(junior.valves.leaky.length).toBeLessThan(senior.valves.leaky.length);
    expect(tiny.ride.bubbles).toBeLessThanOrEqual(junior.ride.bubbles);
    expect(junior.ride.bubbles).toBeLessThan(senior.ride.bubbles);
    expect(tiny.healthy.goal).toBeLessThan(junior.healthy.goal);
    expect(junior.healthy.goal).toBeLessThan(senior.healthy.goal);
    expect(tiny.rooms.rounds).toBeLessThan(senior.rooms.rounds);
  });

  it('matches the stop brief: 3/5/7 good beats, 1/2/3 leaky valves, 3/5/6 healthy choices, tiny pulls 2', () => {
    expect([TUNING.tiny.beat.goal, TUNING.junior.beat.goal, TUNING.senior.beat.goal]).toEqual([3, 5, 7]);
    expect([TUNING.tiny.valves.leaky.length, TUNING.junior.valves.leaky.length, TUNING.senior.valves.leaky.length]).toEqual([1, 2, 3]);
    expect([TUNING.tiny.healthy.goal, TUNING.junior.healthy.goal, TUNING.senior.healthy.goal]).toEqual([3, 5, 6]);
    expect(TUNING.tiny.lab.goal).toBe(2);
    expect(TUNING.junior.lab.goal).toBe(4);
    expect(TUNING.senior.lab.goal).toBeGreaterThanOrEqual(10);
    expect(TUNING.tiny.meet.mode).toBe('tap-heart');
    expect(TUNING.junior.meet.spots).toHaveLength(3);
    expect(TUNING.senior.meet.spots).toHaveLength(3);
    for (const b of AGE_BANDS) expect(TUNING[b].meet.spots).toContain('heart');
  });

  it('only ever makes things easier when helping', () => {
    for (const b of AGE_BANDS) {
      expect(assistedWindow(b)).toBeGreaterThan(TUNING[b].beat.window);
      expect(assistedBpm(b)).toBeLessThan(TUNING[b].beat.bpm);
      expect(TUNING[b].assistAfter).toBe(2);
    }
  });

  it('never asks for more healthy choices than are on stage', () => {
    for (const b of AGE_BANDS) {
      const items = BAND_ITEMS[b];
      expect(items).toHaveLength(TUNING[b].healthy.items);
      expect(items.filter(isEveryday).length).toBeGreaterThanOrEqual(TUNING[b].healthy.goal);
      expect(items.some((i) => !isEveryday(i)), 'some "sometimes" treats to tell apart').toBe(true);
    }
  });

  it('leaky valves are real valves, and senior counts fit the parts on the model', () => {
    for (const b of AGE_BANDS) for (const v of TUNING[b].valves.leaky) expect(VALVES).toContain(v);
    expect(TUNING.senior.lab.goal).toBeLessThanOrEqual(PARTS.length);
  });
});

describe('heartbeat rhythm game', () => {
  const tap = (phase: number, beats: number, window = 0.3) => ({ phase, beats, bpm: 60, window, assistWindow: 0.5, assistAfter: 2 });

  it('scores a tap on the squeeze, once per beat', () => {
    let s = RHYTHM_START;
    let r = reduceTap(s, tap(CYCLE.ventPeak, 0));
    expect(r.judgement).toBe('good');
    s = r.state;
    r = reduceTap(s, tap(CYCLE.ventPeak + 0.05, 0));
    expect(r.judgement).toBe('again');
    expect(r.state.good).toBe(1);
    r = reduceTap(r.state, tap(CYCLE.ventPeak, 1));
    expect(r.judgement).toBe('good');
    expect(r.state.good).toBe(2);
  });

  it('calls taps early or late, kindly, and helps after two misses', () => {
    expect(judgeTap(CYCLE.ventPeak - 0.4, 60, 0.2).judgement).toBe('early');
    expect(judgeTap(CYCLE.ventPeak + 0.4, 60, 0.2).judgement).toBe('late');
    let s = RHYTHM_START;
    s = reduceTap(s, tap(0.55, 0, 0.1)).state;
    expect(s.assist).toBe(false);
    s = reduceTap(s, tap(0.55, 0, 0.1)).state;
    expect(s.assist).toBe(true);
    // With help on, the wider window counts a tap that would have missed.
    const r = reduceTap(s, tap(CYCLE.ventPeak + 0.4, 0, 0.1));
    expect(r.judgement).toBe('good');
  });

  it("gives tiny explorers a window wide enough that most taps land", () => {
    const period = 60 / TUNING.tiny.beat.bpm;
    expect((TUNING.tiny.beat.window * 2) / period).toBeGreaterThan(0.6);
  });
});

describe('find the heart', () => {
  it('tiny: taps until found', () => {
    let s = MEET_START;
    for (let i = 0; i < 2; i++) s = tapHeart(s, 3).state;
    expect(s.found).toBe(false);
    const r = tapHeart(s, 3);
    expect(r.event).toBe('found');
    expect(tapHeart(r.state, 3).event).toBe('ignored');
  });

  it('spots: wrong spots fade, help after two misses, the heart spot wins', () => {
    let r = tapSpot(MEET_START, 'head', 2);
    expect(r.event).toBe('miss');
    expect(tapSpot(r.state, 'head', 2).event).toBe('ignored');
    r = tapSpot(r.state, 'tummy', 2);
    expect(r.state.assist).toBe(true);
    r = tapSpot(r.state, 'heart', 2);
    expect(r.event).toBe('found');
  });
});

describe('four rooms', () => {
  it('has enough rounds for every band, targets every chamber, and uses the mirror trick for seniors', () => {
    for (const b of AGE_BANDS) expect(ROOM_ROUNDS[b].length).toBeGreaterThanOrEqual(TUNING[b].rooms.rounds);
    const targets = new Set(ROOM_ROUNDS.senior.map((r) => r.target));
    expect(targets).toEqual(new Set(['ra', 'rv', 'la', 'lv']));
    expect(ROOM_ROUNDS.senior.some((r) => /mirror/i.test(r.prompt))).toBe(true);
    expect(ROOM_ROUNDS.senior.find((r) => /strongest|thickest/i.test(r.prompt))?.target).toBe('lv');
    expect(ROOM_ROUNDS.tiny.every((r) => /BLUE|RED/.test(r.prompt) && /TOP|BOTTOM/.test(r.prompt))).toBe(true);
  });

  it('advances on the right chamber and helps after misses', () => {
    const rounds = roomRounds('junior', 2);
    let r = reduceRoomTap(ROOMS_START, 'lv', rounds, 2);
    expect(r.correct).toBe(false);
    r = reduceRoomTap(r.state, 'la', rounds, 2);
    expect(r.state.assist).toBe(true);
    r = reduceRoomTap(r.state, rounds[0]?.target ?? 'ra', rounds, 2);
    expect(r.correct).toBe(true);
    expect(r.state.assist).toBe(false);
    r = reduceRoomTap(r.state, rounds[1]?.target ?? 'lv', rounds, 2);
    expect(r.state.done).toBe(true);
  });
});

describe('heart lab', () => {
  it('pulls the goal number of parts, then rebuilds them all', () => {
    let s = labStart(2, 'any');
    s = pullPart(s, 'aorta').state;
    expect(pullPart(s, 'aorta').event).toBe('ignored');
    const r = pullPart(s, 'lv');
    expect(r.event).toBe('rebuild-time');
    s = r.state;
    expect(s.stage).toBe('rebuild');
    expect(pullPart(s, 'ra').event).toBe('ignored');
    expect(labProgress(s)).toEqual({ done: 2, total: 4 });
    s = placePart(s, 'lv', 2).state;
    const done = placePart(s, 'aorta', 2);
    expect(done.event).toBe('done');
    expect(labProgress(done.state)).toEqual({ done: 4, total: 4 });
  });

  it('senior rebuild follows the clues; wrong parts wiggle and help arrives after two', () => {
    let s = labStart(3, 'clues');
    for (const id of ['pa', 'svc', 'mitral'] as const) s = pullPart(s, id).state;
    expect(s.clue).toBe('pa');
    let r = placePart(s, 'svc', 2);
    expect(r.event).toBe('wrong');
    r = placePart(r.state, 'mitral', 2);
    expect(r.state.assist).toBe(true);
    r = placePart(r.state, 'pa', 2);
    expect(r.event).toBe('placed');
    expect(r.state.clue).toBe('svc');
    expect(r.state.assist).toBe(false);
  });

  it('suggests a part to pull (for gentle guidance)', () => {
    const s = pullPart(labStart(4, 'any'), 'aorta').state;
    expect(suggestedPull(s)).toBe('pa');
    expect(suggestedPull(s, ['aorta', 'lv'])).toBe('lv');
  });
});

describe('leaky valves', () => {
  it('fixes leaky valves, gently ignores healthy ones, and finishes when all are sealed', () => {
    let s = valvesStart(['mitral', 'aortic']);
    let r = tapValve(s, 'tricuspid', 2);
    expect(r.event).toBe('healthy');
    r = tapValve(r.state, 'mitral', 2);
    expect(r.event).toBe('fixed');
    expect(tapValve(r.state, 'mitral', 2).event).toBe('ignored');
    s = r.state;
    r = tapValve(s, 'aortic', 2);
    expect(r.event).toBe('done');
  });

  it('knows its anatomy: two AV valves, two semilunar; only the mitral has two flaps', () => {
    expect(VALVES.filter((v) => VALVE_KIND[v] === 'av').sort()).toEqual(['mitral', 'tricuspid']);
    expect(VALVES.filter((v) => VALVE_FLAPS[v] === 2)).toEqual(['mitral']);
  });
});

describe('healthy choices', () => {
  it('counts only everyday choices and treats sometimes-foods kindly', () => {
    let s = healthyStart(2);
    let r = tapItem(s, 'donut', 2);
    expect(r.event).toBe('treat');
    expect(heartPower(r.state)).toBe(0);
    r = tapItem(r.state, 'apple', 2);
    expect(r.event).toBe('picked');
    expect(heartPower(r.state)).toBe(0.5);
    expect(tapItem(r.state, 'apple', 2).event).toBe('ignored');
    s = r.state;
    r = tapItem(s, 'water', 2);
    expect(r.event).toBe('done');
    expect(heartPower(r.state)).toBe(1);
  });

  it('spreads treats around the ring instead of bunching them', () => {
    for (const b of AGE_BANDS) {
      const ring = ringOrder(BAND_ITEMS[b]);
      expect(new Set(ring)).toEqual(new Set(BAND_ITEMS[b]));
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const c = ring[(i + 1) % ring.length];
        if (a && c) expect(EVERYDAY.has(a) || EVERYDAY.has(c), `${b}: ${a} next to ${c}`).toBe(true);
      }
    }
  });
});
