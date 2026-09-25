import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import type { PerspectiveCamera } from 'three';
import { Starfield, StudioLights } from '@/engine/kit';
import type { WorldRuntimeProps } from '@/core/types';
import { hudFor, hudShiftPx } from './logic/camera';
import { setForPhase } from './logic/map';
import { Iris } from './parts/Iris';
import { SpaceBackdrop } from './parts/SpaceBackdrop';
import { live, resetLive, useMission } from './store';
import type { StopProps } from './stops/common';
import { LandingSet } from './stops/LandingSet';
import { LaunchSet } from './stops/LaunchSet';
import { MapSet } from './stops/MapSet';
import { NightSet } from './stops/NightSet';
import { OrbitSet } from './stops/OrbitSet';
import { RoverSet } from './stops/RoverSet';
import { SeparationSet } from './stops/SeparationSet';
import { TransferSet } from './stops/TransferSet';

/** Studio fill/reflection strength per set (the Moon night must be able to go properly dark). */
const STUDIO: Record<string, number> = { landing: 0.2, 'pragyan-rover': 0.2, 'moon-night': 0.1 };
/** How bright the painted Milky Way is per set: full in open space, dimmer above the sunlit Moon. */
const SKY: Record<string, number> = { landing: 0.4, 'pragyan-rover': 0.4, 'moon-night': 0.7 };

/** One 3D "set" per stop, plus the mission map. Only the visible one is mounted. */
const SETS: Record<string, ComponentType<StopProps>> = {
  map: MapSet,
  'launch-pad': LaunchSet,
  'earth-orbit': OrbitSet,
  'to-the-moon': TransferSet,
  separation: SeparationSet,
  landing: LandingSet,
  'pragyan-rover': RoverSet,
  'moon-night': NightSet,
};

/**
 * Keep the subject in the band the HUD leaves free: animate how much the HUD covers for the current phase
 * (live.hudTop/hudBottom, also used by ShotCamera for fitting) and shift the rendered image to match.
 */
function useHudFrame(phase: string, taskKind: string | null) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const applied = useRef({ w: 0, h: 0, shift: -1 });
  const goal = useMemo(() => hudFor(phase, height, taskKind), [phase, height, taskKind]);
  useLayoutEffect(() => {
    if (applied.current.shift < 0) {
      live.hudTop = goal[0];
      live.hudBottom = goal[1];
    }
  }, [goal]);
  useLayoutEffect(
    () => () => {
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
    },
    [camera],
  );
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 3.5);
    live.hudTop += (goal[0] - live.hudTop) * k;
    live.hudBottom += (goal[1] - live.hudBottom) * k;
    const shift = Math.round(hudShiftPx(height, live.hudTop, live.hudBottom) * 2) / 2;
    const a = applied.current;
    if (a.w !== width || a.h !== height || Math.abs(a.shift - shift) > 0.25) {
      camera.setViewOffset(width, height, 0, shift, width, height);
      camera.updateProjectionMatrix();
      a.w = width;
      a.h = height;
      a.shift = shift;
    }
  });
}

/**
 * Scene director: decides which set is on screen, runs the cartoon iris wipe between sets (hiding the
 * swap and any shader warm-up), and makes sure `actions.arrive()` is called exactly once per flight.
 */
export function Scene(props: WorldRuntimeProps) {
  const { phase, stopId, reducedMotion, quality, actions, task } = props;
  const desired = setForPhase(phase, stopId);
  const [shown, setShown] = useState(desired);
  const iris = useRef(1.2);
  const pending = useRef<string | null>(null);
  const hold = useRef(0);
  const swapping = useRef(false);
  const clock = useRef(0);
  const shownAt = useRef(0);
  const arrived = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useHudFrame(phase, task?.kind ?? null);

  useEffect(() => {
    if (phase === 'travel') arrived.current = false;
  }, [phase, stopId]);

  const onArrive = useCallback(() => {
    if (phaseRef.current !== 'travel' || arrived.current) return;
    arrived.current = true;
    actions.arrive();
  }, [actions]);

  // Queue a set change; reduced motion swaps instantly.
  useEffect(() => {
    if (desired === shown) {
      pending.current = null;
      return;
    }
    if (reducedMotion) {
      setShown(desired);
      return;
    }
    if (pending.current !== desired) {
      pending.current = desired;
      // Leaving the map for a flight: let the camera zoom to the tapped badge first.
      hold.current = shown === 'map' && phaseRef.current === 'travel' ? 0.7 : 0;
    }
  }, [desired, shown, reducedMotion]);

  useLayoutEffect(() => {
    swapping.current = false;
    shownAt.current = clock.current;
    useMission.getState().reset();
    resetLive();
  }, [shown]);

  useFrame((_, dt) => {
    // Wall-clock based (clamped generously) so transitions finish on time even on very slow devices.
    const step = Math.min(dt, 0.25);
    clock.current += step;
    if (pending.current) {
      if (hold.current > 0) hold.current -= step;
      else {
        iris.current = Math.max(-0.05, iris.current - step * 2.8);
        if (iris.current <= -0.05 && !swapping.current) {
          swapping.current = true;
          const next = pending.current;
          pending.current = null;
          setShown(next);
        }
      }
    } else if (!swapping.current && iris.current < 1.2) {
      // Wait a beat after the swap so new shaders compile behind the closed iris.
      if (clock.current - shownAt.current > 0.12) iris.current = Math.min(1.2, iris.current + step * 1.6);
    }
    if (phaseRef.current === 'travel' && !arrived.current && shown !== 'map' && !pending.current && !swapping.current && clock.current - shownAt.current > 3.4) onArrive();
  });

  const StopSet = SETS[shown] ?? MapSet;
  return (
    <>
      <StudioLights intensity={STUDIO[shown] ?? 0.32} />
      {shown !== 'launch-pad' && (
        <>
          {quality.tier !== 'low' && <SpaceBackdrop strength={SKY[shown] ?? 1} detail={quality.detail} />}
          <Starfield count={Math.round(3200 * quality.particleScale)} radius={520} depth={300} />
        </>
      )}
      <StopSet key={shown} {...props} arriving={phase === 'travel' && shown === stopId} onArrive={onArrive} />
      {!reducedMotion && <Iris radius={iris} />}
    </>
  );
}
