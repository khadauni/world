import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import { RingGeometry, Vector3, type Group } from 'three';
import type { QualityProfile } from '@/core/types';
import { BODIES, GALILEAN, MOONS, NEPTUNE_RINGS, SATURN_RINGS, URANUS_RINGS, type BodyId } from '../layout';
import { octaves } from '../shaders/common';
import { GIANTS, giantMaterial, type GiantLook } from '../shaders/giant';
import { ringMaterial, type RingKind } from '../shaders/rings';
import { LOOKS } from '../shaders/rocky';
import { useSolar } from '../state';
import { useBodyMotion, useDisposable, useSphere } from './hooks';
import { Moon } from './Moon';
import { Atmosphere } from './Planets';

const ringNormal = new Vector3();

function Rings({ kind, radius, inner, outer }: { kind: RingKind; radius: number; inner: number; outer: number }) {
  const sys = useSolar();
  const geo = useDisposable(() => new RingGeometry(inner * radius, outer * radius, 160, 1), [inner, outer, radius]);
  const mat = useDisposable(() => ringMaterial(kind, radius, sys.time), [kind, radius, sys.time]);
  return <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3} />;
}

function Giant({
  id,
  look,
  quality,
  rings,
  atmosphere,
  tiltDeg,
  children,
}: {
  id: BodyId;
  look: GiantLook;
  quality: QualityProfile;
  rings?: { kind: RingKind; inner: number; outer: number };
  atmosphere: { color: string; thickness: number; intensity: number };
  tiltDeg?: () => number;
  children?: ReactNode;
}) {
  const sys = useSolar();
  const anchor = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const spin = useRef<Group>(null);
  useBodyMotion(id, anchor, tilt, [spin], tiltDeg);
  const R = BODIES[id].radius;
  const sphere = useSphere(80, quality.detail);
  const giant = useDisposable(() => {
    const g = giantMaterial(sys.time, look, octaves(quality.detail, 4), R);
    return { ...g, dispose: () => g.material.dispose() };
  }, [sys.time, look, quality.detail, R]);
  useFrame(() => {
    const t = tilt.current;
    if (t && look.ringShadow) giant.uniforms.uRingNormal.value.copy(ringNormal.set(0, 1, 0).applyQuaternion(t.quaternion));
  });
  return (
    <group ref={anchor}>
      <group ref={tilt}>
        <group ref={spin}>
          <mesh geometry={sphere} material={giant.material} scale={R} />
        </group>
        {rings && <Rings kind={rings.kind} radius={R} inner={rings.inner} outer={rings.outer} />}
        {children}
      </group>
      <Atmosphere color={atmosphere.color} radius={R} thickness={atmosphere.thickness} intensity={atmosphere.intensity} />
    </group>
  );
}

export function Jupiter({ quality }: { quality: QualityProfile }) {
  const R = BODIES.jupiter.radius;
  return (
    <Giant id="jupiter" look={GIANTS.jupiter} quality={quality} atmosphere={{ color: '#ffd7a8', thickness: 0.08, intensity: 0.8 }}>
      {GALILEAN.map((m, i) => {
        const d = MOONS.jupiter[m];
        return <Moon key={m} id={m} look={LOOKS[m]} radius={d.radius * R} orbit={d.orbit * R} period={d.period} phase={0.9 + i * 1.7} quality={quality} />;
      })}
    </Giant>
  );
}

export function Saturn({ quality }: { quality: QualityProfile }) {
  return (
    <Giant
      id="saturn"
      look={GIANTS.saturn}
      quality={quality}
      rings={{ kind: 'saturn', inner: SATURN_RINGS.inner, outer: SATURN_RINGS.outer }}
      atmosphere={{ color: '#ffe3a8', thickness: 0.07, intensity: 0.7 }}
    />
  );
}

export function Uranus({ quality }: { quality: QualityProfile }) {
  const sys = useSolar();
  return (
    <Giant
      id="uranus"
      look={GIANTS.uranus}
      quality={quality}
      rings={{ kind: 'uranus', inner: URANUS_RINGS.inner, outer: URANUS_RINGS.outer }}
      atmosphere={{ color: '#9ff5ff', thickness: 0.12, intensity: 1.1 }}
      tiltDeg={() => sys.uranusTilt}
    />
  );
}

export function Neptune({ quality }: { quality: QualityProfile }) {
  return (
    <Giant
      id="neptune"
      look={GIANTS.neptune}
      quality={quality}
      rings={{ kind: 'neptune', inner: NEPTUNE_RINGS.inner, outer: NEPTUNE_RINGS.outer }}
      atmosphere={{ color: '#6f9bff', thickness: 0.13, intensity: 1.2 }}
    />
  );
}
