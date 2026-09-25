import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { Color, DoubleSide, MeshPhysicalMaterial, Quaternion, Vector3, type Group } from 'three';
import type { Vec3 } from './geometry';
import { PALETTE } from './palette';
import { hingeLayout, leafletGeometry } from './valveGeometry';
import { useDisposable } from './dispose';

const Z = new Vector3(0, 0, 1);

/**
 * A heart valve: a golden ring with 2–3 soft flaps that swing open with the flow and snap shut.
 * `open` is read every frame (0 shut … 1 open); `wobble` makes a leaky valve flap loosely and never seal.
 */
export function Valve({
  radius,
  flaps,
  normal = [0, 0, 1],
  open,
  wobble,
  glow,
  tint = PALETTE.valve,
  rimColor = PALETTE.valveRim,
  detail = 1,
  maxAngle = 1.25,
}: {
  radius: number;
  flaps: number;
  normal?: Vec3;
  open: RefObject<number>;
  wobble?: RefObject<number>;
  glow?: RefObject<number>;
  tint?: string;
  rimColor?: string;
  detail?: number;
  maxAngle?: number;
}) {
  const hinges = useRef<(Group | null)[]>([]);
  const shake = useRef<Group>(null);
  const time = useRef(Math.random() * 10);
  const geo = useMemo(() => leafletGeometry(radius * 0.96, flaps, 0.22, detail), [radius, flaps, detail]);
  const layout = useMemo(() => hingeLayout(radius * 0.96, flaps), [radius, flaps]);
  const [nx, ny, nz] = normal;
  // Keyed on the numbers, not the array: callers often pass a fresh literal each render.
  const quat = useMemo(() => new Quaternion().setFromUnitVectors(Z, new Vector3(nx, ny, nz).normalize()), [nx, ny, nz]);
  const flapMat = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: new Color(tint),
        roughness: 0.35,
        clearcoat: 1,
        clearcoatRoughness: 0.2,
        sheen: 0.8,
        sheenColor: new Color('#ffd0dc'),
        side: DoubleSide,
        emissive: new Color('#ffb0c0'),
        emissiveIntensity: 0.08,
      }),
    [tint],
  );
  const ringMat = useMemo(
    () => new MeshPhysicalMaterial({ color: new Color(rimColor), roughness: 0.28, metalness: 0.15, clearcoat: 1, emissive: new Color(rimColor), emissiveIntensity: 0.15 }),
    [rimColor],
  );

  useDisposable(geo);
  useDisposable(flapMat);
  useDisposable(ringMat);
  useFrame((_, dt) => {
    time.current += dt;
    const o = Math.max(0, Math.min(1, open.current ?? 0));
    const w = wobble?.current ?? 0;
    const g = glow?.current ?? 0;
    flapMat.emissiveIntensity = 0.08 + g * 0.7;
    ringMat.emissiveIntensity = 0.15 + g * 0.9;
    if (shake.current) {
      // A leaky valve rattles in its ring.
      shake.current.rotation.x = w * Math.sin(time.current * 17) * 0.07;
      shake.current.rotation.y = w * Math.sin(time.current * 13 + 1) * 0.07;
    }
    for (let i = 0; i < hinges.current.length; i++) {
      const h = hinges.current[i];
      if (!h) continue;
      // A leaky valve never quite closes and flutters.
      const leak = w * (0.28 + 0.16 * Math.sin(time.current * 11 + i * 2.1));
      h.rotation.x = (Math.max(o, leak) + Math.sin(time.current * 3 + i) * 0.02 * (1 - o)) * maxAngle;
    }
  });

  return (
    <group quaternion={quat}>
      <group ref={shake}>
      <mesh material={ringMat}>
        <torusGeometry args={[radius, radius * 0.16, Math.max(8, Math.round(12 * detail)), Math.max(24, Math.round(40 * detail))]} />
      </mesh>
      {layout.map((l, i) => (
        <group key={i} position={[l.x, l.y, 0]} rotation={[0, 0, l.angle + Math.PI / 2]}>
          <group
            ref={(el) => {
              hinges.current[i] = el;
            }}
          >
            <mesh geometry={geo} material={flapMat} />
          </group>
        </group>
      ))}
      </group>
    </group>
  );
}
