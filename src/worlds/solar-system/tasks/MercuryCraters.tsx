import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Quaternion, Vector3, type Group, type MeshBasicMaterial } from 'three';
import { Glow, Tappable } from '@/engine/kit';
import { Halo, StageGroup, type TaskProps } from './common';
import { capPoints } from './geometry';
import { tuningFor } from './rules';
import { useTaskKit } from './useTaskKit';

const Z = new Vector3(0, 0, 1);
const at = new Vector3();

/** Mercury: glowing craters dot the surface — tap each one to scan it. */
export function MercuryCraters({ band, actions, reducedMotion }: TaskProps) {
  const t = tuningFor('tap-craters', band);
  const kit = useTaskKit('tap-craters', band, actions, t.count);
  const craters = useMemo(
    () =>
      capPoints(t.count, band === 'senior' ? 0.95 : 0.8, 7).map((dir) => ({
        pos: dir.clone().multiplyScalar(1.004),
        quat: new Quaternion().setFromUnitVectors(Z, dir),
      })),
    [t.count, band],
  );
  const [got, setGot] = useState<readonly boolean[]>(() => craters.map(() => false));
  const rims = useRef<(MeshBasicMaterial | null)[]>([]);
  const groups = useRef<(Group | null)[]>([]);
  const clock = useRef(0);
  const next = got.findIndex((g) => !g);

  useFrame((_, dt) => {
    clock.current += dt;
    for (let i = 0; i < rims.current.length; i++) {
      const m = rims.current[i];
      if (m === undefined) continue;
      if (!m) continue;
      const pulse = reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(clock.current * 4 + i * 1.3);
      m.opacity = got[i] ? 1 : pulse;
    }
  });

  const size = 0.2 * t.size;
  return (
    <StageGroup onMiss={() => kit.miss()}>
      {craters.map((c, i) => (
        <group
          key={i}
          position={c.pos}
          quaternion={c.quat}
          ref={(g) => {
            groups.current[i] = g;
          }}
        >
          <Tappable
            hitRadius={size * 1.25}
            disabled={got[i]}
            hoverScale={1.15}
            onTap={() => {
              if (got[i]) return;
              setGot((prev) => prev.map((v, j) => (j === i ? true : v)));
              groups.current[i]?.getWorldPosition(at);
              kit.hit(at, { color: '#9ff0ff' });
            }}
          >
            <mesh>
              <torusGeometry args={[size, size * 0.1, 10, 48]} />
              <meshBasicMaterial
                ref={(m) => {
                  rims.current[i] = m;
                }}
                color={got[i] ? '#ffd35a' : '#7ff3ff'}
                transparent
                toneMapped={false}
              />
            </mesh>
            <Glow color={got[i] ? '#ffd35a' : '#6ff0ff'} scale={size * 3} opacity={got[i] ? 0.85 : 0.6} />
            {got[i] && (
              <mesh position={[0, 0, size * 0.3]}>
                <circleGeometry args={[size * 0.35, 5]} />
                <meshBasicMaterial color="#fff7d0" toneMapped={false} />
              </mesh>
            )}
            {kit.helping && i === next && <Halo size={size * 4.2} color="#ffffff" strong />}
          </Tappable>
        </group>
      ))}
    </StageGroup>
  );
}
