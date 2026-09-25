import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import type { AmbientLight, DirectionalLight, Group, HemisphereLight } from 'three';
import { Glow } from '@/engine/kit';
import { makeTerrain, type Crater, type FlatSpot, type Terrain } from '../logic/terrain';
import { MoonTerrain } from './MoonGround';
import { Earth } from './Planets';

type V3 = [number, number, number];

/** Low Sun near the south-polar horizon (long shadows) and Earth hanging low in the black sky. */
export const LUNAR_SUN: V3 = [1, 0.2, 0.25];

export function useLunarTerrain(seed: number, size: number, craters: number, flats: readonly FlatSpot[], hero: readonly Crater[] = []): Terrain {
  return useMemo(() => makeTerrain({ seed, size, craters, flats, hero, curvature: 0.0009 }), [seed, size, craters, flats, hero]);
}

/**
 * Lighting + backdrop for the stops on the Moon's surface. `night` (0 = low Sun, 1 = lunar night lit only by
 * earthshine) is read from a ref so the Moon night can fade without re-rendering.
 */
export function LunarSurface({
  terrain,
  detail,
  shadows,
  night,
  earth = [-38, 13, -70],
  earthRadius = 5,
  shadowBox = 12,
  sunColor = '#fff3dc',
}: {
  terrain: Terrain;
  detail: number;
  shadows: boolean;
  night?: RefObject<number>;
  earth?: V3;
  earthRadius?: number;
  shadowBox?: number;
  sunColor?: string;
}) {
  const sun = useRef<DirectionalLight>(null);
  const fill = useRef<HemisphereLight>(null);
  const earthLight = useRef<DirectionalLight>(null);
  const amb = useRef<AmbientLight>(null);
  const front = useRef<DirectionalLight>(null);
  useFrame(() => {
    const n = Math.min(1, Math.max(0, night?.current ?? 0));
    if (sun.current) sun.current.intensity = 3.6 * (1 - n);
    if (front.current) front.current.intensity = 0.7 * (1 - n) + 0.06;
    if (fill.current) fill.current.intensity = 0.18 * (1 - n) + 0.03;
    if (earthLight.current) earthLight.current.intensity = 0.25 + 0.35 * n;
    if (amb.current) amb.current.intensity = 0.08 + 0.04 * n;
  });
  const sunPos: V3 = [LUNAR_SUN[0] * 40, LUNAR_SUN[1] * 40, LUNAR_SUN[2] * 40];
  return (
    <group>
      <directionalLight
        ref={sun}
        position={sunPos}
        intensity={3.4}
        color={sunColor}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-shadowBox}
        shadow-camera-right={shadowBox}
        shadow-camera-top={shadowBox}
        shadow-camera-bottom={-shadowBox}
        shadow-camera-far={120}
        shadow-bias={-0.0006}
      />
      <hemisphereLight ref={fill} args={['#9fb4ff', '#2a2622', 0.18]} />
      {/* soft "camera side" fill so the heroes' faces never go black (animated-film lighting) */}
      <directionalLight ref={front} position={[6, 10, 30]} intensity={0.7} color="#ffe9cf" />
      <directionalLight ref={earthLight} position={[earth[0], earth[1], earth[2]]} intensity={0.25} color="#8fb6ff" />
      <ambientLight ref={amb} intensity={0.08} color="#b8c6ff" />
      <MoonTerrain terrain={terrain} detail={detail} shadows={shadows} tint="#a8a39c" />
      <group position={earth}>
        <Earth radius={earthRadius} sun={LUNAR_SUN} rotationY={2.2} detail={0.6} haloIntensity={1.6} />
      </group>
      <SunGlow night={night} />
    </group>
  );
}

/** Blinding low Sun just above the horizon (fades out as night falls). */
function SunGlow({ night }: { night?: RefObject<number> }) {
  const g = useRef<Group>(null);
  useFrame(() => {
    const n = night?.current ?? 0;
    if (g.current) {
      g.current.visible = n < 0.98;
      g.current.position.y = 6 - n * 10;
    }
  });
  return (
    <group ref={g} position={[LUNAR_SUN[0] * 90, 6, LUNAR_SUN[2] * 90 - 30]}>
      <Glow color="#fff6de" scale={26} opacity={0.9} />
      <Glow color="#ffffff" scale={6} opacity={1} />
    </group>
  );
}
