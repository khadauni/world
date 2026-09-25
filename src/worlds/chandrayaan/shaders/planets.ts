import { FBM_3D, SIMPLEX_3D } from '@/engine/kit';
import { BUMP, COLOR_OUT, CRATERS, HASH33 } from './common';

/** Stylised Earth: canvas continent mask + noise coastlines, deserts by latitude, ice caps, ocean glint, rim glow. */
export const EARTH_FRAG = /* glsl */ `
uniform sampler2D uLand;
uniform vec3 uSun;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uGreen;
uniform vec3 uForest;
uniform vec3 uSand;
uniform vec3 uIce;
uniform vec3 uNight;
uniform vec3 uRim;
varying vec2 vUv;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vW;
${SIMPLEX_3D}
${FBM_3D}
void main() {
  vec3 n = normalize(vN);
  vec3 p = normalize(vObj);
  float wob = snoise(p * 9.0) * 0.5 + snoise(p * 23.0) * 0.25;
  vec4 m = texture2D(uLand, vUv + vec2(wob * 0.0022, wob * 0.0018));
  float land = smoothstep(0.4, 0.6, m.r + wob * 0.07);
  float lat = abs(p.y);
  float n1 = fbm(p * 3.5, OCTAVES);
  float n2 = fbm(p * 10.0 + 7.0, OCTAVES - 1);
  vec3 ocean = mix(uDeep, uShallow, smoothstep(0.05, 0.75, m.g) * 0.85);
  ocean *= 0.92 + 0.1 * n2;
  float desert = smoothstep(0.2, 0.36, lat) * (1.0 - smoothstep(0.5, 0.62, lat));
  desert = clamp(desert * 1.3 + n1 * 0.7 - 0.15, 0.0, 1.0);
  vec3 veg = mix(uGreen, uForest, smoothstep(-0.3, 0.5, n2));
  vec3 landC = mix(veg, uSand, smoothstep(0.35, 0.8, desert));
  landC *= 0.88 + 0.28 * (n2 * 0.5 + 0.5);
  vec3 col = mix(ocean, landC, land);
  // Sea ice only in the high Arctic (above ~72°N). Ice sheets: all of Antarctica, Greenland (u ≈ lon −75°…−15°),
  // and the high-Arctic islands — not the whole of Europe and Siberia.
  float north = step(0.0, p.y);
  float greenland = step(0.29, vUv.x) * step(vUv.x, 0.46) * smoothstep(0.84, 0.87, lat);
  float sheet = mix(smoothstep(0.84, 0.88, lat), max(greenland, smoothstep(0.93, 0.96, lat)), north);
  float ice = max(smoothstep(0.945, 0.98, lat + n1 * 0.04), land * sheet);
  col = mix(col, uIce, ice);

  vec3 L = normalize(uSun);
  vec3 V = normalize(cameraPosition - vW);
  float ndl = dot(n, L);
  float day = smoothstep(-0.2, 0.3, ndl);
  vec3 lit = col * (0.22 + 1.1 * max(ndl, 0.0));
  float band = 1.0 - smoothstep(0.0, 0.22, abs(ndl - 0.02));
  lit += vec3(1.0, 0.5, 0.25) * band * 0.08;
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(n, H), 0.0), 60.0) * (1.0 - land) * (1.0 - ice);
  lit += vec3(1.0, 0.93, 0.78) * spec * 0.6;
  vec3 c = mix(uNight * (0.5 + col), lit, day);
  float rim = pow(1.0 - max(dot(n, V), 0.0), 2.6);
  c += uRim * rim * (0.12 + 0.9 * day);
  gl_FragColor = vec4(c, 1.0);
  ${COLOR_OUT}
}
`;

