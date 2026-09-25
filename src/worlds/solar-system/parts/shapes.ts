import { ExtrudeGeometry, IcosahedronGeometry, Shape, SphereGeometry, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '@/core/random';

/** Five-pointed star outline (radius ~0.62). */
export function starShape(): Shape {
  const s = new Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? 0.62 : 0.28;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

/** Puffy, toy-like 3D star (bevelled extrusion), centred on the origin. */
export function puffyStar(): ExtrudeGeometry {
  return new ExtrudeGeometry(starShape(), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 3 }).center();
}

/** A cartoon cloud puff: a big ball with smaller balls around it, merged into one geometry (one draw call). */
export function puffGeometry(): BufferGeometry {
  const rand = mulberry32(8);
  const parts = Array.from({ length: 6 }, (_, i) => {
    const r = i === 0 ? 0.62 : 0.34 + rand() * 0.2;
    const g = new SphereGeometry(r, 20, 14);
    const a = (i / 5) * Math.PI * 2;
    if (i > 0) g.translate(Math.cos(a) * 0.55, Math.sin(a) * 0.3 + 0.05, (rand() - 0.3) * 0.25);
    return g;
  });
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged ?? new SphereGeometry(0.6, 20, 14);
}

/**
 * A lumpy low-poly rock (asteroids, Mars samples): an icosphere whose corners are pushed in or out by a random
 * amount — shared corners move together, so the surface stays closed — and squashed a little vertically.
 */
export function lumpyRock(seed: number, min: number, range: number, squash: number): IcosahedronGeometry {
  const g = new IcosahedronGeometry(1, 1);
  const pos = g.attributes.position;
  if (!pos) return g;
  const rand = mulberry32(seed);
  const seen = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    const k = seen.get(key) ?? min + rand() * range;
    seen.set(key, k);
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * squash, pos.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}
