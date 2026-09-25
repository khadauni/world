import { describe, expect, it } from 'vitest';
import { DEFAULT_SHAKE } from '../store/fxStore';
import { createShakeOffsets, noise1, shakeOffsets } from './shake';

describe('noise1', () => {
  it('is bounded, deterministic and zero on lattice points', () => {
    for (let x = -20; x < 20; x += 0.137) {
      const v = noise1(x, 3);
      expect(Math.abs(v)).toBeLessThanOrEqual(1);
      expect(noise1(x, 3)).toBe(v);
    }
    expect(noise1(5, 1)).toBeCloseTo(0, 12);
  });

  it('is smooth (no jumps between nearby samples)', () => {
    let prev = noise1(0, 9);
    for (let x = 0.001; x < 10; x += 0.001) {
      const v = noise1(x, 9);
      expect(Math.abs(v - prev)).toBeLessThan(0.01);
      prev = v;
    }
  });

  it('different seeds give different tracks', () => {
    expect(noise1(2.5, 1)).not.toBeCloseTo(noise1(2.5, 2), 3);
  });
});

describe('shakeOffsets', () => {
  it('is exactly zero with no trauma (so the camera never drifts when calm)', () => {
    const o = shakeOffsets(12.3, 0, DEFAULT_SHAKE, createShakeOffsets());
    for (const v of Object.values(o)) expect(Math.abs(v)).toBe(0);
  });

  it('never exceeds the profile maxima and scales with amount', () => {
    const o = createShakeOffsets();
    let peak = 0;
    for (let t = 0; t < 5; t += 0.01) {
      shakeOffsets(t, 1, DEFAULT_SHAKE, o);
      expect(Math.abs(o.x)).toBeLessThanOrEqual(DEFAULT_SHAKE.maxOffset);
      expect(Math.abs(o.yaw)).toBeLessThanOrEqual(DEFAULT_SHAKE.maxAngle);
      expect(Math.abs(o.roll)).toBeLessThanOrEqual(DEFAULT_SHAKE.maxRoll);
      peak = Math.max(peak, Math.abs(o.yaw));
    }
    expect(peak).toBeGreaterThan(DEFAULT_SHAKE.maxAngle * 0.3);
    shakeOffsets(1.234, 0.5, DEFAULT_SHAKE, o);
    const half = o.pitch;
    shakeOffsets(1.234, 1, DEFAULT_SHAKE, o);
    expect(half).toBeCloseTo(o.pitch / 2, 10);
  });

  it('clamps amount into 0..1', () => {
    const a = shakeOffsets(0.77, 5, DEFAULT_SHAKE, createShakeOffsets());
    const b = shakeOffsets(0.77, 1, DEFAULT_SHAKE, createShakeOffsets());
    expect(a).toEqual(b);
  });
});
