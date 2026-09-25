import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { Color, type Mesh, type ShaderMaterial } from 'three';
import { hudShiftPx } from '../logic/camera';
import { live } from '../store';
import { IRIS_FRAG, IRIS_VERT } from '../shaders/effects';

/**
 * Full-screen cartoon iris wipe (like the end of an old animated short). `radius` 1 = fully open,
 * 0 = closed. Drawn in clip space on top of everything; hidden entirely when open.
 */
export function Iris({ radius }: { radius: RefObject<number> }) {
  const mesh = useRef<Mesh>(null);
  const mat = useRef<ShaderMaterial>(null);
  const size = useThree((s) => s.size);
  const uniforms = useMemo(
    () => ({
      uR: { value: 1.2 },
      uAspect: { value: 1 },
      uCenter: { value: [0, 0] as [number, number] },
      uColor: { value: new Color('#0b0f2e') },
      uRim: { value: new Color('#ffb347') },
    }),
    [],
  );

  useFrame(() => {
    const r = radius.current ?? 1.2;
    if (mesh.current) mesh.current.visible = r < 1.05;
    if (!mat.current) return;
    const u = mat.current.uniforms;
    // Ease in/out so the circle snaps shut with a little cartoon "pop".
    const x = Math.min(1, Math.max(0, r));
    (u.uR as { value: number }).value = x * x * (3 - 2 * x) * 1.05 - 0.02;
    (u.uAspect as { value: number }).value = size.width / Math.max(1, size.height);
    (u.uCenter as { value: [number, number] }).value = [0, (2 * hudShiftPx(size.height, live.hudTop, live.hudBottom)) / Math.max(1, size.height)];
  });

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={1000}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={IRIS_VERT}
        fragmentShader={IRIS_FRAG}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
