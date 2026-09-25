import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, MeshBasicMaterial, PlaneGeometry, Quaternion, TorusGeometry, Vector3, type Group, type Mesh } from 'three';
import type { QualityProfile } from '@/core/types';
import { Glow } from '@/engine/kit';
import { mulberry32 } from '@/core/random';
import { BODIES } from '../layout';
import { octaves } from '../shaders/common';
import { coronaMaterial, sunMaterial } from '../shaders/sun';
import { useSolar } from '../state';
import { useBodyMotion, useDisposable, useSphere } from './hooks';
import { Facing } from './Facing';

const R = BODIES.sun.radius;

/** The Sun: boiling plasma, a ray-streaked corona, looping prominences — and, for little ones, a happy face. */
export function Sun({ quality, face }: { quality: QualityProfile; face: boolean }) {
  const sys = useSolar();
  const anchor = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const spin = useRef<Group>(null);
  useBodyMotion('sun', anchor, tilt, [spin]);
  const sphere = useSphere(72, quality.detail);
  const oct = octaves(quality.detail, 4);
  const surface = useDisposable(() => sunMaterial(sys.time, oct, quality.bloom ? 1.15 : 1), [sys.time, oct, quality.bloom]);
  const corona = useDisposable(() => coronaMaterial(sys.time, 1 / 2.7, new Color('#ffb040'), quality.bloom ? 1.25 : 1.45), [sys.time, quality.bloom]);
  const plane = useDisposable(() => new PlaneGeometry(R * 2 * 2.7, R * 2 * 2.7), []);

  return (
    <group ref={anchor}>
      <group ref={tilt}>
        <group ref={spin}>
          <mesh geometry={sphere} material={surface} scale={R} />
          <Prominences quality={quality} />
        </group>
      </group>
      <Facing>
        <mesh geometry={plane} material={corona} renderOrder={2} />
      </Facing>
      <Glow color="#ff9a2e" scale={R * 7.5} opacity={0.5} />
      <Glow color="#ffe7a0" scale={R * 3.6} opacity={0.65} />
      {face && <SunFace />}
      <pointLight position={[0, 0, 0]} intensity={2.6} decay={0} color="#fff1dc" />
    </group>
  );
}

const UP = new Vector3(0, 1, 0);

function Prominences({ quality }: { quality: QualityProfile }) {
  const count = quality.tier === 'low' ? 3 : 6;
  const geo = useDisposable(() => new TorusGeometry(R * 0.13, R * 0.011, 8, 32, Math.PI), []);
  const mat = useDisposable(
    () => new MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    [],
  );
  const loops = useMemo(() => {
    const rand = mulberry32(42);
    return Array.from({ length: count }, (_, i) => {
      const dir = new Vector3(rand() * 2 - 1, (rand() * 2 - 1) * 0.6, rand() * 2 - 1).normalize();
      const quat = new Quaternion().setFromUnitVectors(UP, dir).multiply(new Quaternion().setFromAxisAngle(UP, rand() * Math.PI));
      return { key: i, pos: dir.clone().multiplyScalar(R * 0.985), quat, phase: rand() * 6.28, size: 0.7 + rand() * 0.8 };
    });
  }, [count]);
  const refs = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < loops.length; i++) {
      const l = loops[i];
      if (l === undefined) continue;
      const m = refs.current[i];
      if (m) m.scale.setScalar(l.size * (0.85 + 0.25 * Math.sin(t * 0.7 + l.phase)));
    }
  });
  return (
    <>
      {loops.map((l, i) => (
        <mesh
          key={l.key}
          ref={(m) => {
            refs.current[i] = m;
          }}
          geometry={geo}
          material={mat}
          position={l.pos}
          quaternion={l.quat}
        />
      ))}
    </>
  );
}

/** A happy face (big shiny eyes and a smile) that turns to face you and blinks now and then (tiny & junior only). */
function SunFace() {
  const g = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  useFrame(({ camera, clock }) => {
    const grp = g.current;
    if (!grp) return;
    grp.lookAt(camera.position);
    const t = clock.elapsedTime % 4.2;
    const blink = t > 4.0 ? 0.15 : 1;
    if (eyes.current) eyes.current.scale.y = blink;
  });
  const ink = '#6a2400';
  return (
    <group ref={g}>
      <group ref={eyes} position={[0, R * 0.16, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * R * 0.3, 0, R * 0.95]}>
            <mesh scale={[R * 0.085, R * 0.12, R * 0.04]}>
              <sphereGeometry args={[1, 20, 16]} />
              <meshBasicMaterial color={ink} toneMapped={false} />
            </mesh>
            <mesh position={[R * 0.025, R * 0.04, R * 0.035]} scale={R * 0.028}>
              <sphereGeometry args={[1, 12, 10]} />
              <meshBasicMaterial color="#fff6e0" toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh position={[0, -R * 0.06, R * 0.955]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[R * 0.2, R * 0.03, 10, 32, Math.PI]} />
        <meshBasicMaterial color={ink} toneMapped={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <Glow key={s} color="#ff5a6e" scale={R * 0.42} opacity={0.75} position={[s * R * 0.5, -R * 0.08, R * 0.9]} />
      ))}
    </group>
  );
}
