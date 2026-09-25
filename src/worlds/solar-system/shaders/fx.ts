import { AdditiveBlending, BackSide, Color, DoubleSide, ShaderMaterial, type IUniform } from 'three';
import { NOISE, OUTPUT, makeMaterial } from './common';

/**
 * Atmosphere halo: rendered on the back faces of a slightly larger shell. Brightness comes from how close the
 * view ray passes to the planet's limb, and fades on the night side — a soft, glowing silhouette.
 */
export function atmosphereMaterial(color: string, radius: number, thickness: number, intensity: number): ShaderMaterial {
  return makeMaterial({
    uniforms: { uColor: { value: new Color(color) }, uRadius: { value: radius }, uThickness: { value: thickness }, uIntensity: { value: intensity } },
    transparent: true,
    depthWrite: false,
    additive: true,
    side: BackSide,
    vertex: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vCenter;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragment: /* glsl */ `
      uniform vec3 uColor;
      uniform float uRadius;
      uniform float uThickness;
      uniform float uIntensity;
      varying vec3 vWorldPos;
      varying vec3 vCenter;
      void main(){
        vec3 rd = normalize(vWorldPos - cameraPosition);
        vec3 oc = vCenter - cameraPosition;
        float tca = dot(oc, rd);
        vec3 closest = cameraPosition + rd * tca;
        float b = length(closest - vCenter) / uRadius;
        float x = clamp((b - 1.0) / uThickness, 0.0, 1.0);
        float glow = pow(1.0 - x, 2.6) * smoothstep(0.96, 1.0, b);
        vec3 n = normalize(closest - vCenter);
        vec3 L = normalize(-vCenter);
        float lit = smoothstep(-0.45, 0.5, dot(n, L));
        gl_FragColor = vec4(uColor * glow * uIntensity * (0.12 + 0.88 * lit), 1.0);
        ${OUTPUT}
      }`,
  });
}

/** Soft glowing orbit line on a flat ring mesh (in the XY plane of the geometry). */
export function orbitMaterial(): ShaderMaterial {
  return makeMaterial({
    uniforms: { uColor: { value: new Color('#8fa8ff') }, uOpacity: { value: 0.25 }, uInner: { value: 0 }, uOuter: { value: 1 } },
    transparent: true,
    depthWrite: false,
    additive: true,
    side: DoubleSide,
    vertex: /* glsl */ `
      varying float vR;
      void main(){ vR = length(position.xy); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uInner;
      uniform float uOuter;
      varying float vR;
      void main(){
        float mid = (uInner + uOuter) * 0.5;
        float half_ = (uOuter - uInner) * 0.5;
        float d = abs(vR - mid) / half_;
        float a = pow(1.0 - clamp(d, 0.0, 1.0), 2.2);
        gl_FragColor = vec4(uColor * a * uOpacity, 1.0);
        ${OUTPUT}
      }`,
  });
}

/**
 * Faint painterly nebula, rendered ONCE into an equirectangular texture (see Backdrop) so deep space never
 * looks flat black but costs just a texture lookup per pixel afterwards.
 */
