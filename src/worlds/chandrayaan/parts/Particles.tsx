import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, NormalBlending, type PerspectiveCamera, type ShaderMaterial } from 'three';
import { mulberry32 } from '@/core/random';
import { PARTICLE_FRAG, PARTICLE_VERT } from '../shaders/effects';

type V3 = readonly [number, number, number];

export interface ParticleConfig {
  /** Particle count before quality scaling. */
  count: number;
  /** 'glow' additive sparks/fire · 'smoke' lit cotton-ball puffs · 'sparkle' twinkling confetti. */
  mode: 'glow' | 'smoke' | 'sparkle';
  life: number;
  emitter?: V3;
  spawnRadius?: number;
  dir?: V3;
  /** 0 = straight along dir, 1 = hemisphere, 2 = full sphere. */
  spread?: number;
  speed?: readonly [number, number];
  gravity?: V3;
  drag?: number;
  size?: readonly [number, number];
  color?: string;
  color2?: string;
  shadow?: string;
  palette?: readonly [string, string, string];
  opacity?: number;
  /** Squash vertical velocity (1 = flat ground-hugging cloud). */
  flat?: number;
  /** Burst: particles are born over this many seconds. */
  burstSpread?: number;
  /** Spawn height rises as rise·t² after start (follows an accelerating rocket). */
  rise?: number;
  seed?: number;
}

/**
 * GPU particle emitter. `loop` emits continuously while `active`; otherwise each change of `trigger`
 * fires one burst. All motion is computed in the vertex shader, so there is no per-frame CPU cost.
 */
export function Particles({
  config,
  loop = false,
  active = true,
  trigger = 0,
  scale = 1,
  position,
}: {
  config: ParticleConfig;
  loop?: boolean;
  active?: boolean;
  trigger?: number;
  scale?: number;
  position?: V3;
}) {
  const mat = useRef<ShaderMaterial>(null);
  const clock = useRef(0);
  const count = Math.max(4, Math.round(config.count * scale));
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const rand = mulberry32(config.seed ?? 5);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = rand();
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aSeed', new BufferAttribute(seeds, 4));
    return g;
  }, [count, config.seed]);

  // Emitters created inactive start "stopped", so nothing is born before the first effect runs.
  const startActive = useRef(active);
  const uniforms = useMemo(() => {
    const c = config;
    const pal = c.palette ?? ['#ffffff', '#ffffff', '#ffffff'];
    return {
      uTime: { value: 0 },
      uStart: { value: loop ? 0 : -1000 },
      uStop: { value: loop && !startActive.current ? -1 : 1e9 },
      uLoop: { value: loop ? 1 : 0 },
      uLife: { value: c.life },
      uBurstSpread: { value: c.burstSpread ?? 0 },
      uEmitter: { value: c.emitter ?? [0, 0, 0] },
      uSpawnR: { value: c.spawnRadius ?? 0 },
      uDir: { value: c.dir ?? [0, 1, 0] },
      uSpread: { value: c.spread ?? 0.3 },
      uSpeed: { value: c.speed ?? [1, 2] },
      uGravity: { value: c.gravity ?? [0, 0, 0] },
      uDrag: { value: c.drag ?? 0 },
      uSize: { value: c.size ?? [0.2, 0.4] },
      uScale: { value: 400 },
      uRise: { value: c.rise ?? 0 },
      uFlat: { value: c.flat ?? 0 },
      uColor0: { value: new Color(c.color ?? '#ffffff') },
      uColor1: { value: new Color(c.color2 ?? c.color ?? '#ffffff') },
      uShadow: { value: new Color(c.shadow ?? '#8a90a8') },
      uPalette: { value: pal.map((p) => new Color(p)) },
      uUsePalette: { value: c.palette ? 1 : 0 },
      uMode: { value: c.mode === 'glow' ? 0 : c.mode === 'smoke' ? 1 : 2 },
      uOpacity: { value: c.opacity ?? 1 },
      uLight: { value: [-0.5, 0.7, 0.55] },
    };
    // Config objects are module constants, so this only rebuilds if a different emitter is passed.
  }, [config, loop]);

  // Bursts restart on each trigger change; loops start/stop with `active`.
  useEffect(() => {
    const u = mat.current?.uniforms;
    if (!u) return;
    const stop = u.uStop as { value: number };
    if (loop) {
      if (active) {
        (u.uStart as { value: number }).value = clock.current;
        stop.value = 1e9;
      } else if (stop.value > clock.current) stop.value = clock.current;
    } else if (trigger > 0) (u.uStart as { value: number }).value = clock.current;
  }, [trigger, loop, active]);

  useFrame((_, dt) => {
    clock.current += Math.min(dt, 0.25);
    const u = mat.current?.uniforms;
    if (!u) return;
    (u.uTime as { value: number }).value = clock.current;
    (u.uScale as { value: number }).value = (size.height * dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360));
  });

  const additive = config.mode !== 'smoke';
  return (
    <points geometry={geometry} frustumCulled={false} position={position as [number, number, number] | undefined} renderOrder={additive ? 6 : 5}>
      <shaderMaterial
        ref={mat}
        vertexShader={PARTICLE_VERT}
        fragmentShader={PARTICLE_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={additive ? AdditiveBlending : NormalBlending}
        toneMapped={!additive}
      />
    </points>
  );
}
