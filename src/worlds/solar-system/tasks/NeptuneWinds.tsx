import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { AdditiveBlending, MeshBasicMaterial, PlaneGeometry, Vector3, type Group, type MeshStandardMaterial } from 'three';
import { mulberry32 } from '@/core/random';
import { Glow, Tappable, glowTexture } from '@/engine/kit';
import { useDisposable } from '../parts/hooks';
import { puffGeometry } from '../parts/shapes';
import { Halo, StageGroup, popScale, type TaskProps } from './common';
import { spreadPhases } from './geometry';
import { assistSpeed, tuningFor } from './rules';
import { useTaskKit } from './useTaskKit';

const at = new Vector3();

/** Neptune: white wind clouds race around the planet — catch them! (slower for little ones). */
export function NeptuneWinds({ band, actions, reducedMotion }: TaskProps) {
  const t = tuningFor('catch-winds', band);
  const kit = useTaskKit('catch-winds', band, actions, t.count);
  const clouds = useMemo(() => {
    const rand = mulberry32(64);
    return spreadPhases(t.count, 9).map((phase, i) => ({
      phase,
      radius: 1.28 + (i % 3) * 0.13,
      tilt: (rand() - 0.5) * 0.9,
      speed: 0.85 + rand() * 0.5,
      dir: i % 3 === 2 ? -1 : 1,
    }));
  }, [t.count]);
  const [got, setGot] = useState<readonly boolean[]>(() => clouds.map(() => false));
  const gotAt = useRef<number[]>(clouds.map(() => -1));
  const angles = useRef<number[]>(clouds.map((c) => c.phase));
  const refs = useRef<(Group | null)[]>([]);
  const mats = useRef<(MeshStandardMaterial | null)[]>([]);
  const puff = useDisposable(puffGeometry, []);
  const streak = useDisposable(() => new PlaneGeometry(1, 1), []);
  const streakMat = useDisposable(
    () => new MeshBasicMaterial({ map: glowTexture(), color: '#bcd8ff', transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    [],
  );
  const clock = useRef(0);
  const next = got.findIndex((g) => !g);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    clock.current += dt;
    const mul = t.speed * assistSpeed(kit.helpingRef.current) * (reducedMotion ? 0.45 : 1);
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      if (c === undefined) continue;
      const g = refs.current[i];
      if (!g) continue;
      const since = (gotAt.current[i] ?? -1) < 0 ? 0 : clock.current - (gotAt.current[i] ?? 0);
      if (since === 0) angles.current[i] = (angles.current[i] ?? 0) + dt * c.speed * c.dir * mul;
      const a = angles.current[i] ?? 0;
      // Orbits sit mostly in the screen plane (tilted a little), in front of the planet.
      const x = Math.cos(a) * c.radius;
      const y = Math.sin(a) * c.radius;
      g.position.set(x, y * Math.cos(c.tilt), 0.45 + y * Math.sin(c.tilt) * 0.3);
      g.rotation.z = a + (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      g.scale.setScalar(t.size * (since > 0 ? popScale(since) : 1));
      g.visible = since === 0 || since < 0.45;
      const m = mats.current[i];
      if (m) m.emissiveIntensity = kit.helpingRef.current && i === next ? 0.9 + 0.3 * Math.sin(clock.current * 6) : 0.45;
    }
  });

  return (
    <StageGroup onMiss={() => kit.miss()}>
      {clouds.map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
        >
          <Tappable
            hitRadius={0.3}
            disabled={got[i]}
            hoverScale={1.15}
            onTap={() => {
              if (got[i]) return;
              gotAt.current[i] = clock.current;
              setGot((prev) => prev.map((v, j) => (j === i ? true : v)));
              refs.current[i]?.getWorldPosition(at);
              kit.hit(at, { color: '#e8f3ff', sound: 'pop' });
            }}
          >
            <mesh geometry={puff} scale={[0.17, 0.1, 0.09]}>
              <meshStandardMaterial
                ref={(m) => {
                  mats.current[i] = m;
                }}
                color="#ffffff"
                emissive="#bcd6ff"
                emissiveIntensity={0.45}
                roughness={0.85}
              />
            </mesh>
            <mesh geometry={streak} material={streakMat} position={[-0.22, 0, -0.03]} scale={[0.42, 0.09, 1]} />
            <Glow color="#cfe2ff" scale={0.34} opacity={0.4} />
            {kit.helping && i === next && <Halo size={0.55} color="#ffffff" strong />}
          </Tappable>
        </group>
      ))}
    </StageGroup>
  );
}
