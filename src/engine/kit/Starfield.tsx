import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type ShaderMaterial } from 'three';
import { mulberry32 } from '@/core/random';

/** Twinkling star shell drawn as GPU points (one draw call). `count` is scaled by the caller's quality. */
export function Starfield({ count = 4000, radius = 600, depth = 300, seed = 7, twinkle = true }: { count?: number; radius?: number; depth?: number; seed?: number; twinkle?: boolean }) {
  const mat = useRef<ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const rand = mulberry32(seed);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const palette = [new Color('#ffffff'), new Color('#cfe0ff'), new Color('#fff1c9'), new Color('#ffd6e7')];
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const t = rand() * Math.PI * 2;
      const r = radius + rand() * depth;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(t);
      pos[i * 3 + 1] = r * u;
      pos[i * 3 + 2] = r * s * Math.sin(t);
      const c = palette[Math.floor(rand() * palette.length)] as Color;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      size[i] = 0.6 + Math.pow(rand(), 6) * 3.2;
      phase[i] = rand() * Math.PI * 2;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('color', new BufferAttribute(col, 3));
    g.setAttribute('aSize', new BufferAttribute(size, 1));
    g.setAttribute('aPhase', new BufferAttribute(phase, 1));
    return g;
  }, [count, radius, depth, seed]);

  useFrame((_, dt) => {
    if (mat.current?.uniforms.uTime && twinkle) mat.current.uniforms.uTime.value += dt;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        vertexColors
        uniforms={{ uTime: { value: 0 }, uPixelRatio: { value: Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio : 1) } }}
        vertexShader={/* glsl */ `
          attribute float aSize; attribute float aPhase;
          uniform float uTime; uniform float uPixelRatio;
          varying vec3 vColor; varying float vTw;
          void main(){
            vColor = color;
            vTw = 0.65 + 0.35 * sin(uTime * 1.6 + aPhase);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = aSize * uPixelRatio * 2.2;
          }`}
        fragmentShader={/* glsl */ `
          varying vec3 vColor; varying float vTw;
          void main(){
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            float a = smoothstep(0.5, 0.0, d);
            a = a * a;
            gl_FragColor = vec4(vColor * vTw, a * vTw);
          }`}
      />
    </points>
  );
}
