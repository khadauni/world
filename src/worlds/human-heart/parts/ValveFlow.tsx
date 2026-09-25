import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { Color, DynamicDrawUsage, Object3D, type InstancedMesh } from 'three';
import { mulberry32 } from '@/core/random';
import { rbcGeometry } from './cells';
import { useDisposable } from './dispose';

/**
 * Blood cells streaming through one valve along its axis (local y). They move while the valve is open
 * and bunch up while it is shut; through a leaky valve some are pushed backwards (lighter "backflow").
 */
export function ValveFlow({
  count,
  radius,
  length,
  direction,
  open,
  leak,
  color,
  detail = 1,
  speed = 0.5,
}: {
  count: number;
  radius: number;
  length: number;
  /** +1 = blood flows towards +y, -1 towards -y. */
  direction: 1 | -1;
  open: RefObject<number>;
  leak: RefObject<number>;
  color: string;
  detail?: number;
  speed?: number;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const geo = useMemo(() => rbcGeometry(detail * 0.5), [detail]);
  const cells = useMemo(() => {
    const rand = mulberry32(count * 31 + Math.round(radius * 100));
    return Array.from({ length: count }, (_, i) => ({
      t: i / count,
      a: rand() * Math.PI * 2,
      r: Math.sqrt(rand()) * radius * 0.7,
      s: 0.8 + rand() * 0.4,
      spin: rand() * 3,
      back: 0,
    }));
  }, [count, radius]);
  const dummy = useMemo(() => new Object3D(), []);
  const base = useMemo(() => new Color(color), [color]);
  const pale = useMemo(() => new Color(color).lerp(new Color('#ffffff'), 0.55), [color]);
  const c = useMemo(() => new Color(), []);
  const time = useRef(0);

  useDisposable(geo);
  useFrame((_, dtRaw) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(dtRaw, 0.1);
    time.current += dt;
    const o = Math.max(0, Math.min(1, open.current ?? 0));
    const l = leak.current ?? 0;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i] as (typeof cells)[number];
      // Cells upstream of the valve (t < 0.5) wait while it is shut; downstream ones keep drifting on.
      const upstream = cell.t < 0.5;
      let v = speed * (upstream ? o : 0.35 + o * 0.65);
      // Leak: while shut, cells just past the valve get shoved back through it.
      if (l > 0 && o < 0.3 && cell.t > 0.5 && cell.t < 0.8) {
        v = -speed * 1.4 * l;
        cell.back = 1;
      } else cell.back = Math.max(0, cell.back - dt * 1.5);
      cell.t += v * dt;
      if (cell.t > 1) cell.t -= 1;
      if (cell.t < 0) cell.t += 1;
      // Squeeze through the ring: narrow near the middle.
      const pinch = 1 - 0.55 * Math.exp(-Math.pow((cell.t - 0.5) * 7, 2)) * (1 - o * 0.5);
      const y = (cell.t - 0.5) * length * direction;
      dummy.position.set(Math.cos(cell.a + time.current * 0.3) * cell.r * pinch, y, Math.sin(cell.a + time.current * 0.3) * cell.r * pinch);
      dummy.rotation.set(time.current * cell.spin, cell.a, 0);
      const fade = Math.min(1, Math.min(cell.t, 1 - cell.t) * 8);
      dummy.scale.setScalar(0.1 * cell.s * fade);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      c.copy(base).lerp(pale, cell.back);
      m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={(el) => {
        mesh.current = el;
        el?.instanceMatrix.setUsage(DynamicDrawUsage);
      }}
      args={[geo, undefined, count]}
      frustumCulled={false}
    >
      <meshPhysicalMaterial roughness={0.35} clearcoat={1} sheen={0.5} sheenColor="#ffd6e2" emissive="#3a0716" emissiveIntensity={0.25} />
    </instancedMesh>
  );
}
