import { FBM_3D, SIMPLEX_3D } from '@/engine/kit';
import { COLOR_OUT } from './common';

/**
 * GPU particles: every particle's motion is computed in the vertex shader from its random seed and
 * the time, so emitters cost zero CPU per frame. Loop mode = continuous emitter; burst mode = one puff.
 */
export const PARTICLE_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uStart;
uniform float uStop;
uniform float uLoop;
uniform float uLife;
uniform float uBurstSpread;
uniform vec3 uEmitter;
uniform float uSpawnR;
uniform vec3 uDir;
uniform float uSpread;
uniform vec2 uSpeed;
uniform vec3 uGravity;
uniform float uDrag;
uniform vec2 uSize;
uniform float uScale;
uniform float uRise;
uniform float uFlat;
varying float vAge;
varying vec4 vSeed;
void main() {
  float life = uLife * (0.65 + 0.7 * aSeed.w);
  float t;
  float born;
  if (uLoop > 0.5) {
    float local = uTime - uStart + aSeed.x * life;
    t = mod(local, life);
    born = uTime - t;
    if (born < uStart || born > uStop) t = -1.0;
  } else {
    born = uStart + aSeed.x * uBurstSpread;
    t = uTime - born;
  }
  float age = t / life;
  if (t < 0.0 || age >= 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAge = 1.0;
    vSeed = aSeed;
    return;
  }
  float phi = aSeed.y * 6.2831853;
  float cosT = 1.0 - aSeed.z * uSpread;
  float sinT = sqrt(max(0.0, 1.0 - cosT * cosT));
  vec3 d = normalize(uDir);
  vec3 ta = normalize(abs(d.y) < 0.99 ? cross(d, vec3(0.0, 1.0, 0.0)) : cross(d, vec3(1.0, 0.0, 0.0)));
  vec3 tb = cross(d, ta);
  vec3 dir = d * cosT + (ta * cos(phi) + tb * sin(phi)) * sinT;
  dir.y *= 1.0 - uFlat;
  float speed = mix(uSpeed.x, uSpeed.y, fract(aSeed.w * 7.13 + aSeed.y));
  float k = max(uDrag, 0.0001);
  float travel = (1.0 - exp(-k * t)) / k;
  float ang = aSeed.z * 6.2831853 + aSeed.x * 3.0;
  vec3 spawn = uEmitter + vec3(cos(ang), 0.0, sin(ang)) * uSpawnR * sqrt(fract(aSeed.w * 3.7));
  float bt = max(0.0, born - uStart);
  spawn.y += uRise * bt * bt;
  vec3 p = spawn + dir * speed * travel + 0.5 * uGravity * t * t;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = mix(uSize.x, uSize.y, sqrt(age)) * (0.6 + 0.8 * fract(aSeed.y * 3.7));
  gl_PointSize = size * uScale / max(0.1, -mv.z);
  vAge = age;
  vSeed = aSeed;
}
`;

export const PARTICLE_FRAG = /* glsl */ `
uniform vec3 uColor0;
uniform vec3 uColor1;
uniform vec3 uShadow;
uniform vec3 uPalette[3];
uniform float uUsePalette;
uniform float uMode;
uniform float uOpacity;
uniform vec3 uLight;
varying float vAge;
varying vec4 vSeed;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  c.y = -c.y;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  vec3 col = mix(uColor0, uColor1, smoothstep(0.0, 1.0, vAge));
  if (uUsePalette > 0.5) {
    float idx = floor(fract(vSeed.w * 13.7) * 3.0);
    col = idx < 0.5 ? uPalette[0] : (idx < 1.5 ? uPalette[1] : uPalette[2]);
  }
  if (uMode < 0.5) {
    float a = pow(1.0 - r2, 1.6) * (1.0 - vAge * vAge) * uOpacity;
    gl_FragColor = vec4(col * a, a);
  } else if (uMode < 1.5) {
    vec3 n = vec3(c, sqrt(1.0 - r2));
    float l = clamp(dot(n, normalize(uLight)) * 0.6 + 0.45, 0.0, 1.0);
    vec3 shade = mix(uShadow, col, l);
    float fade = smoothstep(0.0, 0.08, vAge) * (1.0 - smoothstep(0.55, 1.0, vAge));
    float a = smoothstep(1.0, 0.55, r2) * fade * uOpacity;
    gl_FragColor = vec4(shade, a);
  } else {
    float a = smoothstep(1.0, 0.2, r2) * (1.0 - vAge) * uOpacity;
    float sparkle = 0.6 + 0.4 * sin(vSeed.x * 40.0 + vAge * 30.0);
    gl_FragColor = vec4(col * a * sparkle, a);
  }
  ${COLOR_OUT}
}
`;

/** Flickering engine flame on an open cone (uv.y = 1 at the nozzle, 0 at the tip). Additive. */
export const FLAME_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNV;
varying vec3 vVP;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vVP = mv.xyz;
  vNV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;

export const FLAME_FRAG = /* glsl */ `
uniform float uTime;
uniform float uPower;
uniform vec3 uHot;
uniform vec3 uCool;
varying vec2 vUv;
varying vec3 vNV;
varying vec3 vVP;
${SIMPLEX_3D}
void main() {
  float y = vUv.y;
  float n = snoise(vec3(vUv.x * 7.0, y * 5.0 + uTime * 9.0, uTime * 2.0));
  vec3 col = mix(uCool, uHot, smoothstep(0.2, 0.95, y + n * 0.12));
  col = mix(col, vec3(1.0), smoothstep(0.88, 1.0, y));
  float facing = abs(dot(normalize(vNV), normalize(-vVP)));
  float a = smoothstep(0.0, 0.55, y + n * 0.18) * pow(facing, 0.8) * uPower;
  gl_FragColor = vec4(col * a * 1.6, a);
}
`;

/** Cartoon "iris" wipe used between stops: a circle that closes to a point and opens again. */
export const IRIS_VERT = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const IRIS_FRAG = /* glsl */ `
uniform float uR;
uniform float uAspect;
uniform vec2 uCenter;
uniform vec3 uColor;
uniform vec3 uRim;
varying vec2 vP;
void main() {
  vec2 p = vec2((vP.x - uCenter.x) * uAspect, vP.y - uCenter.y);
  float d = length(p) / length(vec2(uAspect, 1.0));
  float outside = smoothstep(uR, uR + 0.006, d);
  float rim = smoothstep(uR - 0.03, uR, d) * (1.0 - smoothstep(uR, uR + 0.02, d));
  float a = max(outside, rim);
  if (a < 0.002) discard;
  vec3 col = mix(uColor, uRim, rim * (1.0 - outside * 0.6));
  gl_FragColor = vec4(col, a);
}
`;

/**
 * Space backdrop: a soft Milky Way band along a tilted great circle (with a dusty lane), plus faint coloured
 * nebula patches. Computed from the view direction, so it is crisp at any zoom; dithered to avoid banding.
 */
export const SPACE_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SPACE_FRAG = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uBandA;
uniform vec3 uBandB;
uniform vec3 uNebA;
uniform vec3 uNebB;
uniform vec3 uNormal;
uniform float uStrength;
varying vec3 vDir;
${SIMPLEX_3D}
void main() {
  vec3 d = normalize(vDir);
  float n1 = snoise(d * 2.3) * 0.5 + 0.5;
#if DETAIL > 0
  float n2 = snoise(d * 6.0 + 3.0);
#else
  float n2 = 0.0;
#endif
  float b = dot(d, uNormal);
  float band = exp(-(b * b) / (0.02 + 0.03 * n1));
  float lane = exp(-pow((b - 0.03 * n2) / 0.018, 2.0)) * smoothstep(0.35, 0.75, n1);
  vec3 col = mix(uBandA, uBandB, n1) * band * (0.6 + 0.4 * n2) * (1.0 - 0.7 * lane);
  float neb = smoothstep(0.62, 0.95, snoise(d * 1.4 + 11.0) * 0.5 + 0.5);
  col += mix(uNebA, uNebB, n1) * neb * (0.7 + 0.3 * n2);
  gl_FragColor = vec4(uBase + col * uStrength, 1.0);
  ${COLOR_OUT}
  // Dither in output (sRGB) space: breaks up 8-bit banding in these very dark gradients.
  gl_FragColor.rgb += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
}
`;

