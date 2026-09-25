import { describe, expect, it } from 'vitest';
import { FX_PULSE_KINDS, PULSE_ENVELOPES, envelopeAt, envelopeDuration, retriggerAge } from './envelopes';
import { createFxStore, PULSE_TRAUMA, TRAUMA_DECAY } from './fxStore';
import { approach, createSignals, decayTrauma, deriveSignals, type FxChannels } from './signals';

const calm = (): FxChannels => ({ speed: 0, trauma: 0, rumble: 0, boost: 0, impact: 0, flash: 0, warp: 0, land: 0 });

describe('pulse envelopes', () => {
  it('start at 0 (or 1 for instant hits), peak at 1 and end at 0', () => {
    for (const kind of FX_PULSE_KINDS) {
      const env = PULSE_ENVELOPES[kind];
      expect(envelopeAt(env, 0)).toBe(env.attack === 0 ? 1 : 0);
      expect(envelopeAt(env, env.attack + env.hold * 0.5)).toBe(1);
      expect(envelopeAt(env, envelopeDuration(env))).toBeCloseTo(0, 9);
      expect(envelopeAt(env, envelopeDuration(env) + 5)).toBe(0);
    }
  });

  it('ignores negative and NaN times', () => {
    expect(envelopeAt(PULSE_ENVELOPES.boost, -1)).toBe(0);
    expect(envelopeAt(PULSE_ENVELOPES.boost, Number.NaN)).toBe(0);
  });

  it('rises monotonically during the attack and falls monotonically during the release', () => {
    for (const kind of FX_PULSE_KINDS) {
      const env = PULSE_ENVELOPES[kind];
      let prev = -1;
      for (let t = 0; t <= env.attack; t += env.attack / 20 || 1) {
        const v = envelopeAt(env, t);
        expect(v).toBeGreaterThanOrEqual(prev);
        prev = v;
      }
      prev = 2;
      const start = env.attack + env.hold;
      for (let t = start; t <= envelopeDuration(env); t += env.release / 25) {
        const v = envelopeAt(env, t);
        expect(v).toBeLessThanOrEqual(prev);
        expect(v).toBeGreaterThanOrEqual(0);
        prev = v;
      }
    }
  });

  it('re-triggering mid-release restarts the attack without a dip', () => {
    const env = PULSE_ENVELOPES.boost;
    const current = 0.5;
    const age = retriggerAge(env, current, 1);
    expect(age).toBeGreaterThan(0);
    expect(age).toBeLessThan(env.attack);
    expect(envelopeAt(env, age)).toBeCloseTo(current, 5);
    expect(retriggerAge(PULSE_ENVELOPES.impact, 0.5, 1)).toBe(0);
    expect(retriggerAge(env, 0, 1)).toBe(0);
  });
});

describe('trauma + signal helpers', () => {
  it('decays trauma linearly and never below zero', () => {
    expect(decayTrauma(1, 0.5, 1)).toBeCloseTo(0.5);
    expect(decayTrauma(0.2, 1, 1)).toBe(0);
    expect(decayTrauma(0.5, -1, 1)).toBe(0.5);
  });

  it('approach is frame-rate independent', () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = approach(a, 1, 3, 1 / 60);
    let b = 0;
    for (let i = 0; i < 30; i++) b = approach(b, 1, 3, 1 / 30);
    expect(a).toBeCloseTo(b, 6);
    expect(a).toBeCloseTo(1 - Math.exp(-3), 6);
  });

  it('shake grows with trauma squared', () => {
    const out = createSignals();
    deriveSignals({ ...calm(), trauma: 0.5 }, false, out);
    expect(out.shake).toBeCloseTo(0.25);
    deriveSignals({ ...calm(), trauma: 1 }, false, out);
    expect(out.shake).toBe(1);
  });

  it('reduced motion: no shake, no FOV kick, no flashing, no tunnel', () => {
    const out = createSignals();
    const loud: FxChannels = { speed: 1, trauma: 1, rumble: 1, boost: 1, impact: 1, flash: 1, warp: 1, land: 1 };
    deriveSignals(loud, true, out);
    expect(out.shake).toBe(0);
    expect(out.dip).toBe(0);
    expect(out.fovKick).toBe(0);
    expect(out.flashAmount).toBe(0);
    expect(out.tunnel).toBe(0);
    // speed cues stay, but calmer than with full motion
    const full = deriveSignals(loud, false, createSignals());
    expect(out.streaks).toBeGreaterThan(0);
    expect(out.streaks).toBeLessThan(full.streaks);
    expect(out.blur).toBeLessThan(full.blur);
    expect(out.aberration).toBeLessThan(full.aberration);
  });

  it('boost and warp widen the FOV, impacts punch in', () => {
    const out = createSignals();
    expect(deriveSignals({ ...calm(), boost: 1 }, false, out).fovKick).toBeGreaterThan(0);
    expect(deriveSignals({ ...calm(), warp: 1 }, false, out).fovKick).toBeGreaterThan(15);
    expect(deriveSignals({ ...calm(), impact: 1 }, false, out).fovKick).toBeLessThan(0);
  });
});

