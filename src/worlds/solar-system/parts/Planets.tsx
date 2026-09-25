import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { DoubleSide, Vector3, type Group } from 'three';
import type { QualityProfile } from '@/core/types';
import { BODIES, MOONS } from '../layout';
import { octaves } from '../shaders/common';
import { cloudMaterial, earthMaterial } from '../shaders/earth';
import { atmosphereMaterial } from '../shaders/fx';
import { marsMaterial } from '../shaders/mars';
import { LOOKS, rockyMaterial } from '../shaders/rocky';
import { venusMaterial } from '../shaders/venus';
import { moonSlot, useSolar } from '../state';
import { useBodyMotion, useDisposable, useSphere } from './hooks';
import { Moon } from './Moon';

/** Additive halo shell around a planet. */
export function Atmosphere({ color, radius, thickness = 0.12, intensity = 1 }: { color: string; radius: number; thickness?: number; intensity?: number }) {
  const mat = useDisposable(() => atmosphereMaterial(color, radius, thickness, intensity), [color, radius, thickness, intensity]);
  const sphere = useSphere(48, 1);
  return <mesh geometry={sphere} material={mat} scale={radius * (1 + thickness)} renderOrder={1} />;
}

export function Mercury({ quality }: { quality: QualityProfile }) {
  const sys = useSolar();
  const anchor = useRef<Group>(null);
  const spin = useRef<Group>(null);
  useBodyMotion('mercury', anchor, null, [spin]);
  const R = BODIES.mercury.radius;
  const sphere = useSphere(64, quality.detail);
  const mat = useDisposable(() => rockyMaterial(sys.time, { ...LOOKS.mercury, bump: R * 0.07 }, octaves(quality.detail, 4), quality.tier === 'low' ? 1 : 2), [sys.time, quality.detail, quality.tier]);
  return (
    <group ref={anchor}>
      <group ref={spin}>
        <mesh geometry={sphere} material={mat} scale={R} />
      </group>
      <Atmosphere color="#d9cbb8" radius={R} thickness={0.07} intensity={0.35} />
    </group>
  );
}

export function Venus({ quality }: { quality: QualityProfile }) {
  const sys = useSolar();
  const anchor = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const spin = useRef<Group>(null);
  useBodyMotion('venus', anchor, tilt, [spin]);
  const R = BODIES.venus.radius;
  const sphere = useSphere(64, quality.detail);
  const venus = useDisposable(() => venusMaterial(sys.time, octaves(quality.detail, 4)).material, [sys.time, quality.detail]);
  useFrame((_, dt) => {
    // Once the mission is over the cloud deck slowly closes again (the volcano has gone back into hiding).
    if (!sys.venusHold && sys.venusReveal > 0) sys.venusReveal = Math.max(0, sys.venusReveal - Math.min(dt, 0.1) * 0.45);
    const u = venus.uniforms;
    if (u.uReveal) u.uReveal.value = sys.venusReveal;
    if (u.uRevealDir) (u.uRevealDir.value as Vector3).copy(sys.venusRevealDir);
  });
  return (
    <group ref={anchor}>
      <group ref={tilt}>
        <group ref={spin}>
          <mesh geometry={sphere} material={venus} scale={R} />
        </group>
      </group>
      <Atmosphere color="#ffd98a" radius={R} thickness={0.16} intensity={1.1} />
    </group>
  );
}

const SAT_ORBIT = 1.5;
const tmp = new Vector3();

