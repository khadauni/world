import { Color, MeshPhysicalMaterial, type IUniform, type WebGLProgramParametersWithUniforms } from 'three';
import { TISSUE_FRAG_COLOR, TISSUE_FRAG_EMISSIVE, TISSUE_FRAG_PARS, TISSUE_VERT_MAIN, TISSUE_VERT_PARS } from '../shaders/tissue';

export interface TissueOptions {
  color: string;
  rim?: string;
  rimStrength?: number;
  sheen?: string;
  mottle?: number;
  fibres?: number;
  roughness?: number;
  clearcoat?: number;
  transparent?: boolean;
  opacity?: number;
}

/**
 * Glossy "wet candy" tissue: MeshPhysicalMaterial (clearcoat + sheen, reflecting the studio environment)
 * with a little procedural colour life and a coloured rim light injected. All tissue materials share one
 * compiled program (same cache key); each keeps its own uniform values.
 */
export class TissueMaterial extends MeshPhysicalMaterial {
  readonly rim: IUniform<Color>;
  readonly rimStrength: IUniform<number>;
  readonly mottle: IUniform<number>;
  readonly fibres: IUniform<number>;
  /** 0…1 highlight glow (task targets, hints). Mutate `.value` per frame — no re-render needed. */
  readonly glow: IUniform<number>;
  readonly glowColor: IUniform<Color>;

  constructor(o: TissueOptions) {
    super({
      color: new Color(o.color),
      roughness: o.roughness ?? 0.42,
      metalness: 0,
      clearcoat: o.clearcoat ?? 1,
      clearcoatRoughness: 0.18,
      sheen: 0.6,
      sheenRoughness: 0.45,
      sheenColor: new Color(o.sheen ?? '#ffd6e2'),
      transparent: o.transparent ?? false,
      opacity: o.opacity ?? 1,
    });
    this.rim = { value: new Color(o.rim ?? '#ffc1d6') };
    this.rimStrength = { value: o.rimStrength ?? 0.55 };
    this.mottle = { value: o.mottle ?? 0.1 };
    this.fibres = { value: o.fibres ?? 0.05 };
    this.glow = { value: 0 };
    this.glowColor = { value: new Color('#fff4b0') };
  }

  override onBeforeCompile(shader: WebGLProgramParametersWithUniforms): void {
    shader.uniforms.uRim = this.rim;
    shader.uniforms.uRimStrength = this.rimStrength;
    shader.uniforms.uMottle = this.mottle;
    shader.uniforms.uFibres = this.fibres;
    shader.uniforms.uGlow = this.glow;
    shader.uniforms.uGlowColor = this.glowColor;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${TISSUE_VERT_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${TISSUE_VERT_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${TISSUE_FRAG_PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${TISSUE_FRAG_COLOR}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${TISSUE_FRAG_EMISSIVE}`);
  }

  override customProgramCacheKey(): string {
    return 'hh-tissue-v2';
  }
}

/** Ease a material's highlight glow toward a goal (call from useFrame). */
export function easeGlow(m: TissueMaterial, goal: number, dt: number, speed = 6): void {
  m.glow.value += (goal - m.glow.value) * Math.min(1, dt * speed);
}