/** Afternoon sky over Sriharikota: warm horizon, blue zenith, soft sun, puffy cartoon clouds. */
export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p;
}
`;

export const SKY_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uTime;
uniform float uClouds;
varying vec3 vDir;
${SIMPLEX_3D}
${FBM_3D}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.22, h));
  col = mix(col, uTop, smoothstep(0.2, 0.85, h));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * (pow(sd, 400.0) * 3.0 + pow(sd, 16.0) * 0.3 + pow(sd, 3.0) * 0.08);
  // Clouds only live in a band above the horizon: skip the noise everywhere else.
  if (h > 0.0 && h < 0.75) {
    vec2 uv = d.xz / max(h + 0.12, 0.04);
    float n = fbm(vec3(uv * 0.55 + vec2(uTime * 0.006, 0.0), 1.7), OCTAVES);
    float puff = smoothstep(0.08, 0.42, n) * smoothstep(0.0, 0.1, h) * (1.0 - smoothstep(0.3, 0.75, h)) * uClouds;
    vec3 cloud = mix(vec3(1.0, 0.82, 0.78), vec3(1.0, 0.99, 0.97), smoothstep(0.1, 0.55, n));
    col = mix(col, cloud, puff * 0.9);
  }
  gl_FragColor = vec4(col, 1.0);
  ${COLOR_OUT}
}
`;