export function Earth({ quality }: { quality: QualityProfile }) {
  const sys = useSolar();
  const anchor = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const cloudSpin = useRef<Group>(null);
  useBodyMotion('earth', anchor, tilt, [spin]);
  const R = BODIES.earth.radius;
  const sphere = useSphere(72, quality.detail);
  const surface = useDisposable(() => earthMaterial(sys.time, octaves(quality.detail, 4)), [sys.time, quality.detail]);
  const clouds = useDisposable(() => cloudMaterial(sys.time, octaves(quality.detail, 3)), [sys.time, quality.detail]);
  useFrame(() => {
    if (cloudSpin.current) cloudSpin.current.rotation.y = sys.spin.earth * 1.15;
  });
  const m = MOONS.earth.moon;
  return (
    <group ref={anchor}>
      <group ref={tilt}>
        <group ref={spin}>
          <mesh geometry={sphere} material={surface} scale={R} />
        </group>
        <group ref={cloudSpin}>
          <mesh geometry={sphere} material={clouds} scale={R * 1.018} renderOrder={1} />
        </group>
      </group>
      <Atmosphere color="#5aa8ff" radius={R} thickness={0.14} intensity={1.25} />
      <Moon id="moon" look={LOOKS.moon} radius={m.radius * R} orbit={m.orbit * R} period={m.period} phase={2.2} incline={0.09} quality={quality} />
      <Satellite orbit={SAT_ORBIT * R} scale={R * 0.1} />
    </group>
  );
}

/** A little satellite with golden foil and blue solar wings, circling Earth. */
function Satellite({ orbit, scale }: { orbit: number; scale: number }) {
  const sys = useSolar();
  const g = useRef<Group>(null);
  const slot = moonSlot(sys, 'satellite');
  if (sys.moonAngles.satellite === undefined) sys.moonAngles.satellite = 0.8;
  useFrame((_, dt) => {
    const a = (sys.moonAngles.satellite ?? 0) + (Math.min(dt, 0.1) * Math.PI * 2 * sys.moonSpeed) / 16;
    sys.moonAngles.satellite = a;
    const s = g.current;
    if (!s) return;
    s.position.set(Math.cos(a) * orbit, Math.sin(a) * orbit * 0.55, -Math.sin(a) * orbit * 0.84);
    s.rotation.set(a * 0.5, a, 0.3);
    s.getWorldPosition(tmp);
    slot.copy(tmp);
  });
  return (
    <group ref={g} scale={scale}>
      <mesh>
        <boxGeometry args={[0.8, 0.8, 1.1]} />
        <meshPhysicalMaterial color="#ffc94a" metalness={0.8} roughness={0.3} clearcoat={1} emissive="#5a3a00" emissiveIntensity={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.55, 0, 0]}>
          <mesh>
            <boxGeometry args={[2, 0.06, 0.9]} />
            <meshPhysicalMaterial color="#2f6bff" metalness={0.4} roughness={0.25} clearcoat={1} emissive="#0b2a8a" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[-s * 0.7, 0, 0]}>
            <boxGeometry args={[0.5, 0.1, 0.1]} />
            <meshStandardMaterial color="#d8dde8" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.62, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.38, 0.3, 20, 1, true]} />
        <meshStandardMaterial color="#f4f6ff" metalness={0.3} roughness={0.4} side={DoubleSide} />
      </mesh>
    </group>
  );
}

export function Mars({ quality }: { quality: QualityProfile }) {
  const sys = useSolar();
  const anchor = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const spin = useRef<Group>(null);
  useBodyMotion('mars', anchor, tilt, [spin]);
  const R = BODIES.mars.radius;
  const sphere = useSphere(96, quality.detail);
  const mat = useDisposable(() => marsMaterial(sys.time, octaves(quality.detail, 4), R), [sys.time, quality.detail]);
  const ph = MOONS.mars.phobos;
  const de = MOONS.mars.deimos;
  return (
    <group ref={anchor}>
      <group ref={tilt}>
        <group ref={spin}>
          <mesh geometry={sphere} material={mat} scale={R} />
        </group>
        <Moon id="phobos" look={LOOKS.phobos} radius={ph.radius * R} orbit={ph.orbit * R} period={ph.period} phase={0.6} lumpy quality={quality} />
        <Moon id="deimos" look={LOOKS.deimos} radius={de.radius * R} orbit={de.orbit * R} period={de.period} phase={2.4} lumpy quality={quality} />
      </group>
      <Atmosphere color="#ffb08a" radius={R} thickness={0.08} intensity={0.7} />
    </group>
  );
}