describe('fx store', () => {
  it('a pulse adds trauma, peaks and decays back to calm', () => {
    const store = createFxStore();
    const s = store.getState();
    s.pulse('impact', 1);
    expect(s.signals.trauma).toBeCloseTo(PULSE_TRAUMA.impact);
    expect(s.signals.impact).toBe(1);
    expect(s.signals.aberration).toBeGreaterThan(0.5);
    for (let i = 0; i < 180; i++) s.tick(1 / 60);
    expect(s.signals.impact).toBe(0);
    expect(s.signals.trauma).toBe(0);
    expect(s.signals.shake).toBe(0);
    expect(s.signals.time).toBeCloseTo(3, 5);
  });

  it('trauma decays at TRAUMA_DECAY per second', () => {
    const s = createFxStore().getState();
    s.addTrauma(0.8);
    s.tick(0.1);
    expect(s.signals.trauma).toBeCloseTo(0.8 - TRAUMA_DECAY * 0.1, 5);
    s.addTrauma(5);
    expect(s.signals.trauma).toBeLessThanOrEqual(1);
  });

  it('clamps huge frame deltas so envelopes are never skipped in one step', () => {
    const s = createFxStore().getState();
    s.pulse('warp', 1);
    s.tick(10);
    expect(s.signals.warp).toBeGreaterThan(0);
  });

  it('speed is smoothed unless set immediately', () => {
    const s = createFxStore().getState();
    s.setSpeed(1);
    s.tick(1 / 60);
    expect(s.signals.speed).toBeGreaterThan(0);
    expect(s.signals.speed).toBeLessThan(0.2);
    s.setSpeed(0.5, true);
    expect(s.signals.speed).toBe(0.5);
    s.setSpeed(Number.NaN, true);
    expect(s.signals.speed).toBe(0);
  });

  it('re-triggered pulses keep the stronger peak and never dip', () => {
    const s = createFxStore().getState();
    s.pulse('boost', 1);
    for (let i = 0; i < 30; i++) s.tick(1 / 60);
    const before = s.signals.boost;
    s.pulse('boost', 0.3);
    expect(s.signals.boost).toBeGreaterThanOrEqual(before - 1e-6);
    s.tick(1 / 60);
    expect(s.signals.boost).toBeGreaterThanOrEqual(before - 0.02);
  });

  it('signals object identity is stable (safe to cache in components)', () => {
    const store = createFxStore();
    const ref = store.getState().signals;
    store.getState().pulse('flash');
    store.getState().tick(0.016);
    store.getState().setReducedMotion(true);
    expect(store.getState().signals).toBe(ref);
  });

  it('registerSun notifies subscribers and unregisters only its own sun', () => {
    const store = createFxStore();
    const seen: unknown[] = [];
    store.subscribe((st) => seen.push(st.sun));
    const a = { name: 'a' } as never;
    const b = { name: 'b' } as never;
    const offA = store.getState().registerSun(a);
    store.getState().registerSun(b);
    offA();
    expect(store.getState().sun).toBe(b);
    expect(seen).toEqual([a, b]);
  });

  it('reset returns to calm and restores default configs', () => {
    const s = createFxStore();
    s.getState().setSpeed(1, true);
    s.getState().pulse('warp');
    s.getState().setFovKick({ enabled: true });
    s.getState().reset();
    const st = s.getState();
    expect(st.signals.speed).toBe(0);
    expect(st.signals.warp).toBe(0);
    expect(st.fovKick.enabled).toBe(false);
  });
});
