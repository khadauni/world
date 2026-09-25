import { Color, Vector2, Vector3, type IUniform, type ShaderMaterial } from 'three';
import { BODY_VARYINGS, LIGHTING, NOISE, OUTPUT, makeMaterial } from './common';
import { latLonDir } from './mars';
import { SATURN_RING_ALPHA } from './rings';

export interface GiantLook {
  /** Five band colours (sRGB hex), cycled from equator to pole. */
  readonly palette: readonly [string, string, string, string, string];
  readonly bandFreq: number;
  readonly turbulence: number;
  readonly flow: number;
  readonly rim: string;
  readonly rimAmt: number;
  /** Big storm: Great Red Spot / Great Dark Spot. */
  readonly spot?: { readonly lat: number; readonly lon: number; readonly size: readonly [number, number]; readonly color: string; readonly collar: string };
  /** Bright, streaky high clouds (Neptune). */
  readonly wisps?: number;
  /** Saturn's rings cast a shadow on the planet. */
  readonly ringShadow?: boolean;
  /** Brighter polar haze (Uranus). */
  readonly polarHaze?: number;
}

export interface GiantUniforms {
  readonly uRingNormal: IUniform<Vector3>;
  readonly uRadius: IUniform<number>;
}

/**
 * Gas & ice giants: latitude bands with turbulent edges that drift at different speeds (differential rotation),
 * optional storm spot, wisps and ring shadow.
 */
