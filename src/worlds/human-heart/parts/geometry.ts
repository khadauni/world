import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Euler,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Vec3 = readonly [number, number, number];

/**
 * A soft, organic "blob" — a sphere reshaped into a chamber: separate top/bottom heights, a taper towards
 * a rounded tip (the heart's apex), gentle lumps, then rotated and placed.
 */
export interface BlobSpec {
  readonly center: Vec3;
  /** [x radius, top height, bottom height, z radius] */
  readonly radii: readonly [number, number, number, number];
  /** Narrow the bottom half towards a tip: scale at the tip and how quickly it narrows. */
  readonly taper?: { readonly tip: number; readonly pow: number };
  /** Narrow the top half a little (0…1). */
  readonly topPinch?: number;
  readonly rot?: Vec3;
  /** Amplitude of the low-frequency lumps (fraction of the radius). */
  readonly lumps?: number;
  readonly seed?: number;
}

function lump(x: number, y: number, z: number, seed: number): number {
  return (
    Math.sin(x * 2.3 + seed) * Math.sin(y * 2.9 + seed * 1.7) * 0.6 +
    Math.sin(z * 3.1 + y * 1.3 + seed * 0.7) * 0.4 +
    Math.sin((x + z) * 4.7 + seed * 2.3) * 0.15
  );
}

/** Pure shape function: unit-sphere direction → blob surface point (before rotation/translation). */
export function blobPoint(spec: BlobSpec, x: number, y: number, z: number, out: Vector3): Vector3 {
  const [rx, ryTop, ryBottom, rz] = spec.radii;
  let s = 1;
  if (y < 0 && spec.taper) s = 1 - (1 - spec.taper.tip) * Math.pow(-y, spec.taper.pow);
  if (y > 0 && spec.topPinch) s = 1 - spec.topPinch * y * y;
  const l = 1 + (spec.lumps ?? 0.03) * lump(x, y, z, spec.seed ?? 1);
  return out.set(x * rx * s * l, y * (y < 0 ? ryBottom : ryTop) * l, z * rz * s * l);
}

export function blobGeometry(spec: BlobSpec, detail = 1): BufferGeometry {
  const ws = Math.max(16, Math.round(56 * detail));
  const hs = Math.max(12, Math.round(40 * detail));
  const sphere = new SphereGeometry(1, ws, hs);
  const pos = sphere.getAttribute('position') as BufferAttribute;
  const m = new Matrix4().makeRotationFromEuler(new Euler(...(spec.rot ?? [0, 0, 0])));
  m.setPosition(spec.center[0], spec.center[1], spec.center[2]);
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    blobPoint(spec, pos.getX(i), pos.getY(i), pos.getZ(i), v).applyMatrix4(m);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  sphere.deleteAttribute('normal');
  sphere.deleteAttribute('uv');
  const merged = mergeVertices(sphere, 1e-5);
  sphere.dispose();
  merged.computeVertexNormals();
  return merged;
}

export interface TubeOptions {
  /** Radius along the tube, t = 0…1. */
  readonly radius: (t: number) => number;
  readonly tubular?: number;
  readonly radial?: number;
  /** Rounded end caps ('both' | 'start' | 'end' | 'none'). */
  readonly caps?: 'both' | 'start' | 'end' | 'none';
  /** Optional per-vertex value along the tube (e.g. oxygen level) written to `aOxy`. */
  readonly attr?: (t: number) => number;
  readonly closed?: boolean;
}

/**
 * Tube along a smooth curve with a variable radius and rounded caps. Normals are analytic (no seams),
 * `uv.x` runs along the length (for flowing shaders).
 */
export function tubeGeometry(points: readonly Vec3[], o: TubeOptions, detail = 1): BufferGeometry {
  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(p[0], p[1], p[2])),
    o.closed ?? false,
    'centripetal',
  );
  return tubeFromCurve(curve, o, detail);
}

