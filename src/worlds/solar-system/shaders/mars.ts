import { Vector3, type IUniform, type ShaderMaterial } from 'three';
import { BODY_VARYINGS, CRATERS, HASH, LIGHTING, NOISE, OUTPUT, bodyVertex, makeMaterial } from './common';

/** Object-space direction of a latitude/longitude on a body (longitude east-positive). */
export function latLonDir(latDeg: number, lonDeg: number, out = new Vector3()): Vector3 {
  const la = (latDeg * Math.PI) / 180;
  const lo = (lonDeg * Math.PI) / 180;
  return out.set(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo));
}

/** Olympus Mons (18.65°N, 226.2°E). */
export const OLYMPUS_DIR = latLonDir(18.65, 226.2 - 360);

/**
 * Mars: rusty iron-oxide dust, dark albedo markings, polar ice caps, a raised Olympus Mons (real vertex bump —
 * it shows on the limb) and the long scar of Valles Marineris.
 */
export function marsMaterial(time: IUniform<number>, oct: number, radius: number): ShaderMaterial {
  const displace = /* glsl */ `
    uniform vec3 uOM;
    uniform float uOMHeight;
    float displace(vec3 p){
      float c = dot(p, uOM);
      return uOMHeight * smoothstep(0.972, 0.999, c);
    }`;
  return makeMaterial({
    vertex: bodyVertex(displace),
    uniforms: { uTime: time, uOM: { value: OLYMPUS_DIR.clone() }, uOMHeight: { value: radius * 0.05 }, uRadius: { value: radius } },
    defines: { OCT: oct },
    fragment: /* glsl */ `
      uniform vec3 uOM;
      uniform float uRadius;
      ${BODY_VARYINGS}
      ${NOISE}
      ${HASH}
      ${CRATERS}
      ${LIGHTING}
      void main(){
        vec3 p = vObj;
        float n = fbm(p * 2.6, OCT);
        float n2 = fbm(p * 7.0 + 4.0, 3);
        vec3 rust = mix(srgb(vec3(0.73, 0.31, 0.15)), srgb(vec3(0.93, 0.56, 0.33)), smoothstep(-0.45, 0.55, n));
        float dark = smoothstep(0.02, 0.32, fbm(p * 1.5 + 7.0, 4));
        rust = mix(rust, srgb(vec3(0.42, 0.2, 0.12)), dark * 0.7);
        // Olympus Mons: a broad shield with a caldera
        float c = dot(p, uOM);
        float shield = smoothstep(0.972, 0.999, c);
        float caldera = smoothstep(0.9993, 0.9998, c);
        float scarp = smoothstep(0.966, 0.972, c) * (1.0 - smoothstep(0.972, 0.982, c));
        rust = mix(rust, srgb(vec3(0.9, 0.62, 0.42)), shield * 0.55);
        rust = mix(rust, srgb(vec3(0.4, 0.18, 0.1)), scarp * 0.45);
        rust = mix(rust, srgb(vec3(0.42, 0.2, 0.13)), caldera);
        // Valles Marineris: a long canyon just south of the equator, east of the Tharsis volcanoes
        float lat = asin(clamp(p.y, -1.0, 1.0));
        float lon = atan(-p.z, p.x);
        float span = smoothstep(-1.95, -1.75, lon) * (1.0 - smoothstep(-0.85, -0.7, lon));
        float canyon = (1.0 - smoothstep(0.0, 0.035 + 0.02 * n2, abs(lat + 0.14 + 0.03 * sin(lon * 5.0)))) * span;
        rust = mix(rust, srgb(vec3(0.36, 0.14, 0.08)), canyon * 0.9);
        // polar caps
        float capN = smoothstep(0.955, 0.972, p.y + n2 * 0.03);
        float capS = smoothstep(0.965, 0.98, -p.y + n2 * 0.03);
        vec3 albedo = mix(rust, srgb(vec3(0.95, 0.91, 0.87)), max(capN, capS));
        float h = craterField(p + 2.0, 7.0, 0.25) * 0.3 + n * 0.25 + shield * 1.6 - scarp * 0.4 - caldera * 0.8 - canyon * 0.6;
        vec3 N = bumpNormal(vWorldPos, normalize(vWorldNormal), h * uRadius * 0.03);
        vec3 L = normalize(-vWorldPos);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 col = shadeBody(albedo, N, L, V, srgb(vec3(1.0, 0.62, 0.45)), 0.7, 0.45);
        gl_FragColor = vec4(col, 1.0);
        ${OUTPUT}
      }`,
  });
}
