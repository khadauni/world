import { Vector3, type IUniform, type ShaderMaterial } from 'three';
import { BODY_VARYINGS, LIGHTING, NOISE, OUTPUT, makeMaterial } from './common';

export interface VenusUniforms {
  readonly uReveal: IUniform<number>;
  readonly uRevealDir: IUniform<Vector3>;
}

/**
 * Venus: a swirling, pale-yellow sulfuric cloud deck drifting "backwards" (retrograde), with a V-shaped band
 * pattern. `uReveal` opens a hole in the clouds (world direction `uRevealDir`) onto the volcanic surface below.
 */
export function venusMaterial(time: IUniform<number>, oct: number): { material: ShaderMaterial; uniforms: VenusUniforms } {
  const uniforms: VenusUniforms = { uReveal: { value: 0 }, uRevealDir: { value: new Vector3(0, 0, 1) } };
  const material = makeMaterial({
    uniforms: { uTime: time, ...uniforms },
    defines: { OCT: oct },
    fragment: /* glsl */ `
      uniform float uTime;
      uniform float uReveal;
      uniform vec3 uRevealDir;
      ${BODY_VARYINGS}
      ${NOISE}
      ${LIGHTING}
      void main(){
        vec3 p = vObj;
        float a = uTime * 0.018;
        vec3 q = vec3(p.x * cos(a) + p.z * sin(a), p.y, -p.x * sin(a) + p.z * cos(a));
        float lat = p.y;
        float w = fbm(q * vec3(1.8, 4.5, 1.8) + vec3(0.0, 0.0, uTime * 0.01), OCT);
        float v = fbm(vec3(q.x * 1.4, q.y * 5.5 + w * 1.9 + abs(lat) * 2.4, q.z * 1.4), OCT);
        vec3 cream = srgb(vec3(1.0, 0.93, 0.72));
        vec3 butter = srgb(vec3(0.96, 0.8, 0.5));
        vec3 ochre = srgb(vec3(0.84, 0.6, 0.33));
        vec3 albedo = mix(butter, cream, smoothstep(-0.35, 0.45, v));
        albedo = mix(albedo, ochre, smoothstep(0.3, 0.75, -v) * 0.65);
        // Surface window
        vec3 N = normalize(vWorldNormal);
        float ang = acos(clamp(dot(N, uRevealDir), -1.0, 1.0));
        float r = uReveal * 0.62;
        float edgeNoise = fbm(vObj * 9.0, 3) * 0.06;
        float hole = (1.0 - smoothstep(r - 0.07, r + 0.01, ang + edgeNoise)) * step(0.001, uReveal);
        float lip = (1.0 - smoothstep(r, r + 0.12, ang + edgeNoise)) * step(0.001, uReveal) - hole;
        vec3 ground = mix(srgb(vec3(0.36, 0.17, 0.09)), srgb(vec3(0.64, 0.38, 0.18)), fbm(vObj * 8.0, 3) * 0.5 + 0.5);
        float lava = 1.0 - smoothstep(0.0, 0.03, abs(snoise(vObj * 11.0)));
        albedo = mix(albedo, ground, hole);
        albedo = mix(albedo, cream * 1.08, clamp(lip, 0.0, 1.0) * 0.6);
        vec3 L = normalize(-vWorldPos);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 col = shadeBody(albedo, N, L, V, srgb(vec3(1.0, 0.86, 0.5)), 1.1, 0.5);
        col += srgb(vec3(1.0, 0.36, 0.06)) * lava * hole * 1.2;
        gl_FragColor = vec4(col, 1.0);
        ${OUTPUT}
      }`,
  });
  return { material, uniforms };
}
