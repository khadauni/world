/** Small GLSL helpers shared by this world's procedural materials. */

/** Finish a ShaderMaterial the same way built-in materials do (tone mapping + sRGB output). */
export const COLOR_OUT = /* glsl */ `
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;

/** Standard world-space varyings for sphere-like objects. */
export const WORLD_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vW;
void main() {
  vUv = uv;
  vObj = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

/** Cheap 3D hash (Dave Hoskins). */
export const HASH33 = /* glsl */ `
vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
`;

/**
 * Crater height field: bowls with soft raised rims, searched over the 8 nearest cells.
 * Requires HASH33. Returns ~[-0.3, 0.1] per layer.
 */
export const CRATERS = /* glsl */ `
float craterShape(float d) {
  float rim = 0.35 * exp(-(d - 1.0) * (d - 1.0) / 0.03);
  return d < 1.0 ? (d * d - 1.0) * 0.9 + rim : rim;
}
float craters(vec3 p, float density) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 s = step(0.5, f) * 2.0 - 1.0;
  float h = 0.0;
  for (int k = 0; k < 8; k++) {
    float fk = float(k);
    vec3 o = vec3(mod(fk, 2.0), mod(floor(fk * 0.5), 2.0), floor(fk * 0.25)) * s;
    vec3 rnd = hash33(i + o + 17.0);
    if (rnd.z > density) continue;
    vec3 c = o + 0.25 + 0.5 * rnd;
    float r = 0.1 + 0.22 * rnd.x * rnd.y;
    float d = length(f - c) / r;
    if (d < 1.7) h += craterShape(d) * r;
  }
  return h;
}
`;

/** Derivative bump mapping: tilt a normal by the screen-space gradient of a height value. */
export const BUMP = /* glsl */ `
vec3 bumpNormal(vec3 n, vec3 pos, float h, float strength) {
  vec3 dpx = dFdx(pos);
  vec3 dpy = dFdy(pos);
  float dhx = dFdx(h);
  float dhy = dFdy(h);
  vec3 r1 = cross(dpy, n);
  vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  vec3 r = abs(det) * n - strength * grad;
  float len = length(r);
  // Guard against degenerate derivatives (silhouettes, tiny triangles) — never output NaN normals.
  return len > 1e-12 ? r / len : n;
}
`;