export function tubeFromCurve(curve: CatmullRomCurve3, o: TubeOptions, detail = 1): BufferGeometry {
  const tub = Math.max(8, Math.round((o.tubular ?? 48) * detail));
  const rad = Math.max(6, Math.round((o.radial ?? 16) * Math.max(0.6, detail)));
  const closed = o.closed ?? false;
  const caps = closed ? 'none' : (o.caps ?? 'both');
  const capRings = Math.max(3, Math.round(5 * detail));
  const frames = curve.computeFrenetFrames(tub, closed);

  interface Ring {
    c: Vector3;
    n: Vector3;
    b: Vector3;
    t: Vector3;
    r: number;
    phi: number;
    dir: number;
    u: number;
    a: number;
  }
  const rings: Ring[] = [];
  const at = (i: number) => {
    const u = i / tub;
    return {
      c: curve.getPointAt(Math.min(1, u)),
      n: frames.normals[i] as Vector3,
      b: frames.binormals[i] as Vector3,
      t: frames.tangents[i] as Vector3,
      r: o.radius(u),
      u,
      a: o.attr ? o.attr(u) : 0,
    };
  };
  if (caps === 'both' || caps === 'start') {
    const s = at(0);
    for (let k = capRings; k >= 1; k--) rings.push({ ...s, phi: (k / capRings) * (Math.PI / 2), dir: -1 });
  }
  for (let i = 0; i <= tub; i++) rings.push({ ...at(i), phi: 0, dir: 1 });
  if (caps === 'both' || caps === 'end') {
    const e = at(tub);
    for (let k = 1; k <= capRings; k++) rings.push({ ...e, phi: (k / capRings) * (Math.PI / 2), dir: 1 });
  }

  const cols = rad + 1;
  const positions = new Float32Array(rings.length * cols * 3);
  const normals = new Float32Array(rings.length * cols * 3);
  const uvs = new Float32Array(rings.length * cols * 2);
  const attrs = new Float32Array(rings.length * cols);
  const d = new Vector3();
  rings.forEach((ring, ri) => {
    const cp = Math.cos(ring.phi);
    const sp = Math.sin(ring.phi);
    for (let j = 0; j <= rad; j++) {
      const th = (j / rad) * Math.PI * 2;
      d.copy(ring.n)
        .multiplyScalar(Math.cos(th))
        .addScaledVector(ring.b, Math.sin(th))
        .multiplyScalar(cp)
        .addScaledVector(ring.t, sp * ring.dir);
      const idx = ri * cols + j;
      positions[idx * 3] = ring.c.x + d.x * ring.r;
      positions[idx * 3 + 1] = ring.c.y + d.y * ring.r;
      positions[idx * 3 + 2] = ring.c.z + d.z * ring.r;
      normals[idx * 3] = d.x;
      normals[idx * 3 + 1] = d.y;
      normals[idx * 3 + 2] = d.z;
      uvs[idx * 2] = ring.u;
      uvs[idx * 2 + 1] = j / rad;
      attrs[idx] = ring.a;
    }
  });
  const index: number[] = [];
  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let j = 0; j < rad; j++) {
      const a = ri * cols + j;
      const b = (ri + 1) * cols + j;
      // Counter-clockwise seen from outside (θ turns from N towards B, i.e. anticlockwise about T).
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  g.setAttribute('normal', new BufferAttribute(normals, 3));
  g.setAttribute('uv', new BufferAttribute(uvs, 2));
  if (o.attr) g.setAttribute('aOxy', new BufferAttribute(attrs, 1));
  g.setIndex(index);
  return g;
}

/**
 * Project points onto the outside of a set of surfaces (e.g. to lay coronary arteries in the grooves
 * between chambers): cast from far outside towards `center` and keep the first hit, lifted by `lift`.
 */
export function shrinkWrap(points: readonly Vec3[], surfaces: readonly BufferGeometry[], center: Vec3, lift: number, samples = 28): Vec3[] {
  const mat = new MeshBasicMaterial({ side: DoubleSide });
  const meshes = surfaces.map((g) => new Mesh(g, mat));
  meshes.forEach((m) => m.updateMatrixWorld(true));
  const ray = new Raycaster();
  const c = new Vector3(...center);
  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(...p)),
    false,
    'centripetal',
  );
  const out: Vec3[] = [];
  const dir = new Vector3();
  const origin = new Vector3();
  for (let i = 0; i <= samples; i++) {
    const p = curve.getPointAt(i / samples);
    dir.copy(p).sub(c);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();
    origin.copy(c).addScaledVector(dir, 6);
    ray.set(origin, dir.clone().negate());
    const hit = ray.intersectObjects(meshes, false)[0];
    if (hit) {
      const n = hit.face ? hit.face.normal.clone() : dir.clone();
      const q = hit.point.clone().addScaledVector(n.dot(dir) < 0 ? dir : n, lift);
      out.push([q.x, q.y, q.z]);
    } else out.push([p.x, p.y, p.z]);
  }
  mat.dispose();
  return out;
}

/** Offset a geometry so `pivot` becomes its origin (parts rotate/scale/explode about their own centre). */
export function centerOn(g: BufferGeometry, pivot: Vec3): BufferGeometry {
  g.translate(-pivot[0], -pivot[1], -pivot[2]);
  return g;
}
