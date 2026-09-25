import type { QualityProfile, WorldCanvasConfig } from '@/core/types';

/** Tone-mapping looks a world can pick in `canvas.fx.toneMapping`. */
export type FxToneMapping = 'aces' | 'agx' | 'neutral';

export interface FxBloomPlan {
  readonly intensity: number;
  readonly luminanceThreshold: number;
  readonly luminanceSmoothing: number;
  /** Mip-chain radius (0..1). */
  readonly radius: number;
  /** Number of mip levels (fewer = cheaper, tighter glow). */
  readonly levels: number;
  /** Resolution the bloom works at, relative to the canvas (1 = full, 0.5 = half). */
  readonly resolutionScale: number;
}

/** Everything the post-processing stack needs to know — decided once from quality tier + world config. */
export interface FxPlan {
  /** Mount an EffectComposer at all (false on 'low': renderer tone mapping only). */
  readonly composer: boolean;
  /** MSAA samples on the composer's render target. */
  readonly multisampling: number;
  /** SMAA edge anti-aliasing (only when MSAA is off). */
  readonly smaa: boolean;
  readonly bloom: FxBloomPlan | null;
  /** God rays are allowed (they still need a registered sun). */
  readonly godRays: boolean;
  /** Radial speed blur + chromatic aberration pass. */
  readonly speedFx: boolean;
  /** Chromatic aberration allowed inside the speed pass. */
  readonly aberration: boolean;
  /** Film grain amount (0 = off). */
  readonly grain: number;
  /** Vignette darkness 0..1 (0 = off). */
  readonly vignette: number;
  readonly toneMapping: FxToneMapping;
  /** Screen flashes allowed (never with reduced motion). */
  readonly flash: boolean;
}

export const DEFAULT_BLOOM = { intensity: 0.9, luminanceThreshold: 0.8 } as const;
export const DEFAULT_VIGNETTE = 0.55;
/** Film grain strength when enabled (subtle — it should be felt, not seen). */
export const GRAIN_AMOUNT = 0.045;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Decides the post-processing stack.
 *
 * | tier   | composer | bloom                     | god rays | speed blur + CA | grain | AA                |
 * | ------ | -------- | ------------------------- | -------- | --------------- | ----- | ----------------- |
 * | high   | yes      | full res, 8 mips          | yes      | yes             | opt   | MSAA ×4 or SMAA   |
 * | medium | yes      | half res, 5 mips          | no       | no              | no    | MSAA ×2           |
 * | low    | no       | —                         | no       | no              | no    | none              |
 *
 * Vignette and tone mapping run on medium + high; 'low' uses the renderer's own tone mapping.
 * `canvas.bloom === false` removes bloom everywhere; `canvas.fx.grain === false` / `aberration === false` opt out.
 */
export function resolveFxPlan(quality: QualityProfile, config: WorldCanvasConfig, opts: { readonly reducedMotion: boolean }): FxPlan {
  const fx = config.fx ?? {};
  const toneMapping: FxToneMapping = fx.toneMapping ?? 'aces';
  const vignette = clamp01(fx.vignette ?? DEFAULT_VIGNETTE);
  const flash = !opts.reducedMotion;
  const bloomBase = config.bloom === false ? null : (config.bloom ?? DEFAULT_BLOOM);

  if (quality.tier === 'low') {
    return {
      composer: false,
      multisampling: 0,
      smaa: false,
      bloom: null,
      godRays: false,
      speedFx: false,
      aberration: false,
      grain: 0,
      vignette: 0,
      toneMapping,
      flash,
    };
  }

  if (quality.tier === 'medium') {
    return {
      composer: true,
      multisampling: quality.antialias ? 2 : 0,
      smaa: false,
      bloom: bloomBase
        ? { intensity: bloomBase.intensity, luminanceThreshold: bloomBase.luminanceThreshold, luminanceSmoothing: 0.2, radius: 0.75, levels: 5, resolutionScale: 0.5 }
        : null,
      godRays: false,
      speedFx: false,
      aberration: false,
      grain: 0,
      vignette,
      toneMapping,
      flash,
    };
  }

  return {
    composer: true,
    multisampling: quality.antialias ? 4 : 0,
    smaa: !quality.antialias,
    bloom: bloomBase
      ? { intensity: bloomBase.intensity, luminanceThreshold: bloomBase.luminanceThreshold, luminanceSmoothing: 0.2, radius: 0.85, levels: 8, resolutionScale: 1 }
      : null,
    godRays: true,
    speedFx: true,
    aberration: fx.aberration !== false,
    // Grain is animated noise — skip it for reduced motion.
    grain: fx.grain !== false && !opts.reducedMotion ? GRAIN_AMOUNT : 0,
    vignette,
    toneMapping,
    flash,
  };
}

/** True when the default framebuffer needs its own MSAA (i.e. no composer will draw the frame). */
export function wantsNativeAntialias(quality: QualityProfile, plan: FxPlan): boolean {
  return quality.antialias && !plan.composer;
}
