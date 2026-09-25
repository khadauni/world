import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { AdditiveBlending, type Mesh, type MeshBasicMaterial } from 'three';
import { beat } from '../store';

/**
 * Soft rings that ripple out from a point on every heartbeat — "feel the thump".
 * Three recycled camera-facing rings; nothing allocated per frame.
 */
export function Ripples({ position, color = '#ff9fc0', size = 1, enabled = true, reducedMotion = false }: { position: [number, number, number]; color?: string; size?: number; enabled?: boolean; reducedMotion?: boolean }) {
  const rings = useRef<(Mesh | null)[]>([]);
  const ages = useRef([9, 9, 9]);
  const next = useRef(0);
  const camera = useThree((s) => s.camera);

  useFrame((_, dt) => {
    if (enabled && beat.lub) {
      ages.current[next.current] = 0;
      next.current = (next.current + 1) % ages.current.length;
    }
    for (let i = 0; i < rings.current.length; i++) {
      const r = rings.current[i];
      if (!r) continue;
      const age = (ages.current[i] = (ages.current[i] ?? 9) + dt);
      const life = reducedMotion ? 0.6 : 1.2;
      if (age > life) {
        r.visible = false;
        continue;
      }
      r.visible = true;
      const k = age / life;
      r.quaternion.copy(camera.quaternion);
      r.scale.setScalar(size * (0.4 + (reducedMotion ? 0.3 : 1.1) * k));
      (r.material as MeshBasicMaterial).opacity = (1 - k) * 0.7;
    }
  });

  return (
    <group position={position}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          visible={false}
          renderOrder={6}
          ref={(el) => {
            rings.current[i] = el;
          }}
        >
          <ringGeometry args={[0.9, 1, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
