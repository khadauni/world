import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { DynamicDrawUsage, Object3D, type Group, type InstancedMesh } from 'three';
import { mulberry32 } from '@/core/random';
import { blobGeometry, tubeGeometry, type Vec3 } from './geometry';
import { TissueMaterial } from './materials';
import { useDisposable } from './dispose';

/**
 * A pair of soft, breathing cartoon lungs with a windpipe, bronchi and grape-like air sacs (alveoli)
 * where blood picks up oxygen. `right`/`left` are the viewer's sides.
 */
export function Lungs({ detail, reducedMotion, right, left }: { detail: number; reducedMotion: boolean; right: Vec3; left: Vec3 }) {
  const breathe = useRef<Group>(null);
  const t = useRef(0);
  const geo = useMemo(
    () => ({
      right: blobGeometry({ center: [0, 0, 0], radii: [1.05, 1.35, 1.2, 0.72], taper: { tip: 0.75, pow: 2 }, topPinch: 0.35, lumps: 0.06, seed: 21, rot: [0, 0, -0.18] }, detail * 0.8),
      left: blobGeometry({ center: [0, 0, 0], radii: [0.95, 1.3, 1.15, 0.7], taper: { tip: 0.75, pow: 2 }, topPinch: 0.35, lumps: 0.06, seed: 23, rot: [0, 0, 0.18] }, detail * 0.8),
      airway: [
        tubeGeometry(
          [
            [(right[0] + left[0]) / 2, right[1] + 2.2, right[2] - 0.2],
            [(right[0] + left[0]) / 2, right[1] + 1.2, right[2] - 0.2],
          ],
          { radius: () => 0.2, tubular: 8, radial: 12, caps: 'start' },
          detail,
        ),
        tubeGeometry(
          [
            [(right[0] + left[0]) / 2, right[1] + 1.25, right[2] - 0.2],
            [right[0] - 0.9, right[1] + 0.5, right[2] - 0.1],
            [right[0] - 0.3, right[1] + 0.1, right[2]],
          ],
          { radius: (u) => 0.14 - u * 0.05, tubular: 16, radial: 10, caps: 'none' },
          detail,
        ),
        tubeGeometry(
          [
            [(right[0] + left[0]) / 2, right[1] + 1.25, right[2] - 0.2],
            [left[0] + 0.9, left[1] + 0.5, left[2] - 0.1],
            [left[0] + 0.3, left[1] + 0.1, left[2]],
          ],
          { radius: (u) => 0.14 - u * 0.05, tubular: 16, radial: 10, caps: 'none' },
          detail,
        ),
      ],
    }),
    [detail, right, left],
  );
  const mats = useMemo(
    () => ({
      lung: new TissueMaterial({ color: '#ff9ab4', rim: '#ffe6ef', rimStrength: 0.55, mottle: 0.16, fibres: 0.02, roughness: 0.5, sheen: '#ffffff' }),
      airway: new TissueMaterial({ color: '#fff0f4', rim: '#ffffff', rimStrength: 0.3, mottle: 0.05, fibres: 0.12, roughness: 0.4 }),
    }),
    [],
  );

  useDisposable(geo);
  useDisposable(geo.airway);
  useDisposable(mats);
  useFrame((_, dt) => {
    t.current += dt;
    const b = breathe.current;
    if (b) {
      const s = reducedMotion ? 0 : Math.sin(t.current * 1.1) * 0.035;
      b.scale.set(1 + s, 1 + s * 0.8, 1 + s);
    }
  });

  return (
    <group>
      <group ref={breathe}>
        <mesh geometry={geo.right} material={mats.lung} position={[right[0], right[1], right[2]]} />
        <mesh geometry={geo.left} material={mats.lung} position={[left[0], left[1], left[2]]} />
        <Alveoli center={right} count={Math.round(26 * detail) + 6} seed={3} />
        <Alveoli center={left} count={Math.round(18 * detail) + 4} seed={5} />
      </group>
      {geo.airway.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.airway} />
      ))}
    </group>
  );
}

/** Grape-like clusters of air sacs on the lung surface (one instanced draw call). */
function Alveoli({ center, count, seed }: { center: Vec3; count: number; seed: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const data = useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: count }, () => {
      const a = rand() * Math.PI * 2;
      const y = (rand() * 2 - 1) * 0.9;
      const r = Math.sqrt(1 - y * y * 0.6);
      return { x: Math.cos(a) * r * 0.85, y: y * 1.1, z: Math.abs(Math.sin(a)) * r * 0.62 + 0.08, s: 0.09 + rand() * 0.1, ph: rand() * 6 };
    });
  }, [count, seed]);
  const dummy = useMemo(() => new Object3D(), []);
  const t = useRef(0);
  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    t.current += dt;
    for (let i = 0; i < data.length; i++) {
      const d = data[i] as (typeof data)[number];
      dummy.position.set(center[0] + d.x, center[1] + d.y, center[2] + d.z);
      dummy.scale.setScalar(d.s * (1 + Math.sin(t.current * 1.1 + d.ph) * 0.08));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={(el) => {
        mesh.current = el;
        el?.instanceMatrix.setUsage(DynamicDrawUsage);
      }}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 14, 10]} />
      <meshPhysicalMaterial color="#ffc2d2" roughness={0.3} clearcoat={1} sheen={0.7} sheenColor="#ffffff" emissive="#ff8fb1" emissiveIntensity={0.12} />
    </instancedMesh>
  );
}
