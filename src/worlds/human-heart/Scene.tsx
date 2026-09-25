import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import type { PerspectiveCamera } from 'three';
import { StudioLights } from '@/engine/kit';
import type { WorldRuntimeProps } from '@/core/types';
import { hudFor, hudShiftPx } from './logic/camera';
import { Backdrop, Bokeh } from './parts/Backdrop';
import { HeartIris } from './parts/HeartIris';
import { LabelProjector } from './parts/Tag';
import { live, useHeart } from './store';
import type { StopProps } from './stops/common';
import { BeatSet } from './stops/BeatSet';
import { HealthySet } from './stops/HealthySet';
import { LabSet } from './stops/LabSet';
import { MapSet } from './stops/MapSet';
import { MeetSet } from './stops/MeetSet';
import { RideSet } from './stops/RideSet';
import { RoomsSet } from './stops/RoomsSet';
import { ValvesSet } from './stops/ValvesSet';

/** One 3D "set" per stop, plus the overview map. Only the visible one is mounted (keeps the scene light). */
const SETS: Record<string, ComponentType<StopProps>> = {
  map: MapSet,
  'meet-heart': MeetSet,
  heartbeat: BeatSet,
  'four-rooms': RoomsSet,
  'take-apart': LabSet,
  valves: ValvesSet,
  'blood-ride': RideSet,
  'healthy-heart': HealthySet,
};

/** Backdrop mood per set: the meet stop is darker so the glowing x-ray body pops. */
const MOOD: Record<string, { center: string; mid: string; edge: string; light: number }> = {
  map: { center: '#ff9bb8', mid: '#b83266', edge: '#3a0b26', light: 1 },
  'meet-heart': { center: '#7a2d7a', mid: '#3d1250', edge: '#14061f', light: 0.7 },
  heartbeat: { center: '#ffb0c4', mid: '#c2386a', edge: '#40092a', light: 1 },
  'four-rooms': { center: '#ffc2d0', mid: '#a93a78', edge: '#2b0b30', light: 1 },
  'take-apart': { center: '#ffd9b8', mid: '#b8456f', edge: '#35102c', light: 1.05 },
  valves: { center: '#9ff0e4', mid: '#2f7f8f', edge: '#0c2330', light: 1 },
  'blood-ride': { center: '#d2557f', mid: '#651640', edge: '#1c0513', light: 1 },
  'healthy-heart': { center: '#fff1b8', mid: '#ff8f8f', edge: '#7a2448', light: 1.1 },
};

export function setForPhase(phase: string, stopId: string | null): string {
  if (!stopId || phase === 'intro' || phase === 'map' || phase === 'finale') return 'map';
  return SETS[stopId] ? stopId : 'map';
}

/**
 * Keep the subject in the band the HUD leaves free: animate how much the HUD covers for the current phase
 * (live.hudTop/hudBottom, also used for camera fitting) and shift the rendered image to match.
 */
function useHudFrame(phase: string, taskKind: string | null, big: boolean) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const applied = useRef({ w: 0, h: 0, shift: -1 });
  const goal = useMemo(() => hudFor(phase, taskKind, height, big), [phase, taskKind, height, big]);
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
    // During tasks, frame around the controls actually on screen (tray, drum, prompt) when measured.
    const bottom = phase === 'task' && live.overlayBottom > 0 ? Math.min(height * 0.42, Math.max(30, live.overlayBottom + 12)) : goal[1];
    live.hudTop += (goal[0] - live.hudTop) * k;
    live.hudBottom += (bottom - live.hudBottom) * k;
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
 * Scene director: picks the set on screen, runs the heart-shaped iris wipe between sets (hiding the swap
 * and shader warm-up), and makes sure `actions.arrive()` is called exactly once per flight.
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
  const gl = useThree((s) => s.gl);

  useHudFrame(phase, task?.kind ?? null, props.band === 'tiny');

  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

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
      // Leaving the map for a flight: let the camera swoop towards the tapped bubble first.
      hold.current = shown === 'map' && phaseRef.current === 'travel' ? 0.75 : 0;
    }
  }, [desired, shown, reducedMotion]);

  useLayoutEffect(() => {
    swapping.current = false;
    shownAt.current = clock.current;
    useHeart.getState().reset();
  }, [shown]);

  useFrame((_, dt) => {
    // Wall-clock based (clamped generously) so transitions finish on time even on slow devices.
    const step = Math.min(dt, 0.25);
    clock.current += step;
    if (pending.current) {
      if (hold.current > 0) hold.current -= step;
      else {
        iris.current = Math.max(-0.05, iris.current - step * 2.6);
        if (iris.current <= -0.05 && !swapping.current) {
          swapping.current = true;
          const next = pending.current;
          pending.current = null;
          setShown(next);
        }
      }
    } else if (!swapping.current && iris.current < 1.2) {
      // Wait a beat after the swap so new shaders compile behind the closed iris.
      if (clock.current - shownAt.current > 0.15) iris.current = Math.min(1.2, iris.current + step * 1.5);
    }
    // Safety net: never leave a child waiting on a camera that can't settle.
    if (phaseRef.current === 'travel' && !arrived.current && shown !== 'map' && !pending.current && !swapping.current && clock.current - shownAt.current > 3.6) onArrive();
  });

  const Set = SETS[shown] ?? MapSet;
  const mood = MOOD[shown] ?? (MOOD.map as (typeof MOOD)[string]);
  return (
    <>
      <StudioLights intensity={mood.light} keyColor="#fff0f2" rimColor="#a8e6ff" />
      <Backdrop center={mood.center} mid={mood.mid} edge={mood.edge} calm={reducedMotion} />
      <Bokeh count={Math.round(46 * quality.particleScale)} radius={16} center={[0, 0, -6]} calm={reducedMotion} />
      <Set key={shown} {...props} arriving={phase === 'travel' && shown === stopId} onArrive={onArrive} />
      {/* Keyed with the set so it re-subscribes after it: tags are projected once everything has moved. */}
      <LabelProjector key={shown} />
      {!reducedMotion && <HeartIris radius={iris} />}
    </>
  );
}
