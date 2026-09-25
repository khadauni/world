import { useMemo } from 'react';
import { BackSide, Color, Vector3 } from 'three';
import { SPACE_FRAG, SPACE_VERT } from '../shaders/effects';

/**
 * Soft Milky Way + faint nebulae behind the starfield: one draw call, computed from the view direction (crisp at
 * any zoom, nothing to download or paint). `strength` dims it above the sunlit Moon so the heroes stay the stars.
 * Drawn after the other opaque objects so the depth test skips every pixel already covered by a planet or the ground.
 */
export function SpaceBackdrop({ strength = 1, detail = 1 }: { strength?: number; detail?: number }) {
  const uniforms = useMemo(
    () => ({
      uBase: { value: new Color('#05071a') },
      uBandA: { value: new Color('#1c2150') },
      uBandB: { value: new Color('#3a2c5c') },
      uNebA: { value: new Color('#2a0f33') },
      uNebB: { value: new Color('#0c2a3a') },
      uNormal: { value: new Vector3(0.3, 0.9, 0.32).normalize() },
      uStrength: { value: strength },
    }),
    [strength],
  );
  const defines = useMemo(() => ({ DETAIL: detail >= 0.95 ? 1 : 0 }), [detail]);
  return (
    <mesh renderOrder={50} frustumCulled={false} rotation={[0, 0.6, 0]}>
      <sphereGeometry args={[950, 32, 16]} />
      <shaderMaterial vertexShader={SPACE_VERT} fragmentShader={SPACE_FRAG} uniforms={uniforms} defines={defines} side={BackSide} depthWrite={false} />
    </mesh>
  );
}
