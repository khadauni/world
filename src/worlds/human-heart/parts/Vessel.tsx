import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { Color, type BufferGeometry } from 'three';
import { VESSEL_FRAG, VESSEL_VERT } from '../shaders/effects';
import { PALETTE } from './palette';

/**
 * A glassy, glowing blood vessel. The geometry must carry an `aOxy` attribute (0 = oxygen-poor/blue,
 * 1 = oxygen-rich/red); pulses of flow travel along its length.
 */
export function Vessel({ geometry, length, opacity = 1, speed = 1 }: { geometry: BufferGeometry; length: number; opacity?: number; speed?: number }) {
  const uniforms = useMemo(
    () => ({
      uPoor: { value: new Color(PALETTE.poor) },
      uRich: { value: new Color(PALETTE.rich) },
      uTime: { value: 0 },
      uLength: { value: length },
      uOpacity: { value: opacity },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  uniforms.uLength.value = length;
  uniforms.uOpacity.value = opacity;
  useFrame((_, dt) => {
    uniforms.uTime.value += Math.min(dt, 0.1) * speed;
  });
  return (
    <mesh geometry={geometry} renderOrder={2}>
      <shaderMaterial vertexShader={VESSEL_VERT} fragmentShader={VESSEL_FRAG} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  );
}
