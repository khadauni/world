import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { MeshBasicMaterial, PlaneGeometry, TorusGeometry, type Color, type Group, type ShaderMaterial } from 'three';
import type { AgeBand, QualityProfile, WorldActions } from '@/core/types';
import { useDisposable } from '../parts/hooks';
import { haloMaterial } from '../shaders/fx';
import { useSolar } from '../state';
import { Facing } from '../parts/Facing';

/** What every mission component receives from the scene. */
export interface TaskProps {
  readonly band: AgeBand;
  readonly actions: WorldActions;
  readonly reducedMotion: boolean;
  readonly quality: QualityProfile;
}

/**
 * Group aligned with the current task camera: x right, y up, z toward the viewer, 1 unit = 1 body radius.
 * Clicking empty space inside it counts as a (gentle) miss.
 */
export function StageGroup({ children, onMiss }: { children: ReactNode; onMiss?: () => void }) {
  const sys = useSolar();
  const g = useRef<Group>(null);
  useFrame(() => {
    const grp = g.current;
    if (!grp) return;
    grp.position.copy(sys.stage.origin);
    grp.quaternion.copy(sys.stage.quat);
    grp.scale.setScalar(sys.stage.unit);
  });
  return (
    <group ref={g} onPointerMissed={onMiss ? () => onMiss() : undefined}>
      {children}
    </group>
  );
}

/**
 * Camera-facing highlight ring (dashed + pulsing when `strong`), used to point at targets. `size` is the
 * ring diameter in the parent's units. Drawn on top (no depth test): a flat ring around a target on a curved
 * planet would otherwise be cut in half by the surface — and a hint must always be seen.
 */
export function Halo({ size, color, strong = false, opacity = 1 }: { size: number; color: string; strong?: boolean; opacity?: number }) {
  const sys = useSolar();
  const plane = useDisposable(() => new PlaneGeometry(1, 1), []);
  const mat = useDisposable(() => {
    const m = haloMaterial(sys.time);
    m.depthTest = false;
    return m;
  }, [sys.time]);
  // Uniforms only change with the props (the shared uTime animates the dashes) — nothing to do per frame.
  useLayoutEffect(() => {
    const u = (mat as ShaderMaterial).uniforms;
    (u.uColor?.value as Color | undefined)?.set(color);
    if (u.uDashes) u.uDashes.value = strong ? 8 : 0;
    if (u.uPulse) u.uPulse.value = strong ? 1 : 0;
    if (u.uOpacity) u.uOpacity.value = opacity;
  }, [mat, color, strong, opacity]);
  return (
    <Facing>
      <mesh geometry={plane} material={mat} scale={size} renderOrder={8} />
    </Facing>
  );
}

/**
 * A bold, solid tap-target ring with a dark outline, facing the camera and gently pulsing. Unlike the additive
 * `Halo` it stays readable on bright surfaces (the Great Red Spot sits on Jupiter's cream-coloured clouds).
 * `size` is the ring diameter in the parent's units.
 */
export function TargetRing({ size, color, pulse = true }: { size: number; color: string; pulse?: boolean }) {
  const g = useRef<Group>(null);
  const clock = useRef(0);
  const ring = useDisposable(() => new TorusGeometry(0.5, 0.034, 12, 72), []);
  const outline = useDisposable(() => new TorusGeometry(0.5, 0.062, 12, 72), []);
  const ringMat = useDisposable(() => new MeshBasicMaterial({ toneMapped: false, depthTest: false, transparent: true }), []);
  const outlineMat = useDisposable(() => new MeshBasicMaterial({ color: '#1d0b33', opacity: 0.45, depthTest: false, transparent: true }), []);
  useLayoutEffect(() => {
    ringMat.color.set(color);
  }, [ringMat, color]);
  useFrame((_, dt) => {
    const grp = g.current;
    if (!grp) return;
    clock.current += Math.min(dt, 0.1);
    grp.scale.setScalar(size * (pulse ? 1 + 0.07 * Math.sin(clock.current * 4) : 1));
  });
  return (
    <Facing>
      <group ref={g} scale={size}>
        <mesh geometry={outline} material={outlineMat} renderOrder={8} />
        <mesh geometry={ring} material={ringMat} renderOrder={9} />
      </group>
    </Facing>
  );
}

/** Springy "pop" used when a target is collected: grows, then shrinks away. Returns the scale for time t (s). */
export function popScale(t: number): number {
  if (t <= 0) return 1;
  if (t < 0.12) return 1 + (t / 0.12) * 0.45;
  if (t < 0.4) return 1.45 * (1 - (t - 0.12) / 0.28);
  return 0;
}