export function nebulaBakeMaterial(oct: number): ShaderMaterial {
  return makeMaterial({
    uniforms: {},
    defines: { OCT: oct },
    depthWrite: false,
    vertex: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragment: /* glsl */ `
      varying vec2 vUv;
      ${NOISE}
      void main(){
        float lon = (vUv.x - 0.5) * 6.2831853;
        float lat = (vUv.y - 0.5) * 3.1415926;
        vec3 d = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
        float n = fbm(d * 2.2 + vec3(3.0), OCT) * 0.5 + 0.5;
        float m = fbm(d * 4.0 + vec3(9.0, 1.0, 4.0), OCT) * 0.5 + 0.5;
        float band = exp(-pow(d.y * 2.6 + 0.4 * d.x, 2.0));
        vec3 col = vec3(0.012, 0.014, 0.04);
        col += vec3(0.14, 0.045, 0.2) * smoothstep(0.45, 0.85, n) * (0.4 + 0.6 * band);
        col += vec3(0.02, 0.085, 0.14) * smoothstep(0.5, 0.9, m) * 0.9;
        col += vec3(0.2, 0.045, 0.09) * smoothstep(0.62, 0.95, n * m * 1.6) * band;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

/** Rocket flame: white-hot core to orange tip, flickering. Geometry: a cone along -Y, v = 0 at the nozzle. */
export function flameMaterial(time: IUniform<number>, throttle: IUniform<number>): ShaderMaterial {
  return makeMaterial({
    uniforms: { uTime: time, uThrottle: throttle },
    transparent: true,
    depthWrite: false,
    additive: true,
    side: DoubleSide,
    vertex: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vPos;
      void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: /* glsl */ `
      uniform float uTime;
      uniform float uThrottle;
      varying vec2 vUv;
      varying vec3 vPos;
      ${NOISE}
      void main(){
        float along = clamp(vUv.y, 0.0, 1.0);
        float flick = snoise(vec3(vPos.x * 6.0, vPos.y * 5.0 + uTime * 14.0, vPos.z * 6.0)) * 0.5 + 0.5;
        vec3 core = vec3(1.0, 0.98, 0.85);
        vec3 mid = vec3(1.0, 0.72, 0.18);
        vec3 tip = vec3(1.0, 0.28, 0.12);
        vec3 col = mix(core, mid, smoothstep(0.0, 0.35, along));
        col = mix(col, tip, smoothstep(0.35, 0.9, along));
        float a = (1.0 - smoothstep(0.55, 1.0, along + flick * 0.25)) * (0.6 + 0.4 * flick);
        gl_FragColor = vec4(col * a * (0.6 + 0.6 * uThrottle), 1.0);
        ${OUTPUT}
      }`,
  });
}

/**
 * Sparkle points (trail + bursts): per-point colour, size and life; soft round core with a 4-point twinkle.
 * `size` is in world units, attenuated with distance.
 */
export function sparkleMaterial(pixelRatio: number): ShaderMaterial {
  const m = new ShaderMaterial({
    uniforms: { uScale: { value: 420 * pixelRatio } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexColors: true,
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aLife;
      uniform float uScale;
      varying vec3 vColor;
      varying float vLife;
      void main(){
        vColor = color;
        vLife = aLife;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aLife <= 0.0 ? 0.0 : aSize * uScale / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vLife;
      void main(){
        if (vLife <= 0.0) discard;
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float core = smoothstep(0.5, 0.0, d);
        float star = max(0.0, 1.0 - abs(c.x * c.y) * 60.0) * smoothstep(0.5, 0.1, d);
        float a = (core * core + star * 0.6) * clamp(vLife, 0.0, 1.0);
        gl_FragColor = vec4(vColor * a, 1.0);
        ${OUTPUT}
      }`,
  });
  return m;
}

/** Camera-facing ring used for map hotspots and target highlights: a soft band with rotating dashes. */
export function haloMaterial(time: IUniform<number>): ShaderMaterial {
  return makeMaterial({
    uniforms: { uTime: time, uColor: { value: new Color('#ffffff') }, uOpacity: { value: 1 }, uDashes: { value: 0 }, uPulse: { value: 0 } },
    transparent: true,
    depthWrite: false,
    additive: true,
    side: DoubleSide,
    vertex: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uDashes;
      uniform float uPulse;
      varying vec2 vUv;
      void main(){
        vec2 c = vUv * 2.0 - 1.0;
        float r = length(c);
        float ring = exp(-pow((r - 0.78) * 9.0, 2.0));
        float glow = exp(-pow((r - 0.78) * 3.2, 2.0)) * 0.35;
        float a = atan(c.y, c.x);
        float dash = uDashes > 0.0 ? step(0.0, sin(a * uDashes + uTime * 1.6)) * 0.7 + 0.3 : 1.0;
        float pulse = 1.0 + uPulse * 0.35 * sin(uTime * 4.0);
        float v = (ring * dash + glow) * pulse * (1.0 - smoothstep(0.92, 1.0, r));
        gl_FragColor = vec4(uColor * v * uOpacity, 1.0);
        ${OUTPUT}
      }`,
  });
}

/** Hurricane decal: a spiral of cloud bands around a clear eye (for Earth's senior task). */
export function hurricaneMaterial(time: IUniform<number>): ShaderMaterial {
  return makeMaterial({
    uniforms: { uTime: time, uFound: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertex: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: /* glsl */ `
      uniform float uTime;
      uniform float uFound;
      varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 c = vUv * 2.0 - 1.0;
        float r = length(c);
        float a = atan(c.y, c.x);
        float spiral = sin(a * 2.0 + log(max(r, 0.02)) * 7.0 - uTime * 2.2);
        float n = snoise(vec3(c * 3.0, uTime * 0.2)) * 0.5 + 0.5;
        float arms = smoothstep(-0.2, 0.8, spiral) * (0.7 + 0.3 * n);
        float eye = smoothstep(0.06, 0.16, r);
        float edge = 1.0 - smoothstep(0.55, 1.0, r);
        float alpha = clamp(arms * edge * eye + (1.0 - smoothstep(0.16, 0.3, r)) * eye * 0.8, 0.0, 1.0) * 0.95;
        vec3 col = mix(vec3(1.0), vec3(0.75, 1.0, 0.8), uFound * 0.5);
        gl_FragColor = vec4(col, alpha);
        ${OUTPUT}
      }`,
  });
}
