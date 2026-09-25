import { CatmullRomCurve3, Vector3 } from 'three';
import type { CoursePath } from './types';

export type Vec3Tuple = readonly [number, number, number];

/** A position + orthonormal frame on the path. `forward` is the direction of travel. */
export interface PathFrame {
  readonly position: Vector3;
  readonly forward: Vector3;
  readonly up: Vector3;
  readonly right: Vector3;
}

export function createPathFrame(): PathFrame {
  return { position: new Vector3(), forward: new Vector3(0, 0, -1), up: new Vector3(0, 1, 0), right: new Vector3(1, 0, 0) };
}

const WORLD_UP = new Vector3(0, 1, 0);
const tmpA = new Vector3();
const tmpB = new Vector3();
const tmpC = new Vector3();

/**
 * Sample a smooth path through `points` at equal arc-length steps and give every sample an upright frame.
 * The frame is parallel-transported (no sudden flips, handles straight-up launches) and gently biased toward
 * world-up whenever the path is not vertical, so the horizon stays level for the child.
 */
export function buildPath(points: readonly Vec3Tuple[], spacing = 2): CoursePath {
  if (points.length < 2) throw new Error('buildPath needs at least two points');
  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(p[0], p[1], p[2])),
    false,
    'centripetal',
  );
  curve.arcLengthDivisions = Math.max(200, points.length * 64);
  const length = curve.getLength();
  const count = Math.max(32, Math.min(2048, Math.ceil(length / spacing) + 1));
  const positions = new Float32Array(count * 3);
  const tangents = new Float32Array(count * 3);
  const ups = new Float32Array(count * 3);
  const rights = new Float32Array(count * 3);

  const up = new Vector3();
  const right = new Vector3();
  const t = new Vector3();
  const p = new Vector3();
  for (let i = 0; i < count; i++) {
    const u = i / (count - 1);
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t).normalize();
    if (i === 0) {
      // Start upright: world-up projected onto the plane normal to the tangent (or any perpendicular if vertical).
      up.copy(WORLD_UP).addScaledVector(t, -t.dot(WORLD_UP));
      if (up.lengthSq() < 1e-6) up.set(0, 0, 1).addScaledVector(t, -t.z);
      up.normalize();
    } else {
      // Parallel transport the previous up, then lean it back toward world-up in proportion to how level we are.
      up.addScaledVector(t, -t.dot(up));
      const level = 1 - Math.abs(t.dot(WORLD_UP));
      tmpA.copy(WORLD_UP).addScaledVector(t, -t.dot(WORLD_UP));
      if (tmpA.lengthSq() > 1e-6) up.lerp(tmpA.normalize(), 0.08 * level * level);
      up.normalize();
    }
    right.crossVectors(t, up).normalize();
    up.crossVectors(right, t).normalize();
    p.toArray(positions, i * 3);
    t.toArray(tangents, i * 3);
    up.toArray(ups, i * 3);
    right.toArray(rights, i * 3);
  }
  return { length, count, positions, tangents, ups, rights };
}

function lerpInto(out: Vector3, arr: Float32Array, i0: number, i1: number, f: number): Vector3 {
  const a = i0 * 3;
  const b = i1 * 3;
  return out.set(
    (arr[a] ?? 0) + ((arr[b] ?? 0) - (arr[a] ?? 0)) * f,
    (arr[a + 1] ?? 0) + ((arr[b + 1] ?? 0) - (arr[a + 1] ?? 0)) * f,
    (arr[a + 2] ?? 0) + ((arr[b + 2] ?? 0) - (arr[a + 2] ?? 0)) * f,
  );
}

/** Sample the path at distance `s` (clamped to the ends) into `out`. Allocation-free. */
export function samplePath(path: CoursePath, s: number, out: PathFrame): PathFrame {
  const last = path.count - 1;
  const f = (Math.min(path.length, Math.max(0, s)) / path.length) * last;
  const i0 = Math.min(last - 1, Math.floor(f));
  const k = f - i0;
  lerpInto(out.position, path.positions, i0, i0 + 1, k);
  lerpInto(out.forward, path.tangents, i0, i0 + 1, k).normalize();
  lerpInto(tmpB, path.ups, i0, i0 + 1, k);
  out.right.crossVectors(out.forward, tmpB).normalize();
  out.up.crossVectors(out.right, out.forward).normalize();
  // Extrapolate straight beyond the ends so things placed past the finish still line up.
  if (s > path.length) out.position.addScaledVector(out.forward, s - path.length);
  else if (s < 0) out.position.addScaledVector(out.forward, s);
  return out;
}

const scratchFrame = createPathFrame();

/** Course-space (s, x, y) → world position. Allocation-free. */
export function courseToWorld(path: CoursePath, s: number, x: number, y: number, out: Vector3): Vector3 {
  samplePath(path, s, scratchFrame);
  return out.copy(scratchFrame.position).addScaledVector(scratchFrame.right, x).addScaledVector(scratchFrame.up, y);
}

/**
 * Deterministic swooping control points between two positions: a few gentle S-bends that fade out at both
 * ends, so a run starts and finishes pointing straight at its target.
 */
export function swoopPoints(from: Vec3Tuple, to: Vec3Tuple, rand: () => number, curviness = 1): Vec3Tuple[] {
  const a = tmpA.set(from[0], from[1], from[2]);
  const b = tmpC.set(to[0], to[1], to[2]);
  const dir = tmpB.copy(b).sub(a);
  const dist = dir.length();
  if (dist < 1e-6) throw new Error('swoopPoints: from and to are the same point');
  dir.divideScalar(dist);
  const side = new Vector3().crossVectors(dir, WORLD_UP);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize();
  const lift = new Vector3().crossVectors(side, dir).normalize();
  const segments = Math.max(4, Math.min(14, Math.round(dist / 110)));
  const amp = Math.min(dist * 0.07, 55) * curviness;
  const p1 = rand() * Math.PI * 2;
  const p2 = rand() * Math.PI * 2;
  const f1 = 1.3 + rand() * 1.1;
  const f2 = 0.9 + rand() * 0.9;
  const out: Vec3Tuple[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const fade = Math.sin(Math.PI * u);
    const sx = Math.sin(u * Math.PI * 2 * f1 + p1) * amp * fade;
    const sy = Math.sin(u * Math.PI * 2 * f2 + p2) * amp * 0.45 * fade;
    out.push([
      a.x + dir.x * dist * u + side.x * sx + lift.x * sy,
      a.y + dir.y * dist * u + side.y * sx + lift.y * sy,
      a.z + dir.z * dist * u + side.z * sx + lift.z * sy,
    ]);
  }
  return out;
}
