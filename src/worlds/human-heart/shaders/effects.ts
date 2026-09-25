import { FRESNEL, SIMPLEX_3D } from '@/engine/kit';

/** Soft "inside the body" backdrop: warm glow behind the subject fading to deep berry, with drifting blobs. */
export const BACKDROP_VERT = /* glsl */ `
varying vec3 vWorld;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const BACKDROP_FRAG = /* glsl */ `
uniform vec3 uCenter;
uniform vec3 uMid;
uniform vec3 uEdge;
uniform vec3 uForward;
uniform float uTime;
varying vec3 vWorld;
${SIMPLEX_3D}
void main(){
  vec3 dir = normalize(vWorld - cameraPosition);
  float c = clamp(dot(dir, uForward), 0.0, 1.0);
  float glow = smoothstep(0.55, 1.0, c);
  vec3 col = mix(uEdge, uMid, smoothstep(0.2, 0.9, c));
  col = mix(col, uCenter, glow * glow);
  // One low-frequency noise is enough for the soft mottling — this shader covers the whole screen.
  float n = snoise(dir * 2.6 + vec3(uTime * 0.02, uTime * 0.03, uTime * 0.02));
  col *= 0.92 + n * 0.12;
  // Soft vertical falloff so the floor area reads a bit darker (grounding).
  col *= 0.85 + 0.15 * smoothstep(-0.6, 0.4, dir.y);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** Glowing x-ray body silhouette (additive): bright rim, faint core, gentle rising shimmer. */
export const GHOST_VERT = /* glsl */ `
varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec3 vWorld;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = -mv.xyz;
  vNormalV = normalize(normalMatrix * normal);
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * mv;
}`;

export const GHOST_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uRimColor;
uniform float uTime;
uniform float uOpacity;
varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec3 vWorld;
${FRESNEL}
void main(){
  float f = fresnel(vViewPos, vNormalV, 2.2);
  float band = 0.5 + 0.5 * sin(vWorld.y * 7.0 - uTime * 1.6);
  float sparkle = smoothstep(0.92, 1.0, band) * 0.25;
  vec3 col = uColor * (0.1 + sparkle) + uRimColor * f * 1.25;
  float a = (0.08 + f * 0.9 + sparkle * 0.3) * uOpacity;
  gl_FragColor = vec4(col, a);
}`;

/** Glassy vessel (map + ride): fresnel alpha, colour from a per-vertex oxygen attribute, travelling pulses. */
export const VESSEL_VERT = /* glsl */ `
attribute float aOxy;
varying vec3 vNormalV;
varying vec3 vViewPos;
varying float vOxy;
varying float vU;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = -mv.xyz;
  vNormalV = normalize(normalMatrix * normal);
  vOxy = aOxy;
  vU = uv.x;
  gl_Position = projectionMatrix * mv;
}`;

export const VESSEL_FRAG = /* glsl */ `
uniform vec3 uPoor;
uniform vec3 uRich;
uniform float uTime;
uniform float uLength;
uniform float uOpacity;
varying vec3 vNormalV;
varying vec3 vViewPos;
varying float vOxy;
varying float vU;
${FRESNEL}
void main(){
  float f = fresnel(vViewPos, vNormalV, 1.6);
  vec3 base = mix(uPoor, uRich, vOxy);
  float pulse = 0.5 + 0.5 * sin(vU * uLength * 1.6 - uTime * 5.0);
  pulse = pow(pulse, 6.0);
  vec3 col = base * (0.55 + 0.35 * f) + vec3(1.0, 0.9, 0.95) * f * 0.35 + base * pulse * 0.45;
  float a = (0.28 + f * 0.6 + pulse * 0.12) * uOpacity;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

/**
 * Flowing blood inside one side of the cut-away heart (atrium + ventricle share a cavity).
 * Colour, drifting streaks, a pulse when that chamber squeezes, and a per-chamber highlight glow.
 */
export const POOL_VERT = /* glsl */ `
varying vec2 vP;
void main(){
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const POOL_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uDeep;
uniform float uTime;
uniform float uSide;      // -1 right side (atrium towards -x), +1 left side
uniform float uChanX;     // outflow channel boundary
uniform float uWaist;     // atrium above this y
uniform float uGlowA;
uniform float uGlowV;
uniform float uPulseA;
uniform float uPulseV;
uniform float uDim;
varying vec2 vP;
${SIMPLEX_3D}
void main(){
  float atrium = step(uWaist, vP.y) * step(0.0, (vP.x - uChanX) * uSide);
  float n = snoise(vec3(vP * 3.0 + vec2(0.0, uTime * 0.35), uTime * 0.12));
  float s = snoise(vec3(vP * 7.5 + vec2(uTime * 0.25, uTime * 0.6), 1.7));
  float cells = smoothstep(0.55, 0.9, snoise(vec3(vP * 11.0 + vec2(0.0, uTime * 0.8), 3.1)));
  vec3 col = mix(uDeep, uColor, 0.55 + n * 0.25);
  col += uColor * cells * 0.25 + vec3(1.0) * smoothstep(0.6, 1.0, s) * 0.08;
  float pulse = mix(uPulseV, uPulseA, atrium);
  col *= 1.0 + pulse * 0.35;
  float glow = mix(uGlowV, uGlowA, atrium);
  col = mix(col, vec3(1.0, 0.96, 0.72), glow * (0.45 + 0.2 * sin(uTime * 7.0)));
  col *= uDim;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/**
 * Heart-shaped cartoon iris wipe, drawn in clip space over everything. uR = 1 open, 0 closed.
 * Uses Inigo Quilez's exact heart SDF.
 */
export const IRIS_VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const IRIS_FRAG = /* glsl */ `
uniform float uR;
uniform float uAspect;
uniform vec2 uCenter;
uniform vec3 uColor;
uniform vec3 uRim;
varying vec2 vUv;
float dot2(vec2 v){ return dot(v, v); }
float sdHeart(vec2 p){
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}
void main(){
  vec2 p = (vUv - uCenter);
  p.x *= uAspect;
  float r = max(uR, 0.0001) * 5.2;
  vec2 h = p / r + vec2(0.0, 0.52);
  float d = sdHeart(h) * r;
  float inside = 1.0 - smoothstep(-0.004, 0.004, d);
  float rim = smoothstep(0.03, 0.0, abs(d - 0.012)) * step(0.0005, uR);
  vec3 col = mix(uColor, uRim, rim);
  float a = max(1.0 - inside, rim);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;