export function giantMaterial(time: IUniform<number>, look: GiantLook, oct: number, radius: number): { material: ShaderMaterial; uniforms: GiantUniforms } {
  const uniforms: GiantUniforms = { uRingNormal: { value: new Vector3(0, 1, 0) }, uRadius: { value: radius } };
  const spot = look.spot;
  const defines: Record<string, number> = { OCT: oct };
  if (spot) defines.SPOT = 1;
  if (look.wisps) defines.WISPS = 1;
  if (look.ringShadow) defines.RING_SHADOW = 1;
  const material = makeMaterial({
    vertex: /* glsl */ `
      varying vec3 vObj;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      varying vec3 vCenter;
      void main(){
        vObj = normalize(position);
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    uniforms: {
      uTime: time,
      ...uniforms,
      uC0: { value: new Color(look.palette[0]) },
      uC1: { value: new Color(look.palette[1]) },
      uC2: { value: new Color(look.palette[2]) },
      uC3: { value: new Color(look.palette[3]) },
      uC4: { value: new Color(look.palette[4]) },
      uBandFreq: { value: look.bandFreq },
      uTurb: { value: look.turbulence },
      uFlow: { value: look.flow },
      uRim: { value: new Color(look.rim) },
      uRimAmt: { value: look.rimAmt },
      uSpotDir: { value: spot ? latLonDir(spot.lat, spot.lon) : new Vector3(1, 0, 0) },
      uSpotSize: { value: new Vector2(...(spot?.size ?? [0.2, 0.1])) },
      uSpotColor: { value: new Color(spot?.color ?? '#ffffff') },
      uSpotCollar: { value: new Color(spot?.collar ?? '#ffffff') },
      uWisps: { value: look.wisps ?? 0 },
      uPolar: { value: look.polarHaze ?? 0 },
    },
    defines,
    fragment: /* glsl */ `
      uniform float uTime;
      uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uC4;
      uniform float uBandFreq;
      uniform float uTurb;
      uniform float uFlow;
      uniform vec3 uRim;
      uniform float uRimAmt;
      uniform vec3 uSpotDir;
      uniform vec2 uSpotSize;
      uniform vec3 uSpotColor;
      uniform vec3 uSpotCollar;
      uniform float uWisps;
      uniform float uPolar;
      uniform vec3 uRingNormal;
      uniform float uRadius;
      varying vec3 vCenter;
      ${BODY_VARYINGS}
      ${NOISE}
      ${LIGHTING}
      ${SATURN_RING_ALPHA}
      vec3 palette(float x){
        x = fract(x) * 5.0;
        float i = floor(x);
        float f = smoothstep(0.1, 0.9, fract(x));
        vec3 a = i < 1.0 ? uC0 : i < 2.0 ? uC1 : i < 3.0 ? uC2 : i < 4.0 ? uC3 : uC4;
        vec3 b = i < 1.0 ? uC1 : i < 2.0 ? uC2 : i < 3.0 ? uC3 : i < 4.0 ? uC4 : uC0;
        return mix(a, b, f);
      }
      vec3 rotY(vec3 p, float a){ return vec3(p.x * cos(a) - p.z * sin(a), p.y, p.x * sin(a) + p.z * cos(a)); }
      void main(){
        vec3 p = vObj;
        float lat = p.y;
        float jet = sin(lat * uBandFreq * 3.14159);
        vec3 q = rotY(p, uTime * uFlow * (0.35 + 0.65 * jet) * 0.04);
        float turb = fbm(vec3(q.x * 2.3, q.y * 10.0, q.z * 2.3), OCT);
        float band = abs(lat) * uBandFreq * 0.5 + lat * 0.07 + turb * uTurb;
        vec3 albedo = palette(band);
        float streak = fbm(vec3(q.x * 5.0, q.y * 42.0, q.z * 5.0) + 3.0, 3);
        albedo *= 0.95 + 0.1 * streak;
        albedo = mix(albedo, uC0 * 1.05, smoothstep(0.55, 0.95, abs(lat)) * uPolar);
        #ifdef SPOT
        vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), uSpotDir));
        vec3 north = cross(uSpotDir, east);
        vec3 d = p - uSpotDir;
        vec2 s = vec2(dot(d, east), dot(d, north)) / uSpotSize;
        float e = length(s);
        if (e < 1.6 && dot(p, uSpotDir) > 0.0) {
          float ang = (1.0 - clamp(e, 0.0, 1.0)) * 3.0 + uTime * 0.12;
          vec2 r = vec2(s.x * cos(ang) - s.y * sin(ang), s.x * sin(ang) + s.y * cos(ang));
          float swirl = snoise(vec3(r * 2.2, 3.0)) * 0.5 + 0.5;
          vec3 spotCol = mix(uSpotColor, uSpotColor * 1.25, swirl);
          float core = 1.0 - smoothstep(0.75, 1.0, e);
          float collar = smoothstep(0.8, 1.0, e) * (1.0 - smoothstep(1.0, 1.35, e));
          albedo = mix(albedo, uSpotCollar, collar * 0.75);
          albedo = mix(albedo, spotCol, core);
        }
        #endif
        #ifdef WISPS
        float w = fbm(vec3(q.x * 3.0, q.y * 24.0, q.z * 3.0) + vec3(uTime * 0.02, 0.0, 0.0), 3);
        float wl = smoothstep(0.35, 0.6, w) * smoothstep(0.1, 0.35, abs(lat)) * (1.0 - smoothstep(0.7, 0.85, abs(lat)));
        albedo = mix(albedo, vec3(0.95, 0.97, 1.0), wl * uWisps);
        #endif
        vec3 N = normalize(vWorldNormal);
        vec3 L = normalize(-vWorldPos);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 col = shadeBody(albedo, N, L, V, uRim, uRimAmt, 0.45);
        #ifdef RING_SHADOW
        float denom = dot(L, uRingNormal);
        if (abs(denom) > 1e-3) {
          float t = dot(vCenter - vWorldPos, uRingNormal) / denom;
          if (t > 0.0) {
            vec3 hit = vWorldPos + L * t;
            float rr = length(hit - vCenter) / uRadius;
            col *= 1.0 - 0.7 * saturnRingAlpha(rr);
          }
        }
        #endif
        gl_FragColor = vec4(col, 1.0);
        ${OUTPUT}
      }`,
  });
  return { material, uniforms };
}

export const GIANTS = {
  jupiter: {
    palette: ['#f7ecd8', '#e9cfa6', '#b86e43', '#f1dfc2', '#c48a5c'],
    bandFreq: 4.4,
    turbulence: 0.22,
    flow: 1,
    rim: '#ffe0b8',
    rimAmt: 0.55,
    spot: { lat: -22, lon: 40, size: [0.23, 0.13], color: '#c8562c', collar: '#f7e3c6' },
  },
  saturn: {
    palette: ['#f3e2b8', '#e2c48e', '#d0ab70', '#ecd4a2', '#c9a46c'],
    bandFreq: 6,
    turbulence: 0.12,
    flow: 0.8,
    rim: '#ffecc0',
    rimAmt: 0.5,
    ringShadow: true,
    polarHaze: 0.15,
  },
  uranus: {
    palette: ['#bff3f2', '#aeebee', '#a2e2e8', '#b6efef', '#c8f6f3'],
    bandFreq: 4,
    turbulence: 0.05,
    flow: 0.5,
    rim: '#d8fffb',
    rimAmt: 0.9,
    polarHaze: 0.5,
  },
  neptune: {
    palette: ['#3f6dff', '#2f55de', '#4a7cff', '#2a47c6', '#5b8dff'],
    bandFreq: 5,
    turbulence: 0.22,
    flow: 1.6,
    rim: '#8fb4ff',
    rimAmt: 1,
    spot: { lat: -22, lon: 60, size: [0.2, 0.11], color: '#15267a', collar: '#e8f0ff' },
    wisps: 0.9,
  },
} as const satisfies Record<string, GiantLook>;
