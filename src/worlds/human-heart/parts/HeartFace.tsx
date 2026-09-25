import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, CatmullRomCurve3, Color, MeshBasicMaterial, MeshStandardMaterial, Quaternion, TubeGeometry, Vector3, type Group, type Mesh } from 'three';
import { glowTexture } from '@/engine/kit';
import type { FaceAnchor } from './anatomy';
import { useDisposable } from './dispose';

const Z = new Vector3(0, 0, 1);

export interface FaceState {
  /** -1 worried … 0 calm … 1 delighted. */
  mood: number;
  /** 0 open … 1 squeezed shut (follows the big squeeze for a cartoon "oomph"). */
  squint: number;
  /** Where the eyes look (-1…1, screen-ish). */
  lookX: number;
  lookY: number;
}

function orient(a: FaceAnchor): { position: [number, number, number]; quaternion: Quaternion } {
  return { position: [a.p[0], a.p[1], a.p[2]], quaternion: new Quaternion().setFromUnitVectors(Z, new Vector3(...a.n).normalize()) };
}

function arc(width: number, depth: number): TubeGeometry {
  const pts = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8 - 0.5;
    return new Vector3(t * width, -depth * (1 - 4 * t * t), 0);
  });
  return new TubeGeometry(new CatmullRomCurve3(pts), 24, 0.026, 8, false);
}

/**
 * A friendly cartoon face on the front of the ventricles: glossy eyes that blink and look around,
 * rosy cheeks and a mouth that changes with the mood. Positioned on the heart's surface (anchors).
 */
export function HeartFace({ anchors, state }: { anchors: { eyeL: FaceAnchor; eyeR: FaceAnchor; mouth: FaceAnchor; cheekL: FaceAnchor; cheekR: FaceAnchor }; state: FaceState }) {
  const eyes = useRef<(Group | null)[]>([]);
  const pupils = useRef<(Group | null)[]>([]);
  const smile = useRef<Mesh>(null);
  const grin = useRef<Group>(null);
  const worry = useRef<Mesh>(null);
  const blink = useRef({ t: 0, next: 2.5 });
  const o = useMemo(
    () => ({ eyeL: orient(anchors.eyeL), eyeR: orient(anchors.eyeR), mouth: orient(anchors.mouth), cheekL: orient(anchors.cheekL), cheekR: orient(anchors.cheekR) }),
    [anchors],
  );
  const mats = useMemo(
    () => ({
      white: new MeshStandardMaterial({ color: '#ffffff', roughness: 0.18, emissive: new Color('#ffffff'), emissiveIntensity: 0.12 }),
      iris: new MeshStandardMaterial({ color: '#2a0f2e', roughness: 0.12 }),
      spark: new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      mouth: new MeshStandardMaterial({ color: '#5a0f24', roughness: 0.4 }),
      tongue: new MeshStandardMaterial({ color: '#ff7b93', roughness: 0.5 }),
      cheek: new MeshBasicMaterial({ map: glowTexture(), color: '#ff9fc0', transparent: true, opacity: 0.55, depthWrite: false, blending: AdditiveBlending, toneMapped: false }),
    }),
    [],
  );
  const geos = useMemo(() => ({ smile: arc(0.3, 0.08), worry: arc(0.2, -0.05) }), []);

  useDisposable(mats);
  useDisposable(geos);
  useFrame((_, dt) => {
    const b = blink.current;
    b.t += dt;
    let lid = 1;
    if (b.t > b.next) {
      const k = (b.t - b.next) / 0.16;
      lid = k < 1 ? Math.abs(1 - 2 * k) : 1;
      if (k >= 1) {
        b.t = 0;
        b.next = 2 + ((b.next * 7.3) % 3);
      }
    }
    const squint = Math.max(0, Math.min(1, state.squint));
    const eyeY = Math.max(0.12, lid * (1 - squint * 0.55));
    for (const e of eyes.current) if (e) e.scale.y = eyeY;
    for (const p of pupils.current) {
      if (!p) continue;
      p.position.x += (state.lookX * 0.03 - p.position.x) * Math.min(1, dt * 8);
      p.position.y += (state.lookY * 0.03 - p.position.y) * Math.min(1, dt * 8);
    }
    const m = state.mood;
    if (smile.current) smile.current.visible = m > -0.3 && m < 0.6;
    if (grin.current) grin.current.visible = m >= 0.6;
    if (worry.current) worry.current.visible = m <= -0.3;
  });

  const eye = (i: number, a: { position: [number, number, number]; quaternion: Quaternion }) => (
    <group position={a.position} quaternion={a.quaternion}>
      <group
        ref={(el) => {
          eyes.current[i] = el;
        }}
      >
        <mesh material={mats.white} scale={[0.15, 0.19, 0.07]}>
          <sphereGeometry args={[1, 24, 18]} />
        </mesh>
        <group
          ref={(el) => {
            pupils.current[i] = el;
          }}
        >
          <mesh material={mats.iris} position={[0, -0.015, 0.06]} scale={[0.095, 0.12, 0.05]}>
            <sphereGeometry args={[1, 20, 14]} />
          </mesh>
          <mesh material={mats.spark} position={[0.035, 0.035, 0.11]} scale={0.032}>
            <sphereGeometry args={[1, 10, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );

  return (
    <group>
      {eye(0, o.eyeL)}
      {eye(1, o.eyeR)}
      <group position={o.mouth.position} quaternion={o.mouth.quaternion}>
        <mesh ref={smile} geometry={geos.smile} material={mats.mouth} position={[0, 0.03, 0.02]} />
        <mesh ref={worry} geometry={geos.worry} material={mats.mouth} position={[0, -0.02, 0.02]} visible={false} />
        <group ref={grin} visible={false}>
          <mesh material={mats.mouth} position={[0, 0, 0.0]} rotation={[0, 0, Math.PI]} scale={[1, 0.85, 0.45]}>
            <circleGeometry args={[0.15, 24, 0, Math.PI]} />
          </mesh>
          <mesh material={mats.tongue} position={[0, -0.075, 0.012]} scale={[0.09, 0.045, 0.03]}>
            <sphereGeometry args={[1, 14, 10]} />
          </mesh>
        </group>
      </group>
      <mesh material={mats.cheek} position={o.cheekL.position} quaternion={o.cheekL.quaternion} scale={0.36}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh material={mats.cheek} position={o.cheekR.position} quaternion={o.cheekR.quaternion} scale={0.36}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}
