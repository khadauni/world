import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, lazy, useState, type ReactNode } from 'react';
import type { QualityProfile, WorldCanvasConfig } from '@/core/types';

const Effects = lazy(() => import('./kit/Effects'));

/**
 * The one <Canvas> every world renders into. Owns renderer settings, adaptive resolution,
 * optional bloom, and pausing (e.g. while a quiz covers the scene, to save battery on tablets).
 */
export function WorldCanvas({
  config,
  quality,
  paused,
  onContextLost,
  children,
}: {
  config: WorldCanvasConfig;
  quality: QualityProfile;
  paused: boolean;
  onContextLost: () => void;
  children: ReactNode;
}) {
  const [dpr, setDpr] = useState<number>(quality.dpr[1]);
  const bloom = quality.bloom && config.bloom ? config.bloom : null;

  return (
    <Canvas
      dpr={dpr}
      frameloop={paused ? 'demand' : 'always'}
      shadows={quality.shadows}
      gl={{ antialias: quality.antialias, powerPreference: 'high-performance', alpha: false, stencil: false }}
      camera={{
        position: [...config.camera.position],
        fov: config.camera.fov ?? 50,
        near: 0.1,
        far: config.camera.far ?? 2000,
      }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          onContextLost();
        });
      }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
      aria-hidden="true"
    >
      <color attach="background" args={[config.background]} />
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(quality.dpr[0], +(d - 0.25).toFixed(2)))}
        onIncline={() => setDpr((d) => Math.min(quality.dpr[1], +(d + 0.25).toFixed(2)))}
        flipflops={4}
        onFallback={() => setDpr(quality.dpr[0])}
      />
      <Suspense fallback={null}>{children}</Suspense>
      {bloom && (
        <Suspense fallback={null}>
          <Effects intensity={bloom.intensity} luminanceThreshold={bloom.luminanceThreshold} />
        </Suspense>
      )}
    </Canvas>
  );
}
