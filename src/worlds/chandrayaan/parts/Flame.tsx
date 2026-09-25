import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { AdditiveBlending, Color, DoubleSide, type Group, type ShaderMaterial } from 'three';
import { Glow } from '@/engine/kit';
import { FLAME_FRAG, FLAME_VERT } from '../shaders/effects';

/**
 * Engine plume: a flickering additive cone (pointing down its local −Y) plus a soft glow at the nozzle.
 * `power` (0..1+) is read from a ref every frame so thrust can change without React renders.
 */
export function Flame({
  power,
  length = 1,
  radius = 0.2,
  hot = '#fff3b0',
  cool = '#ff6a1a',
  glow = '#ffb14a',
  glowScale = 1.4,
  position,
  rotation,
}: {
  power: RefObject<number>;
  length?: number;
  radius?: number;
  hot?: string;
  cool?: string;
  glow?: string;
  glowScale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const group = useRef<Group>(null);
  const cone = useRef<Group>(null);
  const halo = useRef<Group>(null);
  const mat = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPower: { value: 0 }, uHot: { value: new Color(hot) }, uCool: { value: new Color(cool) } }),
    [hot, cool],
  );

  useFrame((_, dt) => {
    const p = Math.max(0, power.current ?? 0);
    if (group.current) group.current.visible = p > 0.01;
    if (!mat.current) return;
    (mat.current.uniforms.uTime as { value: number }).value += dt;
    (mat.current.uniforms.uPower as { value: number }).value = Math.min(1, p);
    const flicker = 1 + Math.sin(performance.now() * 0.05) * 0.06;
    if (cone.current) cone.current.scale.set(0.8 + 0.2 * p, (0.4 + 0.6 * Math.min(1.4, p)) * flicker, 0.8 + 0.2 * p);
    if (halo.current) halo.current.scale.setScalar(0.5 + 0.5 * Math.min(1.2, p));
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
      <group ref={cone}>
        <mesh position={[0, -length / 2, 0]} renderOrder={7}>
          <cylinderGeometry args={[radius, radius * 0.12, length, 20, 6, true]} />
          <shaderMaterial
            ref={mat}
            vertexShader={FLAME_VERT}
            fragmentShader={FLAME_FRAG}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      </group>
      <group ref={halo}>
        <Glow color={glow} scale={radius * 7 * glowScale} opacity={0.9} position={[0, -radius * 0.6, 0]} />
      </group>
    </group>
  );
}
