import { SIMPLEX_3D } from '@/engine/kit';

/**
 * Chunks injected into MeshPhysicalMaterial (via onBeforeCompile) for the "wet candy" heart tissue:
 * soft mottled colour, faint muscle-fibre striations and a coloured rim light — on top of three.js's
 * physically based clearcoat + sheen, so it still reflects the studio environment.
 */
export const TISSUE_VERT_PARS = /* glsl */ `
varying vec3 vObjPos;
`;

export const TISSUE_VERT_MAIN = /* glsl */ `
vObjPos = position;
`;

export const TISSUE_FRAG_PARS = /* glsl */ `
varying vec3 vObjPos;
uniform vec3 uRim;
uniform float uRimStrength;
uniform float uMottle;
uniform float uFibres;
uniform float uGlow;
uniform vec3 uGlowColor;
${SIMPLEX_3D}
`;

/** Runs after <color_fragment>: modulates the base colour. */
export const TISSUE_FRAG_COLOR = /* glsl */ `
{
  // Two noise lookups per pixel: the low octave also bends the muscle fibres.
  vec3 p = vObjPos * 2.3;
  float n1 = snoise(p);
  float n = n1 * 0.6 + snoise(p * 2.7 + 7.1) * 0.4;
  diffuseColor.rgb *= 1.0 + n * uMottle;
  float f = sin(vObjPos.y * 26.0 + vObjPos.x * 9.0 + n1 * 3.2);
  diffuseColor.rgb *= 1.0 - uFibres * smoothstep(0.55, 1.0, f);
}
`;

/** Runs after <emissivemap_fragment>: rim light + highlight glow. `normal` is view-space here. */
export const TISSUE_FRAG_EMISSIVE = /* glsl */ `
{
  float facing = clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
  float rim = pow(1.0 - facing, 2.6);
  totalEmissiveRadiance += uRim * rim * uRimStrength;
  totalEmissiveRadiance += uGlowColor * uGlow * (0.35 + rim * 1.2);
}
`;
