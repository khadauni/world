import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, Color, type Vector3 } from 'three';
import { mulberry32 } from '@/core/random';
import { sparkleMaterial } from '../shaders/fx';
import { useSolar } from '../state';
import { useDisposable } from './hooks';

const POOL = 260;
const tint = new Color();

/**
 * Pooled celebration sparkles: `sys.burst(position, colour)` from any task. One draw call, no allocations
 * while running; the pool simply wraps around.
 */
export function Bursts({ pixelRatio, scale }: { pixelRatio: number; scale: number }) {
  const sys = useSolar();
  const head = useRef(0);
  const rand = useMemo(() => mulberry32(17), []);
  const vel = useMemo(() => new Float32Array(POOL * 3), []);
  const geo = useDisposable(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(POOL * 3), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(POOL * 3), 3));
    g.setAttribute('aSize', new BufferAttribute(new Float32Array(POOL), 1));
    g.setAttribute('aLife', new BufferAttribute(new Float32Array(POOL), 1));
    return g;
  }, []);
  const mat = useDisposable(() => sparkleMaterial(pixelRatio), [pixelRatio]);

  useEffect(() => {
    sys.burst = (p: Vector3, color: string, count = 24, speed = 1, size = 1) => {
      const pos = geo.attributes.position as BufferAttribute;
      const col = geo.attributes.color as BufferAttribute;
      const sz = geo.attributes.aSize as BufferAttribute;
      const life = geo.attributes.aLife as BufferAttribute;
      const n = Math.max(4, Math.round(count * scale));
      for (let k = 0; k < n; k++) {
        const i = head.current;
        head.current = (i + 1) % POOL;
        const u = rand() * 2 - 1;
        const t = rand() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const v = speed * (0.4 + rand() * 0.8);
        vel[i * 3] = s * Math.cos(t) * v;
        vel[i * 3 + 1] = u * v;
        vel[i * 3 + 2] = s * Math.sin(t) * v;
        pos.setXYZ(i, p.x, p.y, p.z);
        tint.set(color).lerp(WHITE, rand() * 0.5);
        col.setXYZ(i, tint.r, tint.g, tint.b);
        sz.setX(i, size * (0.06 + rand() * 0.1));
        life.setX(i, 1 + rand() * 0.3);
      }
      // Colour and size only change here; position and life are uploaded by the frame loop while alive.
      col.needsUpdate = true;
      sz.needsUpdate = true;
      pos.needsUpdate = true;
      life.needsUpdate = true;
    };
    return () => {
      sys.burst = () => undefined;
    };
  }, [sys, geo, rand, vel, scale]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const pos = geo.attributes.position as BufferAttribute;
    const life = geo.attributes.aLife as BufferAttribute;
    const drag = Math.exp(-dt * 2.2);
    let any = false;
    for (let i = 0; i < POOL; i++) {
      const l = life.getX(i);
      if (l <= 0) continue;
      any = true;
      life.setX(i, l - dt * 1.1);
      vel[i * 3] = (vel[i * 3] ?? 0) * drag;
      vel[i * 3 + 1] = (vel[i * 3 + 1] ?? 0) * drag;
      vel[i * 3 + 2] = (vel[i * 3 + 2] ?? 0) * drag;
      pos.setXYZ(i, pos.getX(i) + (vel[i * 3] ?? 0) * dt, pos.getY(i) + (vel[i * 3 + 1] ?? 0) * dt, pos.getZ(i) + (vel[i * 3 + 2] ?? 0) * dt);
    }
    if (any) {
      pos.needsUpdate = true;
      life.needsUpdate = true;
    }
  });

  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={6} />;
}

const WHITE = new Color('#ffffff');
