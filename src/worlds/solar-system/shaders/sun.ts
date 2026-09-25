import { DoubleSide, type Color, type IUniform, type ShaderMaterial } from 'three';
import { BODY_VARYINGS, NOISE, OUTPUT, makeMaterial } from './common';

/** Animated fbm plasma with granulation, sunspots, limb darkening and a hot orange rim. */
export function sunMaterial(time: IUniform<number>, oct: number, boost: number): ShaderMaterial {
  return makeMaterial({
    uniforms: { uTime: time, uBoost: { value: boost } },
    defines: { OCT: oct },
    fragment: /* glsl */ `
      uniform float uTime;
      uniform float uBoost;
      ${BODY_VARYINGS}
      ${NOISE}
      void main(){
        vec3 p = vObj;
        float t = uTime * 0.05;
        vec3 q = p * 2.4;
        float warp = fbm(q + vec3(0.0, t, t * 0.6), OCT);
        float n = fbm(q * 1.8 + warp * 1.7 + vec3(t * 1.4, 0.0, -t), OCT);
        float cells = snoise(p * 12.0 + vec3(t * 4.0)) * 0.5 + 0.5;
        float heat = clamp(0.5 + 0.6 * n + 0.2 * (cells - 0.5), 0.0, 1.0);
        vec3 deep = vec3(0.92, 0.22, 0.02);
        vec3 mid = vec3(1.0, 0.56, 0.06);
        vec3 hot = vec3(1.0, 0.9, 0.5);
        vec3 col = mix(deep, mid, smoothstep(0.12, 0.5, heat));
        col = mix(col, hot, smoothstep(0.58, 0.95, heat));
        float spots = smoothstep(0.66, 0.74, snoise(p * 3.3 + vec3(7.0, t * 0.25, 0.0)));
        col = mix(col, vec3(0.5, 0.12, 0.02), spots * 0.55);
        vec3 V = normalize(cameraPosition - vWorldPos);
        float mu = clamp(dot(normalize(vWorldNormal), V), 0.0, 1.0);
        col *= mix(0.8, 1.1, pow(mu, 0.45));
        col += vec3(1.0, 0.36, 0.04) * pow(1.0 - mu, 2.2) * 0.85;
        gl_FragColor = vec4(col * uBoost, 1.0);
        ${OUTPUT}
      }`,
  });
}

/** Camera-facing corona: soft falloff broken into slowly shifting rays. Additive. */
export function coronaMaterial(time: IUniform<number>, inner: number, color: Color, intensity: number): ShaderMaterial {
  return makeMaterial({
    uniforms: { uTime: time, uInner: { value: inner }, uColor: { value: color }, uIntensity: { value: intensity } },
    transparent: true,
    depthWrite: false,
    additive: true,
    side: DoubleSide,
    vertex: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: /* glsl */ `
      uniform float uTime;
      uniform float uInner;
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      void main(){
        vec2 c = vUv * 2.0 - 1.0;
        float r = length(c);
        float a = atan(c.y, c.x);
        // Cheap, seamless "rays": a few drifting sine waves around the rim (no per-pixel noise).
        float rays = 0.5 + 0.22 * sin(a * 5.0 + uTime * 0.21) + 0.18 * sin(a * 9.0 - uTime * 0.33 + 1.3) + 0.1 * sin(a * 17.0 + uTime * 0.5);
        float rays2 = 0.5 + 0.3 * sin(a * 23.0 - uTime * 0.4) * sin(a * 7.0 + uTime * 0.17);
        float edge = max(0.0, (r - uInner) / (1.0 - uInner));
        float glow = exp(-edge * (5.5 - 2.5 * rays)) * (0.55 + 0.45 * rays + 0.35 * rays2);
        glow *= 1.0 - smoothstep(0.75, 1.0, r);
        glow *= smoothstep(uInner - 0.04, uInner + 0.01, r);
        gl_FragColor = vec4(uColor * glow * uIntensity, 1.0);
        ${OUTPUT}
      }`,
  });
}
