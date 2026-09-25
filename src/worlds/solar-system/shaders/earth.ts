import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, type IUniform, type ShaderMaterial } from 'three';
import { BODY_VARYINGS, LIGHTING, NOISE, OUTPUT, makeMaterial } from './common';
import { drawLandMask } from './earthMap';

let landTexture: CanvasTexture | null = null;

/** The continent mask, drawn once per session from built-in outline data. */
export function earthLandTexture(): CanvasTexture {
  if (landTexture) return landTexture;
  const tex = new CanvasTexture(drawLandMask());
  tex.colorSpace = NoColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.anisotropy = 4;
  landTexture = tex;
  return tex;
}

/** Oceans, continents (with desert belts, forests and ice caps), a sun glint on the sea, and city lights at night. */
export function earthMaterial(time: IUniform<number>, oct: number): ShaderMaterial {
  return makeMaterial({
    uniforms: { uTime: time, uLand: { value: earthLandTexture() } },
    defines: { OCT: oct },
    fragment: /* glsl */ `
      uniform sampler2D uLand;
      ${BODY_VARYINGS}
      ${NOISE}
      ${LIGHTING}
      void main(){
        float n = fbm(vObj * 7.0, OCT);
        float land = texture2D(uLand, vUv).r;
        float m = smoothstep(0.42, 0.58, land + n * 0.16);
        float lat = abs(vObj.y);
        vec3 deep = srgb(vec3(0.06, 0.28, 0.72));
        vec3 shallow = srgb(vec3(0.12, 0.62, 0.86));
        vec3 ocean = mix(deep, shallow, smoothstep(0.12, 0.5, land + n * 0.12));
        vec3 green = mix(srgb(vec3(0.24, 0.62, 0.26)), srgb(vec3(0.44, 0.7, 0.3)), n * 0.5 + 0.5);
        vec3 desert = srgb(vec3(0.9, 0.76, 0.5));
        float dry = smoothstep(0.2, 0.32, lat) * (1.0 - smoothstep(0.5, 0.62, lat));
        dry *= smoothstep(-0.15, 0.25, fbm(vObj * 3.0 + 9.0, 3));
        vec3 landCol = mix(green, desert, dry);
        landCol = mix(landCol, srgb(vec3(0.3, 0.46, 0.3)), smoothstep(0.72, 0.82, lat));
        float ice = smoothstep(0.86, 0.9, lat + n * 0.04);
        vec3 albedo = mix(ocean, landCol, m);
        albedo = mix(albedo, srgb(vec3(0.95, 0.97, 1.0)), ice);
        vec3 N = normalize(vWorldNormal);
        vec3 L = normalize(-vWorldPos);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 col = shadeBody(albedo, N, L, V, srgb(vec3(0.45, 0.75, 1.0)), 1.15, 0.35);
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 70.0) * (1.0 - m) * (1.0 - ice);
        col += srgb(vec3(1.0, 0.95, 0.85)) * spec * 0.55;
        float nightMask = smoothstep(0.02, -0.25, dot(N, L));
        float cities = smoothstep(0.62, 0.86, snoise(vObj * 46.0)) * m * (1.0 - ice) * (1.0 - dry * 0.8);
        col += srgb(vec3(1.0, 0.78, 0.4)) * cities * nightMask * 0.8;
        gl_FragColor = vec4(col, 1.0);
        ${OUTPUT}
      }`,
  });
}

/** Soft, drifting cloud shell (transparent). */
export function cloudMaterial(time: IUniform<number>, oct: number): ShaderMaterial {
  return makeMaterial({
    uniforms: { uTime: time },
    defines: { OCT: oct },
    transparent: true,
    depthWrite: false,
    fragment: /* glsl */ `
      uniform float uTime;
      ${BODY_VARYINGS}
      ${NOISE}
      ${LIGHTING}
      void main(){
        float a = uTime * 0.012;
        vec3 p = vObj;
        vec3 q = vec3(p.x * cos(a) - p.z * sin(a), p.y, p.x * sin(a) + p.z * cos(a));
        float c = fbm(q * vec3(2.4, 4.2, 2.4) + vec3(0.0, 0.0, uTime * 0.004), OCT);
        float bands = 0.5 + 0.5 * cos(p.y * 9.0);
        float alpha = smoothstep(0.02, 0.42, c + 0.18 * bands - 0.1) * 0.85;
        vec3 N = normalize(vWorldNormal);
        vec3 L = normalize(-vWorldPos);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 col = shadeBody(vec3(1.0), N, L, V, vec3(0.7, 0.85, 1.0), 0.4, 0.6);
        float day = smoothstep(-0.2, 0.3, dot(N, L));
        gl_FragColor = vec4(col, alpha * (0.35 + 0.65 * day));
        ${OUTPUT}
      }`,
  });
}
