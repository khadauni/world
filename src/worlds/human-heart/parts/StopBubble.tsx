import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, Shape, type Group, type MeshPhysicalMaterial } from 'three';
import { emojiTexture, glowTexture, Tappable } from '@/engine/kit';

function starShape(r = 1, inner = 0.48): Shape {
  const s = new Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * inner;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

const textures = new Map<string, ReturnType<typeof emojiTexture>>();
function emojiTex(emoji: string) {
  let t = textures.get(emoji);
  if (!t) {
    t = emojiTexture(emoji, 128);
    textures.set(emoji, t);
  }
  return t;
}

/**
 * A glossy bubble "portal" for one stop on the map: the stop's emoji floats inside, a coloured halo
 * ring glows beneath, finished stops wear a spinning gold star, and the next stop bounces.
 */
export function StopBubble({
  position,
  emoji,
  color,
  state,
  onTap,
  reducedMotion,
  seed,
  scale = 1,
}: {
  position: [number, number, number];
  emoji: string;
  color: string;
  state: 'done' | 'next' | 'open' | 'locked';
  onTap: () => void;
  reducedMotion: boolean;
  seed: number;
  scale?: number;
}) {
  const g = useRef<Group>(null);
  const star = useRef<Group>(null);
  const shell = useRef<MeshPhysicalMaterial>(null);
  const t = useRef(seed);
  const star3 = useMemo(() => starShape(0.2), []);
  const tint = useMemo(() => new Color(color), [color]);
  const locked = state === 'locked';

  useFrame((_, dt) => {
    t.current += dt;
    const e = g.current;
    if (e) {
      const bounce = state === 'next' && !reducedMotion ? Math.abs(Math.sin(t.current * 3.2)) * 0.28 : 0;
      const bob = reducedMotion ? 0 : Math.sin(t.current * 1.3 + seed) * 0.06;
      e.position.y = bounce + bob;
      const squashY = state === 'next' && !reducedMotion ? 1 - Math.max(0, 0.12 - bounce * 0.6) : 1;
      e.scale.set(1 / Math.sqrt(squashY), squashY, 1 / Math.sqrt(squashY));
    }
    if (star.current) star.current.rotation.y = reducedMotion ? 0 : Math.sin(t.current * 1.8) * 0.7;
    if (shell.current) shell.current.emissiveIntensity = locked ? 0.05 : 0.35 + (state === 'next' ? Math.sin(t.current * 4) * 0.15 + 0.2 : 0);
  });

  return (
    <group position={position} scale={scale * (locked ? 0.78 : 1)}>
      <Tappable onTap={onTap} hitRadius={0.85} hoverScale={1.12}>
        <group ref={g}>
          <mesh>
            <sphereGeometry args={[0.52, 32, 24]} />
            <meshPhysicalMaterial
              ref={shell}
              color={locked ? '#8d7a90' : color}
              transparent
              opacity={locked ? 0.45 : 0.5}
              roughness={0.08}
              clearcoat={1}
              clearcoatRoughness={0.05}
              emissive={tint}
              emissiveIntensity={0.35}
              depthWrite={false}
            />
          </mesh>
          <sprite scale={0.62} renderOrder={5}>
            <spriteMaterial map={emojiTex(locked ? '🔒' : emoji)} transparent depthWrite={false} opacity={locked ? 0.7 : 1} />
          </sprite>
          {/* specular highlight dot */}
          <mesh position={[-0.2, 0.24, 0.4]} scale={[0.09, 0.06, 0.02]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} toneMapped={false} />
          </mesh>
          {state === 'done' && (
            <group ref={star} position={[0.36, 0.44, 0.1]}>
              <mesh position={[0, 0, -0.035]}>
                <extrudeGeometry args={[star3, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }]} />
                <meshPhysicalMaterial color="#ffc93c" emissive="#ffb000" emissiveIntensity={0.55} roughness={0.25} clearcoat={1} />
              </mesh>
            </group>
          )}
        </group>
      </Tappable>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]}>
        <ringGeometry args={[0.42, 0.62, 40]} />
        <meshBasicMaterial color={state === 'done' ? '#ffc93c' : color} transparent opacity={locked ? 0.2 : 0.75} depthWrite={false} toneMapped={false} />
      </mesh>
      {!locked && (
        <sprite scale={state === 'next' ? 2.1 : 1.6} position={[0, 0, -0.1]} renderOrder={1}>
          <spriteMaterial map={glowTexture()} color={state === 'done' ? '#ffd970' : color} transparent opacity={state === 'next' ? 0.75 : 0.45} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
}