/** Bay of Bengal: shallow turquoise to deep blue, drifting glints, foam at the shoreline. */
export const SEA_VERT = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const SEA_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform vec3 uSunDir;
uniform float uShoreX;
varying vec3 vW;
float shoreLine(float z) {
  return uShoreX + 4.0 * sin(z * 0.045) + 2.0 * sin(z * 0.13 + 1.0);
}
${SIMPLEX_3D}
void main() {
  vec2 q = vW.xz;
  float shore = vW.x - shoreLine(vW.z);
  float n = snoise(vec3(q * 0.18, uTime * 0.25)) * 0.6 + snoise(vec3(q * 0.6, uTime * 0.5)) * 0.3;
  vec3 col = mix(uShallow, uDeep, smoothstep(2.0, 40.0, shore + n * 3.0));
  vec3 V = normalize(cameraPosition - vW);
  float fres = pow(1.0 - max(V.y, 0.0), 4.0);
  col = mix(col, uSky, fres * 0.55);
  vec3 N = normalize(vec3(n * 0.25, 1.0, snoise(vec3(q * 0.4 + 7.0, uTime * 0.4)) * 0.25));
  vec3 H = normalize(normalize(uSunDir) + V);
  float spec = pow(max(dot(N, H), 0.0), 140.0);
  col += vec3(1.0, 0.95, 0.85) * spec * 1.4;
  float foam = smoothstep(2.2, 0.0, shore + n * 1.2 + sin(uTime * 1.3 + q.y * 0.3) * 0.5);
  col = mix(col, vec3(0.97, 1.0, 1.0), foam * 0.85);
  float far = smoothstep(80.0, 260.0, length(vW.xz - cameraPosition.xz));
  col = mix(col, uSky, far * 0.6);
  gl_FragColor = vec4(col, 1.0);
  ${COLOR_OUT}
}
`;
