import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, DynamicDrawUsage, LatheGeometry, Object3D, Vector2, Vector3, type CatmullRomCurve3, type InstancedMesh } from 'three';
import { mulberry32 } from '@/core/random';
import { PALETTE } from './palette';
import { useDisposable } from './dispose';

/** A red blood cell: the classic biconcave disc ("a doughnut without a hole"), built as a lathe. */
export function rbcGeometry(detail = 1, radius = 1): LatheGeometry {
  const pts: Vector2[] = [];
  const n = Math.max(8, Math.round(14 * detail));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * Math.PI;
    // Profile: thick rim, thin dimpled middle.
    const x = Math.sin(a) * radius;
    const th = 0.18 + 0.2 * Math.pow(Math.sin(a), 6);
    const y = Math.cos(a) * th * radius;
    pts.push(new Vector2(Math.max(0.0001, x * (0.35 + 0.65 * Math.pow(Math.sin(a), 0.4))), y));
  }
  const g = new LatheGeometry(pts, Math.max(12, Math.round(24 * detail)));
  g.computeVertexNormals();
  return g;
}

const poor = new Color(PALETTE.poor);
const rich = new Color(PALETTE.rich);

/**
 * Blood cells streaming along a curve (one instanced draw call). Each cell tumbles gently and is coloured
 * by `oxygenAt(u)` using the diagram code (blue = oxygen-poor, red = oxygen-rich).
 */
export function FlowCells({
  curve,
  count,
  speed,
  size = 0.12,
  spread = 0.06,
  oxygenAt,
  detail = 1,
  paused,
  seed = 9,
}: {
  curve: CatmullRomCurve3;
  count: number;
  /** Fraction of the loop per second. */
  speed: number;
  size?: number;
  spread?: number;
  oxygenAt: (u: number) => number;
  detail?: number;
  paused?: boolean;
  seed?: number;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const geo = useMemo(() => rbcGeometry(detail * 0.6), [detail]);
  const cells = useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: count }, (_, i) => ({
      u: i / count + rand() * 0.01,
      ox: (rand() * 2 - 1) * spread,
      oy: (rand() * 2 - 1) * spread,
      oz: (rand() * 2 - 1) * spread,
      rx: rand() * Math.PI,
      ry: rand() * Math.PI,
      spin: 0.5 + rand() * 1.5,
      s: 0.85 + rand() * 0.3,
    }));
  }, [count, spread, seed]);
  const dummy = useMemo(() => new Object3D(), []);
  const p = useMemo(() => new Vector3(), []);
  const c = useMemo(() => new Color(), []);
  const time = useRef(0);

  useDisposable(geo);
  useFrame((_, dtRaw) => {
    const m = mesh.current;
    if (!m) return;
    const dt = paused ? 0 : Math.min(dtRaw, 0.1);
    time.current += dt;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i] as (typeof cells)[number];
      cell.u = (cell.u + speed * dt) % 1;
      curve.getPointAt(cell.u, p);
      dummy.position.set(p.x + cell.ox, p.y + cell.oy, p.z + cell.oz);
      dummy.rotation.set(cell.rx + time.current * cell.spin, cell.ry + time.current * 0.7, 0);
      dummy.scale.setScalar(size * cell.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      c.copy(poor).lerp(rich, oxygenAt(cell.u));
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
      <meshPhysicalMaterial roughness={0.35} clearcoat={1} clearcoatRoughness={0.25} sheen={0.6} sheenColor="#ffd6e2" emissive="#40061a" emissiveIntensity={0.2} />
    </instancedMesh>
  );
}
