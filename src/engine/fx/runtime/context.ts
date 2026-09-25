import { useFrame } from '@react-three/fiber';
import { createContext, useContext, useLayoutEffect, useRef } from 'react';
import type { Camera } from 'three';
import { QUALITY } from '@/core/quality';
import type { QualityProfile } from '@/core/types';

/** Quality + motion settings every FX component scales itself by. Provided by `<FxRuntime>` (inside WorldCanvas). */
export interface FxSettings {
  readonly quality: QualityProfile;
  readonly reducedMotion: boolean;
}

const DEFAULT_SETTINGS: FxSettings = { quality: QUALITY.high, reducedMotion: false };

export const FxSettingsContext = createContext<FxSettings>(DEFAULT_SETTINGS);

/** Current quality profile + reduced-motion flag (defaults to high / full motion outside `<FxRuntime>`). */
export function useFxSettings(): FxSettings {
  return useContext(FxSettingsContext);
}

/**
 * Called once per frame right BEFORE the main render — after every `useFrame`, with fresh world matrices and
 * the final (shaken, FOV-kicked) camera. `dt` is the frame delta in seconds, `time` the FX clock.
 */
export type LateFrameCallback = (dt: number, camera: Camera, time: number) => void;

export interface LateFrameRegistry {
  add(callback: { readonly current: LateFrameCallback }): () => void;
}

export const LateFrameContext = createContext<LateFrameRegistry | null>(null);

/** Creates the registry `<FxRuntime>` dispatches from `scene.onBeforeRender`. */
export function createLateFrameRegistry(): LateFrameRegistry & { run(dt: number, camera: Camera, time: number): void } {
  const callbacks: { readonly current: LateFrameCallback }[] = [];
  return {
    add(cb) {
      callbacks.push(cb);
      return () => {
        const i = callbacks.indexOf(cb);
        if (i >= 0) callbacks.splice(i, 1);
      };
    },
    run(dt, camera, time) {
      for (let i = 0; i < callbacks.length; i++) callbacks[i]?.current(dt, camera, time);
    },
  };
}

/**
 * Like `useFrame`, but runs after all `useFrame`s, right before the render. Use it for anything that must follow
 * a moving object without a one-frame lag (particle emitters on a ship, lens flares, camera-anchored effects).
 * Falls back to a normal `useFrame` when used outside `<FxRuntime>`.
 */
export function useLateFrame(callback: LateFrameCallback): void {
  const registry = useContext(LateFrameContext);
  const ref = useRef(callback);
  useLayoutEffect(() => {
    ref.current = callback;
  });
  useLayoutEffect(() => (registry ? registry.add(ref) : undefined), [registry]);
  useFrame((state, dt) => {
    if (!registry) ref.current(dt, state.camera, state.clock.elapsedTime);
  });
}
