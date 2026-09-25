import { AdditiveBlending, ShaderMaterial, type IUniform } from 'three';
import { FBM_3D, SIMPLEX_3D } from '@/engine/kit';

/**
 * Shared GLSL for every procedural body. All surfaces are computed on the GPU — no texture downloads —
 * and lit from the Sun at the world origin with a soft "animated film" terminator and a coloured rim.
 */

export const NOISE = SIMPLEX_3D + FBM_3D;

export const HASH = /* glsl */ `
vec3 hash33(vec3 p){
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
float hash13(vec3 p){
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
`;

/** Impact craters (bowl + raised rim) from a 3D cell field. Returns a height in roughly [-0.6, 0.35]. */
export const CRATERS = /* glsl */ `
float craterField(vec3 p, float scale, float density){
  vec3 q = p * scale;
  vec3 i = floor(q);
  vec3 f = fract(q);
  float h = 0.0;
  for (int x = -1; x <= 1; x++)
  for (int y = -1; y <= 1; y++)
  for (int z = -1; z <= 1; z++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = hash33(i + g);
    float on = step(1.0 - density, o.y);
    vec3 r = g + o - f;
    float rad = 0.2 + 0.28 * o.z;
    float k = length(r) / rad;
    float bowl = min(k * k - 1.0, 0.0);
    float rim = exp(-(k - 1.0) * (k - 1.0) * 9.0) * 0.4;
    h += (bowl * 0.65 + rim) * on;
  }
  return h;
}
`;

export const LIGHTING = /* glsl */ `
vec3 srgb(vec3 c){ return pow(c, vec3(2.2)); }
vec3 shadeBody(vec3 albedo, vec3 N, vec3 L, vec3 V, vec3 rimColor, float rimAmt, float warmth){
  float nl = dot(N, L);
  float day = smoothstep(-0.16, 0.55, nl);
  // cool blue fill on the night side, so no planet ever turns into a black hole on the map
  vec3 night = vec3(0.19, 0.21, 0.34);
  vec3 col = albedo * mix(night, vec3(1.06), day);
  // warm "subsurface" band along the terminator — the Pixar glow
  float band = smoothstep(-0.2, 0.02, nl) * (1.0 - smoothstep(0.02, 0.32, nl));
  col += albedo * vec3(0.6, 0.24, 0.08) * band * warmth;
  float f = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.4);
  col += rimColor * f * rimAmt * (0.22 + 0.78 * smoothstep(-0.35, 0.45, nl));
  return col;
}
vec3 bumpNormal(vec3 pos, vec3 n, float h){
  vec3 dpdx = dFdx(pos);
  vec3 dpdy = dFdy(pos);
  float dhdx = dFdx(h);
  float dhdy = dFdy(h);
  vec3 r1 = cross(dpdy, n);
  vec3 r2 = cross(n, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhdx * r1 + dhdy * r2);
  return normalize(abs(det) * n - grad);
}
`;

export const OUTPUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/** Vertex shader for spheres: object-space direction (pattern sticks to the spinning body) + world data for lighting. */
export function bodyVertex(displace = ''): string {
  return /* glsl */ `
  varying vec3 vObj;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  ${displace}
  void main(){
    vObj = normalize(position);
    vUv = uv;
    vec3 pos = position;
    ${displace ? 'pos += normal * displace(vObj);' : ''}
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
}

export const BODY_VARYINGS = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
`;

export type Uniforms = Record<string, IUniform>;

export interface BodyMaterialOptions {
  readonly vertex?: string;
  readonly fragment: string;
  readonly uniforms: Uniforms;
  readonly defines?: Record<string, string | number>;
  readonly transparent?: boolean;
  readonly depthWrite?: boolean;
  readonly additive?: boolean;
  readonly side?: ShaderMaterial['side'];
}

export function makeMaterial(o: BodyMaterialOptions): ShaderMaterial {
  const m = new ShaderMaterial({
    vertexShader: o.vertex ?? bodyVertex(),
    fragmentShader: o.fragment,
    uniforms: o.uniforms,
    defines: o.defines ?? {},
    transparent: o.transparent ?? false,
    depthWrite: o.depthWrite ?? true,
  });
  if (o.side !== undefined) m.side = o.side;
  if (o.additive) m.blending = AdditiveBlending;
  return m;
}

/** fbm octave count from the device's detail setting (keeps fill-rate sane on tablets). */
export function octaves(detail: number, max = 5): number {
  return Math.max(2, Math.min(max, Math.round(max * detail)));
}
