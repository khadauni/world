import { Color, type IUniform, type ShaderMaterial } from 'three';
import { BODY_VARYINGS, CRATERS, HASH, LIGHTING, NOISE, OUTPUT, makeMaterial } from './common';

export interface RockyLook {
  /** Base, dark (maria / lowlands) and light (highlands) colours (sRGB hex). */
  readonly base: string;
  readonly dark: string;
  readonly light: string;
  readonly rim: string;
  readonly craterScale: number;
  readonly craterDensity: number;
  /** 0..1 amount of dark "seas". */
  readonly maria: number;
  /** 0 = plain, 1 = Io (sulfur volcano spots), 2 = Europa (cracked ice lines). */
  readonly mode: 0 | 1 | 2;
  readonly seed: number;
  /** Bump height in world units. */
  readonly bump: number;
}

/** Cratered rocky/icy worlds: Mercury, the Moon, Phobos, Deimos and Jupiter's Galilean moons. */
export function rockyMaterial(time: IUniform<number>, look: RockyLook, oct: number, craterLayers: number): ShaderMaterial {
  return makeMaterial({
    uniforms: {
      uTime: time,
      uBase: { value: new Color(look.base) },
      uDark: { value: new Color(look.dark) },
      uLight: { value: new Color(look.light) },
      uRim: { value: new Color(look.rim) },
      uCraterScale: { value: look.craterScale },
      uCraterDensity: { value: look.craterDensity },
      uMaria: { value: look.maria },
      uMode: { value: look.mode },
      uSeed: { value: look.seed },
      uBump: { value: look.bump },
    },
    defines: { OCT: oct, CRATER_LAYERS: craterLayers },
    fragment: /* glsl */ `
      uniform vec3 uBase;
      uniform vec3 uDark;
      uniform vec3 uLight;
      uniform vec3 uRim;
      uniform float uCraterScale;
      uniform float uCraterDensity;
      uniform float uMaria;
      uniform float uMode;
      uniform float uSeed;
      uniform float uBump;
      ${BODY_VARYINGS}
      ${NOISE}
      ${HASH}
      ${CRATERS}
      ${LIGHTING}
      void main(){
        vec3 p = vObj + vec3(uSeed);
        float n = fbm(p * 3.0, OCT);
        float h = craterField(p, uCraterScale, uCraterDensity);
        #if CRATER_LAYERS > 1
        h += 0.3 * craterField(p * 1.7 + 3.1, uCraterScale * 2.2, uCraterDensity * 0.8);
        #endif
        float maria = smoothstep(0.05, 0.32, fbm(p * 1.25 + 3.0, 3)) * uMaria;
        vec3 albedo = mix(uBase, uLight, smoothstep(-0.35, 0.6, n));
        albedo = mix(albedo, uDark, maria);
        albedo *= 0.82 + 0.4 * clamp(h + 0.35, 0.0, 1.0);
        if (uMode > 0.5 && uMode < 1.5) {
          float s = snoise(vObj * 6.5 + 11.0);
          albedo = mix(albedo, srgb(vec3(0.96, 0.62, 0.2)), smoothstep(0.45, 0.62, s));
          albedo = mix(albedo, srgb(vec3(0.22, 0.12, 0.06)), smoothstep(0.74, 0.82, s));
          albedo = mix(albedo, srgb(vec3(1.0, 0.97, 0.72)), smoothstep(0.2, 0.9, snoise(vObj * 2.5 + 2.0)) * 0.45);
        } else if (uMode > 1.5) {
          float l = abs(snoise(vObj * 3.6 + 5.0));
          float l2 = abs(snoise(vObj * 8.0 + 1.0));
          float lines = (1.0 - smoothstep(0.0, 0.06, l)) + 0.6 * (1.0 - smoothstep(0.0, 0.04, l2));
          albedo = mix(albedo, srgb(vec3(0.62, 0.36, 0.22)), clamp(lines, 0.0, 1.0) * 0.85);
        }
        vec3 N = bumpNormal(vWorldPos, normalize(vWorldNormal), (h + n * 0.3) * uBump);
        vec3 L = normalize(-vWorldPos);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 col = shadeBody(albedo, N, L, V, uRim, 0.55, 0.35);
        gl_FragColor = vec4(col, 1.0);
        ${OUTPUT}
      }`,
  });
}

export const LOOKS = {
  mercury: { base: '#8e8780', dark: '#5f5953', light: '#c9c1b6', rim: '#d8cfc4', craterScale: 5.5, craterDensity: 0.5, maria: 0.35, mode: 0, seed: 1.3, bump: 0.035 },
  moon: { base: '#a7a39d', dark: '#5c5a58', light: '#dedad3', rim: '#e8e4dc', craterScale: 5, craterDensity: 0.5, maria: 0.8, mode: 0, seed: 4.2, bump: 0.012 },
  phobos: { base: '#7a6a5c', dark: '#4e4239', light: '#9c8a78', rim: '#c9a58a', craterScale: 3.5, craterDensity: 0.5, maria: 0.2, mode: 0, seed: 7.1, bump: 0.006 },
  deimos: { base: '#8a7a6a', dark: '#5c5046', light: '#b09c88', rim: '#c9a58a', craterScale: 3, craterDensity: 0.4, maria: 0.1, mode: 0, seed: 2.7, bump: 0.004 },
  io: { base: '#e9d27a', dark: '#b8862f', light: '#fff4b8', rim: '#ffe89a', craterScale: 3, craterDensity: 0.05, maria: 0.3, mode: 1, seed: 9.3, bump: 0.004 },
  europa: { base: '#e8ddc8', dark: '#b89a7a', light: '#fbf6ec', rim: '#dfeaff', craterScale: 3, craterDensity: 0.05, maria: 0.15, mode: 2, seed: 5.5, bump: 0.003 },
  ganymede: { base: '#8d8174', dark: '#5f554b', light: '#cfc6b8', rim: '#d9e2f0', craterScale: 4, craterDensity: 0.4, maria: 0.55, mode: 0, seed: 3.9, bump: 0.005 },
  callisto: { base: '#5d5249', dark: '#3a322c', light: '#a3968a', rim: '#c8bfb5', craterScale: 6, craterDensity: 0.75, maria: 0.3, mode: 0, seed: 6.6, bump: 0.005 },
} as const satisfies Record<string, RockyLook>;
