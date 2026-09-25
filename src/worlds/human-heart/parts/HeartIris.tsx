import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { Color, Vector2, type Mesh } from 'three';
import { hudShiftPx } from '../logic/camera';
import { IRIS_FRAG, IRIS_VERT } from '../shaders/effects';
import { live } from '../store';
import { PALETTE } from './palette';

/**
 * Heart-shaped cartoon iris wipe between sets (like the end of an old animated short — with a heart).
 * `radius` 1 = fully open, 0 = closed. Drawn in clip space over everything; hidden when open.
 */
export function HeartIris({ radius }: { radius: RefObject<number> }) {
  const mesh = useRef<Mesh>(null);
  const size = useThree((s) => s.size);
  const uniforms = useMemo(
    () => ({
      uR: { value: 1.2 },
      uAspect: { value: 1 },
      uCenter: { value: new Vector2(0, 0) },
      uColor: { value: new Color(PALETTE.bgEdge) },
      uRim: { value: new Color('#ff8fb1') },
    }),
    [],
  );

  useFrame(() => {
    const r = radius.current ?? 1.2;
    if (mesh.current) mesh.current.visible = r < 1.05;
    const x = Math.min(1, Math.max(0, r));
    uniforms.uR.value = x * x * (3 - 2 * x) * 1.1 - 0.02;
    uniforms.uAspect.value = size.width / Math.max(1, size.height);
    uniforms.uCenter.value.set(0, (2 * hudShiftPx(size.height, live.hudTop, live.hudBottom)) / Math.max(1, size.height));
  });

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={1000} visible={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial vertexShader={IRIS_VERT} fragmentShader={IRIS_FRAG} uniforms={uniforms} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
