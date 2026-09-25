/**
 * The racing line: a smooth lateral path (x, y as a function of s) through every ring centre and collectible.
 * Autopilot follows it, assist mode leans toward it, and obstacles are placed clear of it — so the ship on
 * autopilot threads every ring and never bumps a static rock.
 *
 * Stored flat as [s0, x0, y0, s1, x1, y1, …] sorted by s.
 */

export interface LineSample {
  x: number;
  y: number;
}

function node(line: Float32Array, i: number, k: number): number {
  const n = line.length / 3;
  const j = Math.max(0, Math.min(n - 1, i));
  return line[j * 3 + k] ?? 0;
}

/** Index of the last node with s ≤ `s` (binary search). */
export function lineSegment(line: Float32Array, s: number): number {
  const n = line.length / 3;
  let lo = 0;
  let hi = n - 1;
  if (s <= (line[0] ?? 0)) return 0;
  if (s >= (line[(n - 1) * 3] ?? 0)) return Math.max(0, n - 2);
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((line[mid * 3] ?? 0) <= s) lo = mid;
    else hi = mid;
  }
  return lo;
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Lateral position of the racing line at distance `s` (Catmull–Rom through the nodes). Allocation-free. */
export function lineAt(line: Float32Array, s: number, out: LineSample): LineSample {
  const n = line.length / 3;
  if (n === 0) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  if (n === 1) {
    out.x = line[1] ?? 0;
    out.y = line[2] ?? 0;
    return out;
  }
  const i = lineSegment(line, s);
  const s1 = node(line, i, 0);
  const s2 = node(line, i + 1, 0);
  const t = s2 > s1 ? Math.min(1, Math.max(0, (s - s1) / (s2 - s1))) : 0;
  out.x = catmull(node(line, i - 1, 1), node(line, i, 1), node(line, i + 1, 1), node(line, i + 2, 1), t);
  out.y = catmull(node(line, i - 1, 2), node(line, i, 2), node(line, i + 1, 2), node(line, i + 2, 2), t);
  return out;
}

/** Build a flat racing line from nodes (sorted by s; nodes closer than `minGap` are merged). */
export function buildLine(nodes: readonly { s: number; x: number; y: number }[], minGap = 1): Float32Array {
  const sorted = nodes.slice().sort((a, b) => a.s - b.s);
  const kept: { s: number; x: number; y: number }[] = [];
  for (const n of sorted) {
    const prev = kept[kept.length - 1];
    if (prev && n.s - prev.s < minGap) {
      prev.x = (prev.x + n.x) / 2;
      prev.y = (prev.y + n.y) / 2;
    } else kept.push({ s: n.s, x: n.x, y: n.y });
  }
  const out = new Float32Array(kept.length * 3);
  kept.forEach((n, i) => {
    out[i * 3] = n.s;
    out[i * 3 + 1] = n.x;
    out[i * 3 + 2] = n.y;
  });
  return out;
}
