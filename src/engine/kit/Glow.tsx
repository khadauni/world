import { AdditiveBlending } from 'three';
import { glowTexture } from './glowTexture';

/** Additive glow sprite — halos for suns, targets, engine flames. */
export function Glow({
  color = '#ffffff',
  scale = 1,
  opacity = 1,
  position,
}: {
  color?: string;
  scale?: number;
  opacity?: number;
  position?: [number, number, number];
}) {
  return (
    <sprite scale={[scale, scale, scale]} position={position} renderOrder={10}>
      <spriteMaterial map={glowTexture()} color={color} transparent opacity={opacity} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </sprite>
  );
}
