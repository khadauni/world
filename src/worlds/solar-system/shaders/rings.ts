import { Color, DoubleSide, type IUniform, type ShaderMaterial } from 'three';
import { NOISE, OUTPUT, makeMaterial } from './common';

/**
 * Saturn's ring opacity by distance from the centre in planet radii — real layout:
 * C ring 1.24–1.53 (faint), B ring 1.53–1.95 (bright), Cassini Division, A ring 2.03–2.27 with the Encke Gap,
 * and the thin F ring near 2.32.
 */
export const SATURN_RING_ALPHA = /* glsl */ `
float saturnRingAlpha(float r){
  float c = smoothstep(1.24, 1.27, r) * (1.0 - smoothstep(1.51, 1.53, r)) * 0.3;
  float b = smoothstep(1.52, 1.57, r) * (1.0 - smoothstep(1.93, 1.95, r)) * 0.93;
  float a = smoothstep(2.02, 2.05, r) * (1.0 - smoothstep(2.25, 2.27, r)) * 0.72;
  float encke = 1.0 - smoothstep(2.198, 2.203, r) * (1.0 - smoothstep(2.212, 2.217, r));
  float f = smoothstep(2.305, 2.31, r) * (1.0 - smoothstep(2.315, 2.32, r)) * 0.55;
  float fine = 0.8 + 0.2 * sin(r * 240.0) * sin(r * 67.0 + 1.3);
  return clamp((c + b + a * encke) * fine + f, 0.0, 1.0);
}
`;

const URANUS_RING_ALPHA = /* glsl */ `
float thinRing(float r, float c, float w){ return 1.0 - smoothstep(w * 0.5, w, abs(r - c)); }
float ringAlpha(float r){
  float a = thinRing(r, 1.64, 0.006) + thinRing(r, 1.66, 0.006) + thinRing(r, 1.68, 0.006);
  a += thinRing(r, 1.75, 0.008) + thinRing(r, 1.79, 0.009) + thinRing(r, 1.84, 0.008) + thinRing(r, 1.86, 0.008);
  a += thinRing(r, 1.95, 0.02) * 1.3;
  return clamp(a, 0.0, 1.0) * 0.4;
}
`;

const NEPTUNE_RING_ALPHA = /* glsl */ `
float thinRing(float r, float c, float w){ return 1.0 - smoothstep(w * 0.5, w, abs(r - c)); }
float ringAlpha(float r){
  float a = thinRing(r, 2.15, 0.012) * 0.6 + thinRing(r, 2.54, 0.014);
  a += smoothstep(2.2, 2.3, r) * (1.0 - smoothstep(2.4, 2.5, r)) * 0.12;
  return clamp(a, 0.0, 1.0) * 0.28;
}
`;

export type RingKind = 'saturn' | 'uranus' | 'neptune';

export interface RingLook {
  readonly inner: string;
  readonly outer: string;
}

const RING_LOOK: Readonly<Record<RingKind, RingLook>> = {
  saturn: { inner: '#a8977c', outer: '#f1e2c2' },
  uranus: { inner: '#6f8594', outer: '#9fb3be' },
  neptune: { inner: '#5c6f98', outer: '#8193c0' },
};

/**
 * Ring material for a flat RingGeometry lying in the planet's equatorial plane. Lit/back-lit depending on
 * which side the Sun is on, and shadowed where the planet blocks the Sun.
 */
export function ringMaterial(kind: RingKind, radius: number, time: IUniform<number>): ShaderMaterial {
  const look = RING_LOOK[kind];
  const alphaFn = kind === 'saturn' ? `${SATURN_RING_ALPHA}\nfloat ringAlpha(float r){ return saturnRingAlpha(r); }` : kind === 'uranus' ? URANUS_RING_ALPHA : NEPTUNE_RING_ALPHA;
  return makeMaterial({
    uniforms: {
      uTime: time,
      uRadius: { value: radius },
      uInnerCol: { value: new Color(look.inner) },
      uOuterCol: { value: new Color(look.outer) },
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertex: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vCenter;
      varying vec3 vNormal;
      varying float vR;
      uniform float uRadius;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vNormal = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
        vR = length(position.xy) / uRadius;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragment: /* glsl */ `
      uniform float uRadius;
      uniform vec3 uInnerCol;
      uniform vec3 uOuterCol;
      varying vec3 vWorldPos;
      varying vec3 vCenter;
      varying vec3 vNormal;
      varying float vR;
      ${NOISE}
      ${alphaFn}
      void main(){
        float r = vR;
        float alpha = ringAlpha(r);
        if (alpha < 0.004) discard;
        float grain = snoise(vec3(r * 90.0, 0.0, 0.0)) * 0.5 + 0.5;
        vec3 col = mix(uInnerCol, uOuterCol, smoothstep(1.3, 2.1, r)) * (0.85 + 0.3 * grain);
        vec3 L = normalize(-vWorldPos);
        vec3 V = normalize(cameraPosition - vWorldPos);
        float sunSide = dot(vNormal, L);
        float viewSide = dot(vNormal, V);
        float lit = sunSide * viewSide > 0.0 ? 1.0 : 0.45 + 0.35 * (1.0 - alpha);
        // planet shadow: does the ray toward the Sun hit the planet?
        vec3 oc = vWorldPos - vCenter;
        float b = dot(oc, L);
        float c = dot(oc, oc) - uRadius * uRadius;
        float h = b * b - c;
        float shadow = (b < 0.0 && h > 0.0) ? smoothstep(0.0, uRadius * uRadius * 0.08, h) : 0.0;
        col *= lit * (1.0 - 0.85 * shadow) * (0.55 + 0.45 * abs(sunSide) + 0.35);
        gl_FragColor = vec4(col, alpha);
        ${OUTPUT}
      }`,
  });
}