export const CLOUD_FRAG = /* glsl */ `
uniform vec3 uSun;
uniform float uTime;
uniform float uAmount;
varying vec2 vUv;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vW;
${SIMPLEX_3D}
${FBM_3D}
void main() {
  vec3 p = normalize(vObj);
  float a = uTime * 0.012;
  vec3 q = vec3(p.x * cos(a) - p.z * sin(a), p.y, p.x * sin(a) + p.z * cos(a));
  float n = fbm(q * 2.4 + vec3(0.0, 0.0, uTime * 0.003), OCTAVES + 1);
  float swirl = fbm(q * 6.0 + n * 1.5, OCTAVES - 1);
  float c = smoothstep(0.12 - uAmount, 0.5, n + swirl * 0.25);
  float ndl = dot(normalize(vN), normalize(uSun));
  float day = smoothstep(-0.15, 0.35, ndl);
  vec3 col = mix(vec3(0.05, 0.07, 0.16), vec3(1.0), day);
  gl_FragColor = vec4(col, c * 0.9);
  ${COLOR_OUT}
}
`;

/** Back-side halo shell: glows strongest at the planet's limb, fades to nothing at the shell edge. */
export const HALO_VERT = /* glsl */ `
varying vec3 vNV;
varying vec3 vVP;
varying vec3 vNW;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vVP = mv.xyz;
  vNV = normalize(normalMatrix * normal);
  vNW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * mv;
}
`;

export const HALO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uSun;
uniform float uEdge;
uniform float uIntensity;
uniform float uSunBias;
varying vec3 vNV;
varying vec3 vVP;
varying vec3 vNW;
void main() {
  vec3 V = normalize(-vVP);
  float k = clamp(-dot(normalize(vNV), V) / uEdge, 0.0, 1.0);
  float glow = pow(k, 2.2);
  float lit = mix(1.0, smoothstep(-0.5, 0.6, dot(normalize(vNW), normalize(uSun))), uSunBias);
  vec3 c = uColor * glow * uIntensity * (0.25 + 0.75 * lit);
  gl_FragColor = vec4(c, glow);
}
`;

/** Stylised Moon: maria patches, three crater layers with derivative bump, earthshine ambient. */
export const MOON_FRAG = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uBase;
uniform vec3 uMare;
uniform float uAmbient;
uniform float uBump;
uniform float uSouthCraters;
uniform vec4 uMaria[7];
varying vec2 vUv;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vW;
${SIMPLEX_3D}
${FBM_3D}
${HASH33}
${CRATERS}
${BUMP}
void main() {
  vec3 p = normalize(vObj);
  float mare = 0.0;
  float edge = snoise(p * 5.0) * 0.07 + snoise(p * 13.0) * 0.03;
  for (int i = 0; i < 7; i++) {
    vec4 m = uMaria[i];
    float d = distance(p, normalize(m.xyz)) + edge;
    mare = max(mare, 1.0 - smoothstep(m.w * 0.55, m.w, d));
  }
  float south = smoothstep(-0.2, -0.85, p.y) * uSouthCraters;
  // Fade out crater layers that would be smaller than a few pixels (no sparkly aliasing when far away).
  float px = length(fwidth(p));
  float w1 = 1.0 - smoothstep(0.12, 0.35, px * 5.0);
  float w2 = 1.0 - smoothstep(0.12, 0.35, px * 12.0);
  float w3 = 1.0 - smoothstep(0.12, 0.35, px * 29.0);
  float h = craters(p * 5.0, 0.55) * 0.9 * w1 + craters(p * 12.0 + 3.1, 0.6 + south * 0.3) * 0.5 * w2 + craters(p * 29.0 + 7.7, 0.7) * 0.25 * w3;
  h += fbm(p * 24.0, OCTAVES - 1) * 0.03 * w3;
  h *= 1.0 - mare * 0.55;
  vec3 n = bumpNormal(normalize(vN), vW, h, uBump);
  float grain = fbm(p * 9.0, OCTAVES);
  vec3 col = mix(uBase, uMare, mare) * (0.86 + 0.24 * grain);
  col *= 1.0 + clamp(h, -0.2, 0.2) * 0.8;
  vec3 L = normalize(uSun);
  vec3 V = normalize(cameraPosition - vW);
  float ndl = dot(n, L);
  float diff = max(ndl, 0.0);
  vec3 lit = col * (diff * 1.25 + uAmbient);
  float rim = pow(1.0 - max(dot(normalize(vN), V), 0.0), 3.0);
  lit += vec3(0.55, 0.65, 1.0) * rim * 0.18 * smoothstep(-0.3, 0.3, dot(normalize(vN), L) + 0.25);
  gl_FragColor = vec4(lit, 1.0);
  ${COLOR_OUT}
}
`;
