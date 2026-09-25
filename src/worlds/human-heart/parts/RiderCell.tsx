import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { AdditiveBlending, CatmullRomCurve3, Color, MeshPhysicalMaterial, TubeGeometry, Vector3, type Group, type SpriteMaterial } from 'three';
import { emojiTexture, glowTexture } from '@/engine/kit';
import { rbcGeometry } from './cells';
import { PALETTE } from './palette';
import { useDisposable } from './dispose';

const poor = new Color('#6f5cff');
const rich = new Color(PALETTE.rich);

/**
 * The explorer's ride: a big, glossy red blood cell with a happy face. Its colour follows its oxygen
 * (diagram code: purple-blue = oxygen-poor, red = oxygen-rich), and it carries little O₂ bubbles.
 */
export function RiderCell({ oxy, carried, detail, reducedMotion, rider }: { oxy: RefObject<number>; carried: RefObject<number>; detail: number; reducedMotion: boolean; rider?: string }) {
  const disc = useRef<Group>(null);
  const orbit = useRef<Group>(null);
  const glow = useRef<SpriteMaterial>(null);
  const t = useRef(0);
  const geo = useMemo(() => rbcGeometry(detail, 0.36), [detail]);
  const mat = useMemo(() => new MeshPhysicalMaterial({ color: poor.clone(), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.7, sheenColor: new Color('#ffd6e2'), emissive: poor.clone(), emissiveIntensity: 0.12 }), []);
  const smile = useMemo(() => {
    const pts = Array.from({ length: 9 }, (_, i) => {
      const x = i / 8 - 0.5;
      return new Vector3(x * 0.2, -0.05 * (1 - 4 * x * x), 0);
    });
    return new TubeGeometry(new CatmullRomCurve3(pts), 16, 0.016, 6, false);
  }, []);
  const bubbles = useRef<(Group | null)[]>([]);
  const riderTex = useMemo(() => (rider ? emojiTexture(rider, 128) : null), [rider]);

  useDisposable(geo);
  useDisposable(mat);
  useDisposable(smile);
  useDisposable(riderTex);
  useFrame((_, dt) => {
    t.current += dt;
    const o = Math.max(0, Math.min(1, oxy.current ?? 0));
    mat.color.copy(poor).lerp(rich, o);
    mat.emissive.copy(mat.color);
    if (glow.current) glow.current.color.copy(mat.color);
    const d = disc.current;
    if (d && !reducedMotion) {
      d.rotation.z = Math.sin(t.current * 2.1) * 0.12;
      d.position.y = Math.sin(t.current * 3.3) * 0.04;
    }
    const n = Math.round(carried.current ?? 0);
    if (orbit.current) orbit.current.rotation.z += dt * 1.4;
    for (let i = 0; i < bubbles.current.length; i++) {
      const b = bubbles.current[i];
      if (!b) continue;
      b.visible = i < n;
      const a = (i / Math.max(1, n)) * Math.PI * 2;
      b.position.set(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.1);
    }
  });

  return (
    <group>
      <sprite scale={1.6} renderOrder={1}>
        <spriteMaterial ref={glow} map={glowTexture()} transparent opacity={0.55} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </sprite>
      <group ref={disc}>
        <mesh geometry={geo} material={mat} rotation={[Math.PI / 2, 0, 0]} />
        <group position={[0, 0.02, 0.14]}>
          {[-0.1, 0.1].map((x) => (
            <group key={x} position={[x, 0.05, 0]}>
              <mesh scale={[0.055, 0.07, 0.03]}>
                <sphereGeometry args={[1, 14, 10]} />
                <meshStandardMaterial color="#ffffff" roughness={0.2} />
              </mesh>
              <mesh position={[0.008, -0.008, 0.025]} scale={[0.032, 0.042, 0.02]}>
                <sphereGeometry args={[1, 12, 8]} />
                <meshStandardMaterial color="#2a0f2e" roughness={0.1} />
              </mesh>
            </group>
          ))}
          <mesh geometry={smile} position={[0, -0.06, 0.01]}>
            <meshStandardMaterial color="#4a0a1c" />
          </mesh>
        </group>
      </group>
      {riderTex && (
        // The explorer's own avatar surfs on top of the cell.
        <sprite position={[0.02, 0.36, 0.05]} scale={0.46} renderOrder={4}>
          <spriteMaterial map={riderTex} transparent depthWrite={false} />
        </sprite>
      )}
      <group ref={orbit}>
        {Array.from({ length: 6 }, (_, i) => (
          <group
            key={i}
            visible={false}
            ref={(el) => {
              bubbles.current[i] = el;
            }}
          >
            <mesh scale={0.1}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshPhysicalMaterial color="#e8fbff" transparent opacity={0.75} roughness={0.05} clearcoat={1} emissive="#9fe4ff" emissiveIntensity={0.4} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
