import { useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { AdditiveBlending, CanvasTexture, Color, DynamicDrawUsage, NormalBlending, Object3D, SRGBColorSpace, type InstancedMesh, type Sprite, type SpriteMaterial, type Vector3 } from 'three';
import { glowTexture } from '@/engine/kit';
import type { Vec3 } from './geometry';

export interface BurstHandle {
  /** Sparkle burst at a point (world space of the Burst's parent). */
  fire(at: Vec3 | Vector3, color?: string, amount?: number, speed?: number): void;
}

const WHITE = new Color('#ffffff');

interface P {
  life: number;
  max: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  s: number;
}

/**
 * Pooled confetti-sparkle bursts (one instanced draw call). Juicy feedback for every success;
 * `reducedMotion` keeps them small and short.
 */
export const Burst = forwardRef<BurstHandle, { count?: number; reducedMotion?: boolean; soft?: boolean }>(function Burst({ count = 90, reducedMotion = false, soft = false }, ref) {
  const mesh = useRef<InstancedMesh>(null);
  const camera = useThree((s) => s.camera);
  const pool = useMemo<P[]>(() => Array.from({ length: count }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0 })), [count]);
  const cursor = useRef(0);
  const dummy = useMemo(() => new Object3D(), []);
  const col = useMemo(() => new Color(), []);
  const tint = useMemo(() => new Color(), []);
  const dirty = useRef(true);

  useImperativeHandle(
    ref,
    () => ({
      fire(at, color = '#fff4b0', amount = 18, speed = 2.4) {
        const m = mesh.current;
        const n = reducedMotion ? Math.ceil(amount / 3) : amount;
        const x = Array.isArray(at) ? at[0] : (at as Vector3).x;
        const y = Array.isArray(at) ? at[1] : (at as Vector3).y;
        const z = Array.isArray(at) ? at[2] : (at as Vector3).z;
        col.set(color);
        for (let i = 0; i < n; i++) {
          const idx = cursor.current;
          cursor.current = (cursor.current + 1) % pool.length;
          const p = pool[idx] as P;
          const a = Math.random() * Math.PI * 2;
          const b = Math.acos(Math.random() * 2 - 1);
          const v = speed * (0.4 + Math.random() * 0.8) * (reducedMotion ? 0.4 : 1);
          p.x = x;
          p.y = y;
          p.z = z;
          p.vx = Math.sin(b) * Math.cos(a) * v;
          p.vy = Math.cos(b) * v * 0.8 + v * 0.5;
          p.vz = Math.sin(b) * Math.sin(a) * v;
          p.max = 0.7 + Math.random() * 0.6;
          p.life = p.max;
          p.s = 0.12 + Math.random() * 0.22;
          m?.setColorAt(idx, i % 4 === 0 ? tint.copy(col).lerp(WHITE, 0.6) : col);
        }
        if (m?.instanceColor) m.instanceColor.needsUpdate = true;
        dirty.current = true;
      },
    }),
    [pool, col, tint, reducedMotion],
  );

  useFrame((_, dtRaw) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(dtRaw, 0.05);
    let alive = false;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i] as P;
      if (p.life <= 0) {
        if (dirty.current) {
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix);
        }
        continue;
      }
      alive = true;
      p.life -= dt;
      p.vy -= 3.2 * dt;
      p.vx *= 1 - dt * 1.5;
      p.vz *= 1 - dt * 1.5;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const k = Math.max(0, p.life / p.max);
      dummy.position.set(p.x, p.y, p.z);
      dummy.quaternion.copy(camera.quaternion);
      dummy.scale.setScalar(p.s * (k < 0.8 ? k / 0.8 : 1) * (1 + (1 - k) * 0.5));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    if (alive || dirty.current) m.instanceMatrix.needsUpdate = true;
    dirty.current = alive;
  });

  return (
    <instancedMesh
      ref={(el) => {
        mesh.current = el;
        if (el) {
          el.instanceMatrix.setUsage(DynamicDrawUsage);
          for (let i = 0; i < count; i++) el.setColorAt(i, WHITE);
        }
      }}
      args={[undefined, undefined, count]}
      frustumCulled={false}
      renderOrder={20}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={glowTexture()} transparent depthWrite={false} blending={soft ? NormalBlending : AdditiveBlending} toneMapped={false} />
    </instancedMesh>
  );
});

const wordCache = new Map<string, CanvasTexture>();

/** Comic-book word texture ("LUB!", "DUB!", "+1") drawn on a 2D canvas — no fonts downloaded. */
export function wordTexture(word: string, fill: string, stroke = '#3a0b26'): CanvasTexture {
  const key = `${word}|${fill}|${stroke}`;
  const hit = wordCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = '800 76px "Fredoka Variable", "Fredoka", ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 16;
    ctx.strokeStyle = stroke;
    ctx.strokeText(word, 128, 68);
    ctx.fillStyle = fill;
    ctx.fillText(word, 128, 68);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  wordCache.set(key, tex);
  return tex;
}

export interface PopWordHandle {
  pop(word: string, at: Vec3, fill?: string): void;
}

/** A few recycled sprites that pop a word with a bouncy scale, float up and fade. */
export const PopWords = forwardRef<PopWordHandle, { reducedMotion?: boolean; size?: number }>(function PopWords({ reducedMotion = false, size = 1 }, ref) {
  const sprites = useRef<(Sprite | null)[]>([]);
  const state = useRef(Array.from({ length: 4 }, () => ({ t: 99, x: 0, y: 0, z: 0 })));
  const next = useRef(0);

  useImperativeHandle(
    ref,
    () => ({
      pop(word, at, fill = '#ffffff') {
        const i = next.current;
        next.current = (i + 1) % state.current.length;
        const s = state.current[i];
        const sp = sprites.current[i];
        if (!s || !sp) return;
        s.t = 0;
        s.x = at[0];
        s.y = at[1];
        s.z = at[2];
        const mat = sp.material as SpriteMaterial;
        mat.map = wordTexture(word, fill);
        mat.needsUpdate = true;
      },
    }),
    [],
  );

  useFrame((_, dt) => {
    const all = state.current;
    for (let i = 0; i < all.length; i++) {
      const s = all[i] as (typeof all)[number];
      const sp = sprites.current[i];
      if (!sp) continue;
      s.t += dt;
      const life = 0.9;
      if (s.t > life) {
        sp.visible = false;
        continue;
      }
      sp.visible = true;
      const k = s.t / life;
      const pop = reducedMotion ? 1 : k < 0.18 ? 0.4 + (k / 0.18) * 0.8 : 1.2 - Math.min(0.2, (k - 0.18) * 0.6);
      sp.position.set(s.x, s.y + k * 0.5, s.z);
      sp.scale.set(size * 1.6 * pop, size * 0.8 * pop, 1);
      (sp.material as SpriteMaterial).opacity = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    }
  });

  return (
    <group>
      {state.current.map((_, i) => (
        <sprite
          key={i}
          visible={false}
          renderOrder={30}
          ref={(el) => {
            sprites.current[i] = el;
          }}
        >
          <spriteMaterial transparent depthTest={false} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
});
