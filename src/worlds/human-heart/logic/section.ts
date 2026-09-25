import type { ChamberId } from './ids';

/**
 * The cut-away heart as a front-facing cross-section (x = viewer's right = the owner's LEFT, y = up).
 * Hand-tuned so the walls teach: the left ventricle's wall is about twice as thick as the right's,
 * the septum divides the sides, and each ventricle has an outflow channel up to its exit valve.
 */
export type P2 = readonly [number, number];

export const OUTLINE: readonly P2[] = [
  [0.5, -1.62],
  [1.02, -1.18],
  [1.3, -0.55],
  [1.36, -0.05],
  [1.34, 0.4],
  [1.2, 0.78],
  [0.9, 0.96],
  [0.52, 0.93],
  [0.3, 0.9],
  [0.08, 0.92],
  [-0.2, 0.92],
  [-0.46, 0.93],
  [-0.8, 1.02],
  [-1.14, 0.9],
  [-1.32, 0.5],
  [-1.27, 0.05],
  [-1.13, -0.45],
  [-0.9, -0.96],
  [-0.45, -1.32],
];

/** Right side cavity: right atrium + (tricuspid waist) + right ventricle + pulmonary outflow channel. */
export const RIGHT_HOLE: readonly P2[] = [
  [-0.74, 0.7],
  [-0.5, 0.63],
  [-0.42, 0.4],
  [-0.47, 0.12],
  [-0.52, -0.02],
  [-0.36, -0.14],
  [-0.27, -0.08],
  [-0.26, 0.5],
  [-0.18, 0.66],
  [-0.04, 0.66],
  [0.02, 0.5],
  [0.02, -0.18],
  [0.08, -0.45],
  [0.02, -0.78],
  [-0.2, -1.02],
  [-0.52, -1.03],
  [-0.8, -0.82],
  [-0.94, -0.46],
  [-0.88, -0.16],
  [-0.74, -0.04],
  [-0.9, 0.06],
  [-1.08, 0.3],
  [-1.07, 0.56],
  [-0.93, 0.68],
];

/** Left side cavity: left atrium + (mitral waist) + left ventricle + aortic outflow channel. */
export const LEFT_HOLE: readonly P2[] = [
  [0.78, 0.72],
  [1.02, 0.62],
  [1.1, 0.36],
  [1.0, 0.12],
  [0.84, 0.0],
  [0.9, -0.28],
  [0.87, -0.66],
  [0.74, -0.98],
  [0.56, -1.1],
  [0.4, -0.94],
  [0.33, -0.6],
  [0.3, -0.26],
  [0.2, -0.1],
  [0.2, 0.5],
  [0.26, 0.66],
  [0.4, 0.66],
  [0.45, 0.5],
  [0.45, 0.02],
  [0.52, -0.1],
  [0.64, -0.02],
  [0.56, 0.14],
  [0.54, 0.42],
  [0.62, 0.64],
];

/** Valve positions in the section (centre + which way blood flows through). */
export const SECTION_VALVES = {
  tricuspid: { at: [-0.63, -0.03] as P2, flow: [0, -1] as P2, radius: 0.16 },
  pulmonary: { at: [-0.12, 0.62] as P2, flow: [0, 1] as P2, radius: 0.15 },
  mitral: { at: [0.74, -0.01] as P2, flow: [0, -1] as P2, radius: 0.16 },
  aortic: { at: [0.33, 0.62] as P2, flow: [0, 1] as P2, radius: 0.15 },
} as const;

/** The way blood flows through each side (for the direction arrows): atrium → valve → ventricle → exit valve. */
export const FLOW_PATHS: Readonly<Record<'right' | 'left', readonly P2[]>> = {
  right: [
    [-0.8, 0.5],
    [-0.68, 0.18],
    [-0.63, -0.06],
    [-0.52, -0.5],
    [-0.28, -0.7],
    [-0.13, -0.35],
    [-0.12, 0.2],
    [-0.12, 0.62],
  ],
  left: [
    [0.86, 0.5],
    [0.78, 0.18],
    [0.74, -0.04],
    [0.7, -0.5],
    [0.56, -0.86],
    [0.4, -0.6],
    [0.33, -0.15],
    [0.33, 0.62],
  ],
};

/** Label anchors for each chamber (centre of its cavity). */
export const CHAMBER_CENTER: Readonly<Record<ChamberId, P2>> = {
  ra: [-0.76, 0.36],
  rv: [-0.44, -0.58],
  la: [0.82, 0.38],
  lv: [0.62, -0.56],
};

/** Waist heights: above = atrium, below = ventricle. */
const WAIST_Y = { right: -0.04, left: -0.01 } as const;

/**
 * Which chamber a point of a cavity belongs to. The outflow channels (up the middle) belong to the
 * ventricle they drain, even though they rise above the waist.
 */
export function chamberAt(side: 'right' | 'left', x: number, y: number): ChamberId {
  if (side === 'right') {
    if (x > -0.33) return 'rv';
    return y > WAIST_Y.right ? 'ra' : 'rv';
  }
  if (x < 0.49) return 'lv';
  return y > WAIST_Y.left ? 'la' : 'lv';
}

/** Closed centripetal Catmull-Rom through the points (smooth, rounded outlines). */
export function closedSpline(points: readonly P2[], perSegment = 6): [number, number][] {
  const n = points.length;
  const out: [number, number][] = [];
  const get = (i: number) => points[((i % n) + n) % n] as P2;
  for (let i = 0; i < n; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      out.push([x, y]);
    }
  }
  return out;
}

/** Shoelace area (positive = counter-clockwise). */
export function signedArea(points: readonly P2[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i] as P2;
    const q = points[(i + 1) % points.length] as P2;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** Point-in-polygon (even-odd rule). */
export function inside(points: readonly P2[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const pi = points[i] as P2;
    const pj = points[j] as P2;
    if (pi[1] > y !== pj[1] > y && x < ((pj[0] - pi[0]) * (y - pi[1])) / (pj[1] - pi[1]) + pi[0]) c = !c;
  }
  return c;
}
