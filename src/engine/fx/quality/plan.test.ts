import { describe, expect, it } from 'vitest';
import { QUALITY } from '@/core/quality';
import type { WorldCanvasConfig } from '@/core/types';
import { DEFAULT_BLOOM, GRAIN_AMOUNT, resolveFxPlan, wantsNativeAntialias } from './plan';

const base: WorldCanvasConfig = { camera: { position: [0, 0, 10] }, background: '#000', bloom: { intensity: 1.2, luminanceThreshold: 0.7 } };
const calm = { reducedMotion: false };

describe('resolveFxPlan — quality gating', () => {
  it('low: no composer at all, renderer tone mapping only', () => {
    const plan = resolveFxPlan(QUALITY.low, { ...base, fx: { toneMapping: 'agx' } }, calm);
    expect(plan.composer).toBe(false);
    expect(plan.bloom).toBeNull();
    expect(plan.godRays || plan.speedFx || plan.smaa).toBe(false);
    expect(plan.grain).toBe(0);
    expect(plan.toneMapping).toBe('agx');
    expect(wantsNativeAntialias(QUALITY.low, plan)).toBe(false);
  });

  it('medium: cheaper half-res bloom + vignette + tone mapping, no grain / god rays / speed pass', () => {
    const plan = resolveFxPlan(QUALITY.medium, base, calm);
    expect(plan.composer).toBe(true);
    expect(plan.bloom?.resolutionScale).toBe(0.5);
    expect(plan.bloom?.levels).toBeLessThan(8);
    expect(plan.bloom?.intensity).toBe(1.2);
    expect(plan.vignette).toBeCloseTo(0.55);
    expect(plan.grain).toBe(0);
    expect(plan.godRays).toBe(false);
    expect(plan.speedFx).toBe(false);
    expect(plan.toneMapping).toBe('aces');
  });

  it('high: full stack with MSAA, grain and god rays', () => {
    const plan = resolveFxPlan(QUALITY.high, base, calm);
    expect(plan.composer).toBe(true);
    expect(plan.multisampling).toBe(4);
    expect(plan.smaa).toBe(false);
    expect(plan.bloom?.resolutionScale).toBe(1);
    expect(plan.godRays).toBe(true);
    expect(plan.speedFx).toBe(true);
    expect(plan.aberration).toBe(true);
    expect(plan.grain).toBe(GRAIN_AMOUNT);
    // the composer does the AA, so the default framebuffer does not need MSAA
    expect(wantsNativeAntialias(QUALITY.high, plan)).toBe(false);
  });

  it('high without MSAA falls back to SMAA', () => {
    const plan = resolveFxPlan({ ...QUALITY.high, antialias: false }, base, calm);
    expect(plan.multisampling).toBe(0);
    expect(plan.smaa).toBe(true);
  });

  it('honours world opt-outs', () => {
    const plan = resolveFxPlan(QUALITY.high, { ...base, bloom: false, fx: { grain: false, aberration: false, vignette: 0 } }, calm);
    expect(plan.bloom).toBeNull();
    expect(plan.grain).toBe(0);
    expect(plan.aberration).toBe(false);
    expect(plan.vignette).toBe(0);
  });

  it('uses default bloom when the world does not configure it, and clamps the vignette', () => {
    const plan = resolveFxPlan(QUALITY.high, { camera: base.camera, background: '#000', fx: { vignette: 3 } }, calm);
    expect(plan.bloom?.intensity).toBe(DEFAULT_BLOOM.intensity);
    expect(plan.vignette).toBe(1);
  });

  it('reduced motion: no flashes and no animated grain on any tier', () => {
    for (const q of [QUALITY.low, QUALITY.medium, QUALITY.high]) {
      const plan = resolveFxPlan(q, base, { reducedMotion: true });
      expect(plan.flash).toBe(false);
      expect(plan.grain).toBe(0);
    }
  });
});
