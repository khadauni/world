import { Box3, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import type { PartId } from '../logic/ids';
import { blobGeometry, centerOn, shrinkWrap, tubeGeometry, type BlobSpec, type Vec3 } from './geometry';

/**
 * The stylised "cartoon-anatomical" heart, built from separate named parts so it can be taken apart.
 * Heart space: x = viewer's right (the owner's LEFT), y = up, z = towards the viewer (front of the body).
 * Roughly 3 units tall from apex to the top of the aortic arch.
 */
export type BeatRole = 'atria' | 'ventricles' | 'artery' | 'vein' | 'still';
export type PartMaterial = 'tissue' | 'vessel' | 'valve';

export interface PartBuild {
  readonly id: PartId;
  readonly pivot: Vec3;
  /** Centre and size of the part's bounding box (heart space) — used to park it neatly in the lab. */
  readonly center: Vec3;
  readonly size: Vec3;
  readonly geometries: readonly BufferGeometry[];
  readonly material: PartMaterial;
  /** Offset (heart space) the part flies to when pulled out in the lab. */
  readonly explode: Vec3;
  /** Label anchor relative to the pivot. */
  readonly label: Vec3;
  readonly hitRadius: number;
  /** Fatter invisible shapes that make thin parts easy to tap (coronaries, veins, valves). */
  readonly hit?: readonly BufferGeometry[];
  readonly beat: BeatRole;
  /** Valve placement: ring radius and the ring's facing (flow) direction. */
  readonly valve?: { readonly radius: number; readonly normal: Vec3; readonly flaps: number };
}

export interface FaceAnchor {
  readonly p: Vec3;
  readonly n: Vec3;
}

export interface HeartBuild {
  readonly parts: Readonly<Record<PartId, PartBuild>>;
  readonly face: { readonly eyeL: FaceAnchor; readonly eyeR: FaceAnchor; readonly mouth: FaceAnchor; readonly cheekL: FaceAnchor; readonly cheekR: FaceAnchor };
  /** Centre of the whole heart (for turntables, cameras and explosions). */
  readonly center: Vec3;
}

export const HEART_CENTER: Vec3 = [0, 0.1, 0];

const BLOBS = {
  lv: { center: [0.34, -0.38, 0.0], radii: [0.8, 0.6, 1.12, 0.74], taper: { tip: 0.15, pow: 1.2 }, rot: [0.05, 0, 0.42], seed: 3 },
  rv: { center: [-0.18, -0.26, 0.2], radii: [0.8, 0.54, 0.86, 0.6], taper: { tip: 0.42, pow: 1.5 }, rot: [0.1, -0.12, 0.5], seed: 5 },
  ra: { center: [-0.86, 0.3, 0.04], radii: [0.48, 0.56, 0.5, 0.52], topPinch: 0.16, rot: [0, 0, -0.22], seed: 7 },
  raEar: { center: [-0.44, 0.7, 0.48], radii: [0.26, 0.11, 0.1, 0.16], taper: { tip: 0.6, pow: 1 }, rot: [0.35, 0.5, 0.6], lumps: 0.08, seed: 11 },
  la: { center: [0.42, 0.48, -0.5], radii: [0.62, 0.4, 0.4, 0.5], rot: [0, 0.1, 0.05], seed: 13 },
  laEar: { center: [0.9, 0.42, 0.12], radii: [0.22, 0.12, 0.12, 0.25], taper: { tip: 0.55, pow: 1 }, rot: [0.2, 0.55, -0.35], lumps: 0.08, seed: 17 },
} satisfies Record<string, BlobSpec>;

const AORTA: Vec3[] = [
  [0.12, 0.05, 0.0],
  [0.07, 0.65, 0.12],
  [0.02, 1.2, 0.08],
  [0.14, 1.56, -0.15],
  [0.45, 1.64, -0.48],
  [0.74, 1.36, -0.74],
  [0.82, 0.7, -0.86],
  [0.84, -0.1, -0.9],
  [0.84, -0.95, -0.9],
];
const AORTA_BRANCHES: Vec3[][] = [
  [
    [0.1, 1.5, -0.04],
    [0.03, 1.8, 0.02],
    [-0.06, 2.0, 0.05],
  ],
  [
    [0.3, 1.66, -0.3],
    [0.31, 1.88, -0.31],
    [0.32, 2.02, -0.32],
  ],
  [
    [0.52, 1.62, -0.52],
    [0.57, 1.84, -0.56],
    [0.61, 1.96, -0.6],
  ],
];
const PA_TRUNK: Vec3[] = [
  [0.1, 0.18, 0.5],
  [0.26, 0.62, 0.54],
  [0.36, 1.0, 0.32],
  [0.38, 1.16, 0.02],
];
const PA_LEFT: Vec3[] = [
  [0.38, 1.13, 0.02],
  [0.76, 1.2, -0.18],
  [1.1, 1.12, -0.3],
  [1.42, 1.0, -0.36],
];
const PA_RIGHT: Vec3[] = [
  [0.38, 1.13, 0.02],
  [0.0, 1.06, -0.4],
  [-0.55, 1.02, -0.58],
  [-1.0, 0.98, -0.6],
  [-1.28, 0.94, -0.58],
];
const SVC: Vec3[] = [
  [-0.88, 1.52, -0.08],
  [-0.88, 1.2, -0.04],
  [-0.88, 0.76, 0.06],
];
const IVC: Vec3[] = [
  [-0.74, -0.92, -0.26],
  [-0.8, -0.55, -0.16],
  [-0.86, -0.1, -0.02],
];
const PVS: Vec3[][] = [
  [
    [0.62, 0.56, -0.62],
    [0.98, 0.64, -0.66],
    [1.26, 0.74, -0.66],
  ],
  [
    [0.62, 0.3, -0.66],
    [0.98, 0.26, -0.72],
    [1.24, 0.16, -0.72],
  ],
  [
    [0.08, 0.56, -0.74],
    [-0.4, 0.62, -0.86],
    [-1.28, 0.64, -0.78],
  ],
  [
    [0.08, 0.3, -0.76],
    [-0.4, 0.24, -0.88],
    [-1.24, 0.2, -0.8],
  ],
];
/** Rough paths for the coronary arteries; they are shrink-wrapped onto the chamber surfaces. */
const CORONARY_PATHS: Vec3[][] = [
  // Right coronary artery, in the groove between right atrium and right ventricle.
  [
    [-0.08, 0.3, 0.5],
    [-0.42, 0.14, 0.66],
    [-0.74, -0.06, 0.56],
    [-0.98, -0.34, 0.26],
    [-0.94, -0.62, -0.12],
  ],
  // Left anterior descending, down the front groove between the ventricles to the apex.
  [
    [0.22, 0.26, 0.5],
    [0.3, 0.02, 0.66],
    [0.34, -0.42, 0.66],
    [0.46, -0.92, 0.46],
    [0.58, -1.3, 0.18],
  ],
  // Circumflex, around the left side.
  [
    [0.28, 0.24, 0.44],
    [0.64, 0.12, 0.42],
    [0.92, 0.0, 0.12],
    [0.94, -0.08, -0.3],
  ],
  // A diagonal branch.
  [
    [0.33, -0.3, 0.66],
    [0.6, -0.48, 0.56],
    [0.82, -0.66, 0.36],
  ],
];

function taper(r0: number, r1: number, flare = 0) {
  return (t: number) => r0 + (r1 - r0) * t + flare * Math.max(0, 1 - t * 10);
}

function surfaceHit(ray: Raycaster, meshes: Mesh[], x: number, y: number): FaceAnchor {
  ray.set(new Vector3(x, y, 6), new Vector3(0, 0, -1));
  const hit = ray.intersectObjects(meshes, false)[0];
  if (!hit) return { p: [x, y, 0.8], n: [0, 0, 1] };
  const n = hit.face?.normal ?? new Vector3(0, 0, 1);
  return { p: [hit.point.x, hit.point.y, hit.point.z], n: [n.x, n.y, n.z] };
}

function build(detail: number): HeartBuild {
  const world = {
    lv: blobGeometry(BLOBS.lv, detail),
    rv: blobGeometry(BLOBS.rv, detail),
    ra: blobGeometry(BLOBS.ra, detail),
    raEar: blobGeometry(BLOBS.raEar, detail * 0.6),
    la: blobGeometry(BLOBS.la, detail),
    laEar: blobGeometry(BLOBS.laEar, detail * 0.6),
  };

  // Coronaries + face are laid onto the chambers while everything is still in heart space.
  const surfaces = [world.lv, world.rv, world.ra, world.la, world.raEar, world.laEar];
  const coronaryPaths = CORONARY_PATHS.map((path) => shrinkWrap(path, surfaces, [0, -0.3, -0.1], 0.025, 20));
  const coronary = coronaryPaths.map((path, i) => tubeGeometry(path, { radius: taper(i === 3 ? 0.038 : 0.052, 0.03), tubular: 40, radial: 8 }, detail));
  const coronaryHit = coronaryPaths.map((path) => tubeGeometry(path, { radius: () => 0.1, tubular: 16, radial: 6 }, 0.5));
  const mat = new MeshBasicMaterial({ side: DoubleSide });
  const meshes = [world.lv, world.rv].map((g) => new Mesh(g, mat));
  meshes.forEach((m) => m.updateMatrixWorld(true));
  const ray = new Raycaster();
  const face = {
    eyeL: surfaceHit(ray, meshes, -0.36, -0.22),
    eyeR: surfaceHit(ray, meshes, 0.2, -0.26),
    mouth: surfaceHit(ray, meshes, -0.06, -0.56),
    cheekL: surfaceHit(ray, meshes, -0.58, -0.5),
    cheekR: surfaceHit(ray, meshes, 0.42, -0.56),
  };
  mat.dispose();

  const vesselDetail = detail;
  const parts: Record<PartId, PartBuild> = {
    lv: part('lv', BLOBS.lv.center, [world.lv], 'tissue', [1.25, -0.6, 0.55], [0.35, -0.2, 0.62], 0.8, 'ventricles'),
    rv: part('rv', BLOBS.rv.center, [world.rv], 'tissue', [-1.05, -0.45, 1.15], [-0.2, -0.1, 0.5], 0.72, 'ventricles'),
    ra: part('ra', BLOBS.ra.center, [world.ra, world.raEar], 'tissue', [-1.45, 0.05, 0.45], [-0.2, 0.55, 0.2], 0.58, 'atria'),
    la: part('la', BLOBS.la.center, [world.la, world.laEar], 'tissue', [1.3, 0.35, -0.6], [0.1, 0.45, 0], 0.6, 'atria'),
    aorta: part(
      'aorta',
      [0.42, 1.2, -0.45],
      [
        tubeGeometry(AORTA, { radius: taper(0.22, 0.19, 0.05), tubular: 72, radial: 18, caps: 'end' }, vesselDetail),
        ...AORTA_BRANCHES.map((b, i) => tubeGeometry(b, { radius: taper(i === 0 ? 0.085 : 0.07, 0.065), tubular: 14, radial: 10, caps: 'end' }, vesselDetail)),
      ],
      'vessel',
      [1.1, 0.45, -0.35],
      [0.05, 1.05, 0],
      0.55,
      'artery',
    ),
    pa: part(
      'pa',
      [0.34, 0.95, 0.12],
      [
        tubeGeometry(PA_TRUNK, { radius: taper(0.21, 0.18, 0.03), tubular: 32, radial: 16, caps: 'none' }, vesselDetail),
        tubeGeometry(PA_LEFT, { radius: taper(0.14, 0.12), tubular: 28, radial: 12, caps: 'end' }, vesselDetail),
        tubeGeometry(PA_RIGHT, { radius: taper(0.14, 0.12), tubular: 36, radial: 12, caps: 'end' }, vesselDetail),
      ],
      'vessel',
      [-0.35, 0.45, 1.35],
      [0.35, 0.45, 0.2],
      0.5,
      'artery',
    ),
    svc: part('svc', [-0.88, 1.2, 0.0], [tubeGeometry(SVC, { radius: taper(0.17, 0.18), tubular: 18, radial: 14, caps: 'start' }, vesselDetail)], 'vessel', [-1.35, 0.3, 0.35], [0, 0.6, 0], 0.4, 'vein'),
    ivc: part('ivc', [-0.8, -0.55, -0.15], [tubeGeometry(IVC, { radius: taper(0.19, 0.2), tubular: 18, radial: 14, caps: 'start' }, vesselDetail)], 'vessel', [-1.25, -0.35, 0.55], [0, -0.55, 0], 0.4, 'vein'),
    pv: withHit(
      part(
        'pv',
        [0.3, 0.45, -0.72],
        PVS.map((p) => tubeGeometry(p, { radius: taper(0.1, 0.09), tubular: 18, radial: 10, caps: 'end' }, vesselDetail)),
        'vessel',
        [1.55, -0.2, -0.1],
        [0.95, 0.35, 0.1],
        0.55,
        'vein',
      ),
      PVS.map((p) => tubeGeometry(p, { radius: () => 0.17, tubular: 8, radial: 6 }, 0.5)),
    ),
    coronary: withHit(part('coronary', [0.0, -0.25, 0.55], coronary, 'vessel', [0.1, -0.25, 1.5], [0.25, 0.25, 0.3], 0.6, 'ventricles'), coronaryHit),
    tricuspid: valve('tricuspid', [-0.66, 0.04, 0.6], [0.45, -0.35, 0.82], 0.16, 3, [-0.85, -0.35, 1.45]),
    pulmonary: valve('pulmonary', [0.16, 0.34, 0.56], [0.32, 0.9, 0.1], 0.2, 3, [0.3, 0.05, 1.6]),
    mitral: valve('mitral', [0.9, 0.08, 0.2], [0.85, -0.15, 0.5], 0.16, 2, [1.35, -0.3, 1.0]),
    aortic: valve('aortic', [0.06, 0.62, 0.12], [-0.08, 1, 0.12], 0.23, 3, [-0.55, 0.35, 1.45]),
  };

  return { parts, face, center: HEART_CENTER };
}

function part(
  id: PartId,
  pivot: Vec3,
  geometries: BufferGeometry[],
  material: PartMaterial,
  explode: Vec3,
  label: Vec3,
  hitRadius: number,
  beat: BeatRole,
): PartBuild {
  geometries.forEach((g) => centerOn(g, pivot));
  const box = new Box3();
  for (const g of geometries) {
    g.computeBoundingBox();
    if (g.boundingBox) box.union(g.boundingBox);
  }
  const c = box.getCenter(new Vector3());
  const d = box.getSize(new Vector3());
  return { id, pivot, center: [pivot[0] + c.x, pivot[1] + c.y, pivot[2] + c.z], size: [d.x, d.y, d.z], geometries, material, explode, label, hitRadius, beat };
}

function valve(id: PartId, pivot: Vec3, normal: Vec3, radius: number, flaps: number, explode: Vec3): PartBuild {
  const d = radius * 2 + 0.1;
  return {
    id,
    pivot,
    center: pivot,
    size: [d, d, d],
    geometries: [],
    material: 'valve',
    explode,
    label: [0, radius + 0.22, 0],
    hitRadius: 0.32,
    hit: [new SphereGeometry(radius + 0.1, 12, 10)],
    beat: 'still',
    valve: { radius, normal, flaps },
  };
}

function withHit(p: PartBuild, hit: BufferGeometry[]): PartBuild {
  hit.forEach((g) => centerOn(g, p.pivot));
  return { ...p, hit };
}

const cache = new Map<number, HeartBuild>();

/** Build (once per detail level) and share the heart's geometry across every stop. */
export function heartBuild(detail: number): HeartBuild {
  const key = Math.round(Math.max(0.4, Math.min(1, detail)) * 4) / 4;
  let b = cache.get(key);
  if (!b) {
    b = build(key);
    cache.set(key, b);
  }
  return b;
}
