import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Vector3, type Group } from 'three';
import { Glow, Tappable } from '@/engine/kit';
import { useDisposable } from '../parts/hooks';
import { puffyStar } from '../parts/shapes';
import { Halo, StageGroup, popScale, type TaskProps } from './common';
import { spreadPhases } from './geometry';
import { assistSpeed, tuningFor } from './rules';
import { useTaskKit } from './useTaskKit';

const at = new Vector3();

/** The Sun: glowing solar sparks circle the Sun — tap to collect them. */
export function SunSparks({ band, actions, reducedMotion }: TaskProps) {
  const t = tuningFor('collect-sparks', band);
  const kit = useTaskKit('collect-sparks', band, actions, t.count);
  const sparks = useMemo(() => {
    const phases = spreadPhases(t.count, 21);
    return phases.map((phase, i) => ({
      phase,
      radius: 1.3 + (i % 3) * 0.14,
      dir: i % 2 === 0 ? 1 : -1,
      speed: 0.38 + (i % 4) * 0.07,
      squash: 0.78 + (i % 2) * 0.1,
    }));
  }, [t.count]);
  const [got, setGot] = useState<readonly boolean[]>(() => sparks.map(() => false));
  const gotAt = useRef<number[]>(sparks.map(() => -1));
  const angles = useRef<number[]>(sparks.map((s) => s.phase));
  const refs = useRef<(Group | null)[]>([]);
  const stars = useRef<(Group | null)[]>([]);
  const star = useDisposable(puffyStar, []);
  const clock = useRef(0);
  const next = got.findIndex((g) => !g);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    clock.current += dt;
    const mul = t.speed * assistSpeed(kit.helpingRef.current) * (reducedMotion ? 0.5 : 1);
    for (let i = 0; i < sparks.length; i++) {
      const s = sparks[i];
      if (s === undefined) continue;
      const g = refs.current[i];
      if (!g) continue;
      angles.current[i] = (angles.current[i] ?? 0) + dt * s.speed * s.dir * mul;
      const a = angles.current[i] ?? 0;
      g.position.set(Math.cos(a) * s.radius, Math.sin(a) * s.radius * s.squash, 0.6);
      const since = (gotAt.current[i] ?? -1) < 0 ? 0 : clock.current - (gotAt.current[i] ?? 0);
      const twinkle = 1 + 0.12 * Math.sin(clock.current * 6 + i);
      g.scale.setScalar(t.size * (since > 0 ? popScale(since) : twinkle));
      g.visible = since < 0.45 || since === 0;
      const st = stars.current[i];
      // Pinwheel spin in the picture plane plus a little wobble, so the star always shows its full face.
      if (st) st.rotation.set(0, reducedMotion ? 0 : Math.sin(clock.current * 1.7 + i) * 0.45, (reducedMotion ? 0 : clock.current * 0.9) + i);
    }
  });

  return (
    <StageGroup onMiss={() => kit.miss()}>
      {sparks.map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
        >
          <Tappable
            hitRadius={0.2}
            disabled={got[i]}
            onTap={() => {
              if (got[i]) return;
              gotAt.current[i] = clock.current;
              setGot((prev) => prev.map((v, j) => (j === i ? true : v)));
              refs.current[i]?.getWorldPosition(at);
              kit.hit(at, { color: '#ffd166' });
            }}
          >
            <group
              ref={(g) => {
                stars.current[i] = g;
              }}
            >
              <mesh geometry={star} scale={0.13}>
                <meshPhysicalMaterial color="#fff2a8" emissive="#ffb300" emissiveIntensity={1.2} roughness={0.25} clearcoat={1} toneMapped={false} />
              </mesh>
            </group>
            <Glow color="#ffc23d" scale={0.5} opacity={0.95} />
            <Glow color="#ffffff" scale={0.18} opacity={0.8} />
            {/* A soft white ring lifts each spark off the bright Sun; it pulses when the world helps. */}
            <Halo size={0.44} color={kit.helping && i === next ? '#fff3a0' : '#ffffff'} strong={kit.helping && i === next} opacity={kit.helping && i === next ? 1 : 0.5} />
          </Tappable>
        </group>
      ))}
    </StageGroup>
  );
}
