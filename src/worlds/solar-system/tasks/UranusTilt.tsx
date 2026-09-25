import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Quaternion, Vector3, type Group } from 'three';
import { Glow, Tappable } from '@/engine/kit';
import { BODIES, tiltAxis } from '../layout';
import { useSolar } from '../state';
import { useTiltStore } from '../tiltStore';
import type { TaskProps } from './common';
import { tiltConfig, URANUS_TILT } from './rules';

const axis = new Vector3();
const q = new Quaternion();
const Y = new Vector3(0, 1, 0);
const pole = new Vector3();

/**
 * Uranus (scene side): the planet springs to whatever tilt the overlay buttons set, a glowing rod shows its
 * spin axis, and a ghost rod shows the goal (~98°). Tapping the planet tilts it too.
 */
export function UranusTilt({ band, reducedMotion }: TaskProps) {
  const sys = useSolar();
  const R = BODIES.uranus.radius;
  const rod = useRef<Group>(null);
  const ghost = useRef<Group>(null);
  const hit = useRef<Group>(null);
  const spring = useRef({ v: 0, nonce: 0 });

  useEffect(
    () => () => {
      sys.uranusTilt = BODIES.uranus.tilt * (180 / Math.PI);
    },
    [sys],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const st = useTiltStore.getState();
    const s = spring.current;
    if (reducedMotion) {
      sys.uranusTilt = st.angle;
      s.v = 0;
    } else {
      // Bouncy spring: overshoots a little, then settles — squash-and-stretch for planets.
      const acc = (st.angle - sys.uranusTilt) * 55 - s.v * 8.5;
      s.v += acc * dt;
      sys.uranusTilt += s.v * dt;
    }
    const pos = sys.positions.uranus;
    tiltAxis('uranus', pos, axis);
    if (rod.current) {
      rod.current.position.copy(pos);
      rod.current.quaternion.setFromAxisAngle(axis, (sys.uranusTilt * Math.PI) / 180);
    }
    if (ghost.current) {
      ghost.current.position.copy(pos);
      ghost.current.quaternion.setFromAxisAngle(axis, (URANUS_TILT * Math.PI) / 180);
    }
    hit.current?.position.copy(pos);
    if (st.nonce !== s.nonce) {
      s.nonce = st.nonce;
      q.setFromAxisAngle(axis, (st.angle * Math.PI) / 180);
      pole.copy(Y).applyQuaternion(q).multiplyScalar(R * 1.7).add(pos);
      sys.burst(pole, st.solved ? '#ffe27a' : '#9ff5ff', st.solved ? 70 : 18, R * 1.2, R * 0.9);
    }
  });

  const first = tiltConfig(band).buttons[0];
  return (
    <>
      <group ref={ghost}>
        <mesh>
          <cylinderGeometry args={[R * 0.03, R * 0.03, R * 3.6, 10, 1]} />
          <meshBasicMaterial color="#ffe27a" transparent opacity={0.35} toneMapped={false} depthWrite={false} />
        </mesh>
        <Glow color="#ffe27a" scale={R * 0.6} opacity={0.7} position={[0, R * 1.8, 0]} />
      </group>
      <group ref={rod}>
        <mesh>
          <cylinderGeometry args={[R * 0.045, R * 0.045, R * 3.3, 12, 1]} />
          <meshBasicMaterial color="#9ff5ff" toneMapped={false} />
        </mesh>
        <mesh position={[0, R * 1.68, 0]}>
          <sphereGeometry args={[R * 0.1, 16, 12]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <Glow color="#9ff5ff" scale={R * 0.7} opacity={0.9} position={[0, R * 1.68, 0]} />
      </group>
      <group ref={hit}>
        <Tappable
          hitRadius={R * 1.25}
          hoverScale={1.04}
          onTap={() => {
            if (first) useTiltStore.getState().tilt(first.delta, tiltConfig(band));
          }}
        >
          <group />
        </Tappable>
      </group>
    </>
  );
}
