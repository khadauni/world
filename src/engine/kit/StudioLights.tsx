import { Environment, Lightformer } from '@react-three/drei';

/**
 * "Animated film" lighting rig: warm key, cool rim, soft fill, plus a procedural environment
 * (Lightformers rendered into a cube map on the GPU — no HDR file download) for glossy, rounded surfaces.
 */
export function StudioLights({
  keyColor = '#fff1dc',
  rimColor = '#9fc2ff',
  intensity = 1,
  environment = true,
  castShadow = false,
}: {
  keyColor?: string;
  rimColor?: string;
  intensity?: number;
  environment?: boolean;
  castShadow?: boolean;
}) {
  return (
    <>
      <hemisphereLight args={['#cfe0ff', '#2a1f3d', 0.55 * intensity]} />
      <directionalLight
        position={[6, 8, 5]}
        intensity={2.4 * intensity}
        color={keyColor}
        castShadow={castShadow}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-7, 3, -6]} intensity={1.6 * intensity} color={rimColor} />
      <pointLight position={[0, -4, 6]} intensity={0.6 * intensity} color="#ffd1e8" distance={30} />
      {environment && (
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 5, -9]} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={1.4} color="#ffe2c4" position={[-6, 2, 3]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
          <Lightformer form="ring" intensity={1.2} color="#b9d2ff" position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={4} />
          <Lightformer form="circle" intensity={0.8} color="#ffd7f0" position={[0, -5, 0]} rotation-x={Math.PI / 2} scale={6} />
        </Environment>
      )}
    </>
  );
}
