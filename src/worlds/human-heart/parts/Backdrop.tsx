import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BackSide, Color, DynamicDrawUsage, Object3D, Vector3, type InstancedMesh } from 'three';
import { mulberry32 } from '@/core/random';
import { glowTexture } from '@/engine/kit';
import { BACKDROP_FRAG, BACKDROP_VERT } from '../shaders/effects';
import { PALETTE } from './palette';

const fwd = new Vector3();

/**
 * Soft "inside the body" world: a warm glow behind whatever the camera looks at, fading to deep berry,
 * with slow drifting blobs. One big sphere, one draw call.
 */
export function Backdrop({ center = PALETTE.bgCenter, mid = PALETTE.bgMid, edge = PALETTE.bgEdge, calm = false }: { center?: string; mid?: string; edge?: string; calm?: boolean }) {
  const camera = useThree((s) => s.camera);
  const uniforms = useMemo(
    () => ({
      uCenter: { value: new Color(center) },
      uMid: { value: new Color(mid) },
      uEdge: { value: new Color(edge) },
      uForward: { value: new Vector3(0, 0, -1) },
      uTime: { value: 0 },
    }),
    // Created once; colours are kept in sync by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    uniforms.uCenter.value.set(center);
    uniforms.uMid.value.set(mid);
    uniforms.uEdge.value.set(edge);
  }, [uniforms, center, mid, edge]);

  useFrame((_, dt) => {
    camera.getWorldDirection(fwd);
    uniforms.uForward.value.copy(fwd);
    uniforms.uTime.value += dt * (calm ? 0.2 : 1);
  });

  return (
    <mesh scale={400} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[1, 32, 20]} />
      <shaderMaterial side={BackSide} depthWrite={false} uniforms={uniforms} vertexShader={BACKDROP_VERT} fragmentShader={BACKDROP_FRAG} />
    </mesh>
  );
}

/**
 * Out-of-focus blood cells and sparkles drifting through the scene — depth and life for every set.
 * Camera-facing glow quads in one instanced draw call; count scales with quality.
 */
export function Bokeh({ count, radius = 14, center = [0, 0, -4], seed = 3, calm = false }: { count: number; radius?: number; center?: [number, number, number]; seed?: number; calm?: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const camera = useThree((s) => s.camera);
  const data = useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: count }, () => ({
      x: (rand() * 2 - 1) * radius,
      y: (rand() * 2 - 1) * radius * 0.7,
      z: (rand() * 2 - 1) * radius * 0.6,
      s: 0.25 + Math.pow(rand(), 2) * 1.4,
      sp: 0.1 + rand() * 0.25,
      ph: rand() * Math.PI * 2,
      warm: rand(),
    }));
  }, [count, radius, seed]);
  const dummy = useMemo(() => new Object3D(), []);
  const time = useRef(0);
  const colors = useMemo(() => {
    const a = new Color('#ff7aa2');
    const b = new Color('#ffd6a8');
    const c = new Color('#ff3d6e');
    return data.map((d) => (d.warm < 0.45 ? a : d.warm < 0.75 ? c : b));
  }, [data]);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    time.current += dt * (calm ? 0.15 : 1);
    const t = time.current;
    for (let i = 0; i < data.length; i++) {
      const d = data[i] as (typeof data)[number];
      const y = ((d.y + t * d.sp + radius * 0.7) % (radius * 1.4)) - radius * 0.7;
      dummy.position.set(center[0] + d.x + Math.sin(t * 0.3 + d.ph) * 0.4, center[1] + y, center[2] + d.z);
      dummy.quaternion.copy(camera.quaternion);
      const pulse = 1 + Math.sin(t * 0.8 + d.ph) * 0.1;
      dummy.scale.setScalar(d.s * pulse);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={(el) => {
        mesh.current = el;
        if (el) {
          el.instanceMatrix.setUsage(DynamicDrawUsage);
          colors.forEach((c, i) => el.setColorAt(i, c));
          if (el.instanceColor) el.instanceColor.needsUpdate = true;
        }
      }}
      args={[undefined, undefined, data.length]}
      frustumCulled={false}
      renderOrder={-5}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={glowTexture()} transparent opacity={0.35} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </instancedMesh>
  );
}
