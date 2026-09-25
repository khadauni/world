import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Sprite, Texture } from 'three';
import { emojiTexture, Glow, Tappable } from '@/engine/kit';
import type { MarkerState } from '../logic/map';
import { labelTexture } from './textures';

const emojiCache = new Map<string, Texture>();
/** Cached emoji texture (the kit helper paints a fresh canvas each call). */
export function emojiTex(emoji: string): Texture {
  let t = emojiCache.get(emoji);
  if (!t) {
    t = emojiTexture(emoji, 128);
    emojiCache.set(emoji, t);
  }
  return t;
}

/**
 * A round, tappable stop badge on the mission map. "next" bounces and glows, "done" wears a star,
 * "locked" is small and grey with a padlock.
 */
export function MapMarker({
  position,
  emoji,
  color,
  state,
  label,
  showLabel,
  onTap,
  size = 1,
  reducedMotion = false,
  labelHeight = 0.04,
}: {
  position: [number, number, number];
  emoji: string;
  color: string;
  state: MarkerState;
  label: string;
  showLabel: boolean;
  onTap: () => void;
  size?: number;
  reducedMotion?: boolean;
  /** Name-tag height as a fraction of the viewport height. */
  labelHeight?: number;
}) {
  const bob = useRef<Group>(null);
  const halo = useRef<Group>(null);
  const t = useRef(position[0] * 1.7 + position[1]);
  useFrame((_, dt) => {
    t.current += reducedMotion ? 0 : dt;
    if (bob.current) {
      const bounce = state === 'next' ? Math.abs(Math.sin(t.current * 3.2)) * 0.28 : Math.sin(t.current * 1.4) * 0.04;
      bob.current.position.y = bounce;
      const squash = state === 'next' ? 1 + Math.max(0, 0.12 - Math.abs(Math.sin(t.current * 3.2)) * 0.5) : 1;
      bob.current.scale.set(1 / Math.sqrt(squash), squash, 1);
    }
    if (halo.current) halo.current.scale.setScalar(1 + Math.sin(t.current * 4) * 0.12);
  });
  const locked = state === 'locked';
  const s = (locked ? 0.75 : 1) * size;
  return (
    <group position={position}>
      <Tappable onTap={onTap} hitRadius={0.85 * s} disabled={locked} hoverScale={1.15}>
        <SpriteLabel text={label} accent={color} position={[0, 0.66 * s, 0]} visible={showLabel && !locked} height={labelHeight} />
        <group ref={bob}>
          <Billboard>
            <group scale={s}>
              {state === 'next' && (
                <group ref={halo}>
                  <Glow color={color} scale={2.6} opacity={0.9} />
                </group>
              )}
              <mesh renderOrder={20}>
                <circleGeometry args={[0.56, 40]} />
                <meshBasicMaterial color={state === 'done' ? '#2fbf71' : '#ffffff'} toneMapped={false} depthTest={false} transparent />
              </mesh>
              <mesh position={[0, 0, 0.001]} renderOrder={21}>
                <circleGeometry args={[0.47, 40]} />
                <meshBasicMaterial color={locked ? '#5b6282' : color} toneMapped={false} depthTest={false} transparent />
              </mesh>
              <mesh position={[0, 0.02, 0.002]} renderOrder={22}>
                <planeGeometry args={[0.62, 0.62]} />
                <meshBasicMaterial map={emojiTex(locked ? '🔒' : emoji)} transparent depthTest={false} toneMapped={false} opacity={locked ? 0.8 : 1} />
              </mesh>
              {state === 'done' && (
                <mesh position={[0.42, 0.42, 0.003]} renderOrder={23}>
                  <planeGeometry args={[0.42, 0.42]} />
                  <meshBasicMaterial map={emojiTex('⭐')} transparent depthTest={false} toneMapped={false} />
                </mesh>
              )}
            </group>
          </Billboard>
        </group>
      </Tappable>
    </group>
  );
}

/**
 * Screen-sized name tag drawn as a sprite (canvas texture): crisp, cheap, always on top, and it can be
 * hidden without mounting/unmounting DOM. `height` is a fraction of the viewport height.
 */
export function SpriteLabel({
  text,
  accent,
  position,
  visible = true,
  height = 0.04,
  anchor = 'bottom',
}: {
  text: string;
  accent: string;
  position: [number, number, number];
  visible?: boolean;
  height?: number;
  anchor?: 'bottom' | 'top';
}) {
  const ref = useRef<Sprite>(null);
  const { texture } = labelTexture(text, accent);
  const shown = useRef(visible ? 1 : 0);
  useFrame((_, dt) => {
    const sp = ref.current;
    if (!sp) return;
    const img = texture.image as { width: number; height: number };
    const aspect = img.width / Math.max(1, img.height);
    shown.current += ((visible ? 1 : 0) - shown.current) * Math.min(1, dt * 8);
    sp.visible = shown.current > 0.02;
    sp.material.opacity = shown.current;
    const k = 0.7 + 0.3 * shown.current;
    sp.scale.set(height * aspect * k, height * k, 1);
  });
  return (
    <sprite ref={ref} position={position} center={[0.5, anchor === 'bottom' ? -0.05 : 1.05]} renderOrder={40} raycast={() => null}>
      <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} sizeAttenuation={false} toneMapped={false} />
    </sprite>
  );
}

/** Bouncing "tap here" hand for auto-assist (points down at the target). */
export function PointerHand({ position, visible = true, scale = 1 }: { position: [number, number, number]; visible?: boolean; scale?: number }) {
  const g = useRef<Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (g.current) g.current.position.y = position[1] + Math.abs(Math.sin(t.current * 4)) * 0.3 * scale;
  });
  if (!visible) return null;
  return (
    <group ref={g} position={position}>
      <sprite scale={[0.9 * scale, 0.9 * scale, 1]} renderOrder={30}>
        <spriteMaterial map={emojiTex('👇')} transparent depthTest={false} toneMapped={false} />
      </sprite>
    </group>
  );
}
