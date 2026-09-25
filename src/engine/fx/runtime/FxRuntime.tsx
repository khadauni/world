import { addAfterEffect, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  Color,
  Mesh,
  NeutralToneMapping,
  PlaneGeometry,
  ShaderMaterial,
  type Scene,
  type ToneMapping,
} from 'three';
import type { QualityProfile } from '@/core/types';
import type { FxPlan, FxToneMapping } from '../quality/plan';
import { fxStore } from '../store/fxStore';
import { CameraFxRig } from './CameraFxRig';
import { FxSettingsContext, LateFrameContext, createLateFrameRegistry, type FxSettings } from './context';

export const RENDERER_TONE_MAPPING: Readonly<Record<FxToneMapping, ToneMapping>> = {
  aces: ACESFilmicToneMapping,
  agx: AgXToneMapping,
  neutral: NeutralToneMapping,
};

/**
 * The FX heartbeat, mounted once by `<WorldCanvas>` around the world's scene:
 *  - ticks the fx store (pulse envelopes, trauma decay, speed smoothing) once per frame;
 *  - applies camera shake + FOV kick for the main render only and restores the clean camera afterwards;
 *  - dispatches `useLateFrame` callbacks (after every useFrame, before the render — zero-lag emitters);
 *  - on tiers without a composer: sets renderer tone mapping and draws screen flashes itself;
 *  - provides quality / reduced-motion to every FX component via `useFxSettings()`.
 */
export function FxRuntime({
  quality,
  reducedMotion,
  plan,
  children,
}: {
  quality: QualityProfile;
  reducedMotion: boolean;
  plan: FxPlan;
  children?: ReactNode;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const get = useThree((s) => s.get);
  const registry = useMemo(() => createLateFrameRegistry(), []);
  const settings = useMemo<FxSettings>(() => ({ quality, reducedMotion }), [quality, reducedMotion]);
  const frame = useRef({ id: 0, lateId: -1, dt: 0 });

  useLayoutEffect(() => {
    fxStore.getState().setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  // A fresh world starts calm (no pulses leaking in from the previous world).
  useEffect(() => {
    fxStore.getState().reset();
    return () => fxStore.getState().reset();
  }, []);

  // Without a composer the renderer does the tone mapping (with one, the ToneMapping effect does).
  useLayoutEffect(() => {
    if (plan.composer) return;
    gl.toneMapping = RENDERER_TONE_MAPPING[plan.toneMapping];
  }, [gl, plan.composer, plan.toneMapping]);

  useFrame((_, dt) => {
    frame.current.id++;
    frame.current.dt = dt;
  }, -1000);

  useLayoutEffect(() => {
    const rig = new CameraFxRig();
    const previous = scene.onBeforeRender;
    const hook: Scene['onBeforeRender'] = function (this: Scene, renderer, sc, camera, target) {
      previous.call(this, renderer, sc, camera, target);
      const f = frame.current;
      // Only the main camera's render, once per frame (cube cameras / portals / god-ray passes are skipped).
      if (camera !== get().camera || f.lateId === f.id) return;
      f.lateId = f.id;
      const store = fxStore.getState();
      store.tick(f.dt);
      rig.apply(camera, store.signals, store.shake, store.fovKick, f.dt);
      registry.run(f.dt, camera, store.signals.time);
    };
    scene.onBeforeRender = hook;
    const offAfter = addAfterEffect(() => rig.restore());
    return () => {
      offAfter();
      rig.restore();
      if (scene.onBeforeRender === hook) scene.onBeforeRender = previous;
    };
  }, [scene, get, registry]);

  return (
    <FxSettingsContext value={settings}>
      <LateFrameContext value={registry}>
        {children}
        {!plan.composer && plan.flash && <ScreenFlash />}
      </LateFrameContext>
    </FxSettingsContext>
  );
}

/** Full-screen additive flash quad for tiers without a composer (the composer does flashes in its grade pass). */
function ScreenFlash() {
  const mesh = useMemo(() => {
    const m = new Mesh(
      new PlaneGeometry(2, 2),
      new ShaderMaterial({
        uniforms: { uAmount: { value: 0 }, uColor: { value: new Color('#fff4dc') } },
        vertexShader: /* glsl */ `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uAmount; uniform vec3 uColor;
          void main(){ gl_FragColor = vec4(uColor, uAmount); }`,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    m.frustumCulled = false;
    m.renderOrder = 10_000;
    m.visible = false;
    return m;
  }, []);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as ShaderMaterial).dispose();
    },
    [mesh],
  );

  useFrame(() => {
    const amount = fxStore.getState().signals.flashAmount;
    mesh.visible = amount > 0.004;
    (mesh.material as ShaderMaterial).uniforms.uAmount!.value = Math.min(0.85, amount * 0.85);
  });

  return <primitive object={mesh} />;
}
