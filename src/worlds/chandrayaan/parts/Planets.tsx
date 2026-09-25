import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, BackSide, Color, Vector3, Vector4, type Group, type ShaderMaterial } from 'three';
import { WORLD_VERT } from '../shaders/common';
import { CLOUD_FRAG, EARTH_FRAG, HALO_FRAG, HALO_VERT, MOON_FRAG } from '../shaders/planets';
import { landMaskTexture } from './textures';

type V3 = readonly [number, number, number];

/** Noise octaves by quality: fewer on medium/low tiers (cheaper fragments on tablets). */
export function octaveDefines(detail: number): Record<string, number> {
  return { OCTAVES: detail >= 0.95 ? 4 : detail >= 0.7 ? 3 : 2 };
}

/** Soft atmosphere halo shell around a planet. */
function Halo({ radius, color, sun, intensity = 1.4, thickness = 1.14, sunBias = 0.8, segments }: { radius: number; color: string; sun: V3; intensity?: number; thickness?: number; sunBias?: number; segments: number }) {
  const uniforms = useMemo(() => {
    const edge = Math.sqrt(1 - 1 / (thickness * thickness));
    return {
      uColor: { value: new Color(color) },
      uSun: { value: new Vector3(...sun) },
      uEdge: { value: edge },
      uIntensity: { value: intensity },
      uSunBias: { value: sunBias },
    };
  }, [color, sun, intensity, thickness, sunBias]);
  return (
    <mesh scale={thickness} renderOrder={2}>
      <sphereGeometry args={[radius, segments, Math.round(segments * 0.66)]} />
      <shaderMaterial vertexShader={HALO_VERT} fragmentShader={HALO_FRAG} uniforms={uniforms} side={BackSide} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

/**
 * Stylised Earth: continents from a painted mask, deserts by latitude, polar ice, ocean glint,
 * a drifting cloud shell and a glowing blue atmosphere.
 */
export function Earth({
  radius = 1,
  sun = [1, 0.4, 0.6],
  rotationY = 0,
  tilt = 0.25,
  detail = 1,
  clouds = true,
  spin = 0,
  haloIntensity = 1.4,
}: {
  radius?: number;
  sun?: V3;
  rotationY?: number;
  tilt?: number;
  detail?: number;
  clouds?: boolean;
  spin?: number;
  haloIntensity?: number;
}) {
  const seg = Math.max(24, Math.round(72 * detail));
  const cloudMat = useRef<ShaderMaterial>(null);
  const spinRef = useRef<Group>(null);
  const uniforms = useMemo(
    () => ({
      uLand: { value: landMaskTexture() },
      uSun: { value: new Vector3(...sun).normalize() },
      uDeep: { value: new Color('#0b4fb3') },
      uShallow: { value: new Color('#1fb6d9') },
      uGreen: { value: new Color('#5fc44a') },
      uForest: { value: new Color('#2f8f3c') },
      uSand: { value: new Color('#e9c77e') },
      uIce: { value: new Color('#f4f9ff') },
      uNight: { value: new Color('#0a1540') },
      uRim: { value: new Color('#7cc4ff') },
    }),
    [sun],
  );
  const cloudUniforms = useMemo(() => ({ uSun: { value: new Vector3(...sun).normalize() }, uTime: { value: 0 }, uAmount: { value: 0.02 } }), [sun]);
  const defines = useMemo(() => octaveDefines(detail), [detail]);

  useFrame((_, dt) => {
    if (cloudMat.current) (cloudMat.current.uniforms.uTime as { value: number }).value += dt;
    if (spin && spinRef.current) spinRef.current.rotation.y += dt * spin;
  });

  return (
    <group rotation={[tilt * 0.5, 0, 0]}>
      <group ref={spinRef} rotation={[0, rotationY, 0]}>
        <mesh>
          <sphereGeometry args={[radius, seg, Math.round(seg * 0.66)]} />
          <shaderMaterial vertexShader={WORLD_VERT} fragmentShader={EARTH_FRAG} uniforms={uniforms} defines={defines} />
        </mesh>
        {clouds && (
          <mesh scale={1.018}>
            <sphereGeometry args={[radius, seg, Math.round(seg * 0.66)]} />
            <shaderMaterial ref={cloudMat} vertexShader={WORLD_VERT} fragmentShader={CLOUD_FRAG} uniforms={cloudUniforms} defines={defines} transparent depthWrite={false} />
          </mesh>
        )}
      </group>
      <Halo radius={radius} color="#5fb4ff" sun={sun} intensity={haloIntensity} segments={Math.round(seg * 0.6)} />
    </group>
  );
}

/** Near-side maria (dark "seas") on the unit sphere + angular size — gives the familiar Moon face. */
const MARIA: readonly [number, number, number, number][] = [
  [-0.45, 0.55, 0.7, 0.42], // Imbrium
  [0.18, 0.42, 0.88, 0.3], // Serenitatis
  [0.35, 0.12, 0.92, 0.32], // Tranquillitatis
  [0.72, 0.28, 0.63, 0.2], // Crisium
  [-0.72, 0.12, 0.68, 0.5], // Procellarum
  [-0.18, -0.35, 0.92, 0.26], // Nubium
  [0.3, -0.25, 0.92, 0.22], // Nectaris/Fecunditatis
];

/** Stylised Moon: maria, layered craters with bump shading, earthshine fill and a soft rim. */
export function Moon({
  radius = 1,
  sun = [1, 0.3, 0.5],
  detail = 1,
  ambient = 0.07,
  bump = 1,
  southCraters = 1,
  rotation,
  halo = true,
}: {
  radius?: number;
  sun?: V3;
  detail?: number;
  ambient?: number;
  bump?: number;
  southCraters?: number;
  rotation?: [number, number, number];
  halo?: boolean;
}) {
  const seg = Math.max(28, Math.round(80 * detail));
  const uniforms = useMemo(
    () => ({
      uSun: { value: new Vector3(...sun).normalize() },
      uBase: { value: new Color('#bdbab5') },
      uMare: { value: new Color('#6e7079') },
      uAmbient: { value: ambient },
      uBump: { value: bump * radius * 0.07 },
      uSouthCraters: { value: southCraters },
      uMaria: { value: MARIA.map((m) => new Vector4(...m)) },
    }),
    [sun, ambient, bump, radius, southCraters],
  );
  const defines = useMemo(() => octaveDefines(detail), [detail]);
  return (
    <group rotation={rotation}>
      <mesh>
        <sphereGeometry args={[radius, seg, Math.round(seg * 0.66)]} />
        <shaderMaterial vertexShader={WORLD_VERT} fragmentShader={MOON_FRAG} uniforms={uniforms} defines={defines} />
      </mesh>
      {halo && <Halo radius={radius} color="#c9d4ff" sun={sun} intensity={0.35} thickness={1.08} sunBias={0.6} segments={Math.round(seg * 0.5)} />}
    </group>
  );
}
