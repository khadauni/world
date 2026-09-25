import { useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import { NoToneMapping } from 'three';
import type { WorldRuntimeProps } from '@/core/types';
import { StudioLights } from '@/engine/kit';
import { content } from './content';
import { isBodyId } from './layout';
import { AsteroidBelt, Backdrop, OrbitRings } from './parts/Backdrop';
import { Bursts } from './parts/Bursts';
import { CameraDirector } from './parts/CameraDirector';
import { Jupiter, Neptune, Saturn, Uranus } from './parts/Giants';
import { MapHotspots } from './parts/MapHotspots';
import { LabelProjector } from './parts/Pin';
import { Earth, Mars, Mercury, Venus } from './parts/Planets';
import { Rocket, Trail } from './parts/Rocket';
import { SpeedLines } from './parts/SpeedLines';
import { Sun } from './parts/Sun';
import { SystemClock } from './parts/SystemClock';
import { SolarContext, createSolarState } from './state';
import { stopStatus } from './status';
import { TaskStage } from './tasks/TaskStage';

/**
 * Colours are authored for a flat (non-filmic) pipeline so the palette stays saturated and identical on
 * every quality tier (the bloom tier already renders without tone mapping).
 */
function useFlatToneMapping() {
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    const prev = gl.toneMapping;
    gl.toneMapping = NoToneMapping;
    return () => {
      gl.toneMapping = prev;
    };
  }, [gl]);
}

/** Solar System Voyage — the whole 3D world. */
export function Scene({ band, quality, reducedMotion, phase, stopId, completedStops, explorer, actions }: WorldRuntimeProps) {
  const sys = useMemo(createSolarState, []);
  const dpr = useThree((s) => s.viewport.dpr);
  useFlatToneMapping();
  const status = useMemo(() => stopStatus(completedStops), [completedStops]);
  const focus = isBodyId(stopId) ? stopId : null;
  const overview = phase === 'map' || phase === 'intro';

  useEffect(() => {
    if (stopId !== 'venus') sys.venusReveal = 0;
  }, [stopId, sys]);
  useEffect(() => {
    sys.reducedMotion = reducedMotion;
  }, [reducedMotion, sys]);

  return (
    <SolarContext.Provider value={sys}>
      <StudioLights intensity={0.5} environment={quality.tier !== 'low'} />
      <Backdrop quality={quality} reducedMotion={reducedMotion} />
      <SystemClock phase={phase} reducedMotion={reducedMotion} />

      <Sun quality={quality} face={band !== 'senior'} />
      <Mercury quality={quality} />
      <Venus quality={quality} />
      <Earth quality={quality} />
      <Mars quality={quality} />
      <Jupiter quality={quality} />
      <Saturn quality={quality} />
      <Uranus quality={quality} />
      <Neptune quality={quality} />
      <OrbitRings status={status} phase={phase} />
      <AsteroidBelt quality={quality} reducedMotion={reducedMotion} />

      <Rocket avatar={explorer.avatar} detail={quality.detail} />
      <Trail pixelRatio={dpr} />
      <SpeedLines enabled={!reducedMotion} />
      <Bursts pixelRatio={dpr} scale={Math.max(0.5, quality.particleScale)} />

      <CameraDirector phase={phase} stopId={stopId} band={band} reducedMotion={reducedMotion} actions={actions} />
      {overview && <MapHotspots stops={content.stops} status={status} band={band} actions={actions} reducedMotion={reducedMotion} />}
      {phase === 'task' && focus && <TaskStage key={focus} stop={focus} band={band} actions={actions} reducedMotion={reducedMotion} quality={quality} />}
      <LabelProjector />
    </SolarContext.Provider>
  );
}
