import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CatmullRomCurve3, TubeGeometry, Vector3, type Group, type Mesh } from 'three';
import { blobGeometry } from './geometry';
import { TissueMaterial } from './materials';
import { useDisposable } from './dispose';

export interface MuscleState {
  /** 0 tired … 1 happy and full of oxygen. */
  energy: number;
  /** 0…1 highlight while it's waiting for its delivery. */
  glow: number;
  flex: number;
}

function arc(width: number, depth: number): TubeGeometry {
  const pts = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8 - 0.5;
    return new Vector3(t * width, -depth * (1 - 4 * t * t), 0);
  });
  return new TubeGeometry(new CatmullRomCurve3(pts), 20, 0.04, 8, false);
}

/**
 * A friendly cartoon muscle (think a leg or arm muscle) that needs oxygen to work. Tired and droopy
 * until the blood cell delivers — then it flexes with a big grin.
 */
export function Muscle({ detail, state }: { detail: number; state: MuscleState }) {
  const body = useRef<Group>(null);
  const smile = useRef<Mesh>(null);
  const flat = useRef<Mesh>(null);
  const lids = useRef<(Mesh | null)[]>([]);
  const t = useRef(0);
  const geo = useMemo(
    () => ({
      belly: blobGeometry({ center: [0, 0, 0], radii: [1.35, 0.62, 0.62, 0.62], lumps: 0.05, seed: 31 }, detail),
      tendonL: blobGeometry({ center: [-1.55, -0.05, 0], radii: [0.5, 0.2, 0.2, 0.2], lumps: 0.02, seed: 33 }, detail * 0.6),
      tendonR: blobGeometry({ center: [1.55, -0.05, 0], radii: [0.5, 0.2, 0.2, 0.2], lumps: 0.02, seed: 35 }, detail * 0.6),
      smile: arc(0.42, 0.13),
      flat: arc(0.3, 0.0),
    }),
    [detail],
  );
  const mats = useMemo(
    () => ({
      muscle: new TissueMaterial({ color: '#e24d68', rim: '#ffd1e0', rimStrength: 0.55, mottle: 0.1, fibres: 0.2, roughness: 0.45 }),
      tendon: new TissueMaterial({ color: '#fff2e6', rim: '#ffffff', rimStrength: 0.3, mottle: 0.05, fibres: 0.1 }),
    }),
    [],
  );

  useDisposable(geo);
  useDisposable(mats);
  useFrame((_, dt) => {
    t.current += dt;
    const e = Math.max(0, Math.min(1, state.energy));
    mats.muscle.glow.value += (state.glow * (0.22 + Math.sin(t.current * 6) * 0.12) - mats.muscle.glow.value) * Math.min(1, dt * 6);
    const b = body.current;
    if (b) {
      const flex = state.flex > 0 ? Math.sin(Math.min(1, state.flex) * Math.PI) : 0;
      state.flex = Math.max(0, state.flex - dt * 0.9);
      const droop = (1 - e) * 0.06;
      b.scale.set(1 - flex * 0.12, 1 + flex * 0.35 - droop, 1 + flex * 0.15);
      b.rotation.z = Math.sin(t.current * (e > 0.5 ? 2.4 : 0.8)) * (e > 0.5 ? 0.05 : 0.015);
    }
    if (smile.current) smile.current.visible = e > 0.5;
    if (flat.current) flat.current.visible = e <= 0.5;
    // Sleepy lids slide down over the top of the eyes when tired, and tuck away when happy.
    const h = (1 - e) * 0.17;
    for (const l of lids.current) {
      if (!l) continue;
      l.visible = h > 0.01;
      l.position.y = 0.155 - h;
      l.scale.set(0.152, h + 0.012, 0.075);
    }
  });

  return (
    <group ref={body}>
      <mesh geometry={geo.belly} material={mats.muscle} />
      <mesh geometry={geo.tendonL} material={mats.tendon} />
      <mesh geometry={geo.tendonR} material={mats.tendon} />
      <group position={[0, 0.08, 0.58]}>
        {[-0.28, 0.28].map((x, i) => (
          <group key={x} position={[x, 0.08, 0]}>
            <mesh scale={[0.13, 0.15, 0.06]}>
              <sphereGeometry args={[1, 18, 12]} />
              <meshStandardMaterial color="#ffffff" roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.02, 0.05]} scale={[0.075, 0.09, 0.04]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshStandardMaterial color="#2a0f2e" roughness={0.15} />
            </mesh>
            {/* sleepy eyelid */}
            <mesh
              ref={(el) => {
                lids.current[i] = el;
              }}
              position={[0, 0.05, 0.012]}
              scale={[0.152, 0.1, 0.075]}
            >
              <sphereGeometry args={[1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#c93a57" roughness={0.4} />
            </mesh>
          </group>
        ))}
        <mesh ref={smile} geometry={geo.smile} position={[0, -0.18, 0.02]} visible={false}>
          <meshStandardMaterial color="#5a0f24" />
        </mesh>
        <mesh ref={flat} geometry={geo.flat} position={[0, -0.22, 0.02]}>
          <meshStandardMaterial color="#5a0f24" />
        </mesh>
      </group>
    </group>
  );
}
