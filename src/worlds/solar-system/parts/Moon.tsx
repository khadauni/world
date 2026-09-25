import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3, type Group, type Mesh } from 'three';
import type { QualityProfile } from '@/core/types';
import { octaves } from '../shaders/common';
import { rockyMaterial, type RockyLook } from '../shaders/rocky';
import { moonSlot, useSolar } from '../state';
import { useDisposable, useSphere } from './hooks';

const tmp = new Vector3();

/**
 * A small moon on a circular orbit around its parent (in the parent's local frame). Its world position is
 * published to `sys.moons[id]` so tasks can find it. `lumpy` squashes it into a potato (Phobos, Deimos).
 */
export function Moon({
  id,
  look,
  radius,
  orbit,
  period,
  phase = 0,
  incline = 0,
  lumpy = false,
  quality,
}: {
  id: string;
  look: RockyLook;
  radius: number;
  orbit: number;
  period: number;
  phase?: number;
  incline?: number;
  lumpy?: boolean;
  quality: QualityProfile;
}) {
  const sys = useSolar();
  const pivot = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const sphere = useSphere(28, quality.detail);
  const mat = useDisposable(() => rockyMaterial(sys.time, look, octaves(quality.detail, 3), 1), [sys.time, look, quality.detail]);
  const slot = moonSlot(sys, id);
  if (sys.moonAngles[id] === undefined) sys.moonAngles[id] = phase;

  useFrame((_, dt) => {
    const a = (sys.moonAngles[id] ?? phase) + (Math.min(dt, 0.1) * Math.PI * 2 * sys.moonSpeed) / period;
    sys.moonAngles[id] = a;
    const m = body.current;
    if (!m) return;
    m.position.set(Math.cos(a) * orbit, 0, -Math.sin(a) * orbit);
    // Tidally locked: always shows the same face to its planet.
    m.rotation.y = a + Math.PI;
    m.getWorldPosition(tmp);
    slot.copy(tmp);
  });

  return (
    <group ref={pivot} rotation={[incline, 0, 0]}>
      <mesh ref={body} geometry={sphere} material={mat} scale={lumpy ? [radius * 1.25, radius * 0.85, radius] : radius} />
    </group>
  );
}
