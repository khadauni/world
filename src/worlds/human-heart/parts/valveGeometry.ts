import { BufferAttribute, BufferGeometry } from 'three';

/**
 * One valve flap (leaflet / cusp) in local space: the hinge runs along the x-axis at y = 0 (on the valve
 * ring), the flap reaches the ring's centre at y = h and bulges a little along +z like a soft pocket.
 * Rotating the flap about its hinge (local x) opens the valve.
 */
export function leafletGeometry(ringRadius: number, flaps: number, bulge = 0.18, detail = 1): BufferGeometry {
  const half = Math.PI / flaps;
  const c = ringRadius * Math.sin(half);
  const h = ringRadius * Math.cos(half);
  const ns = Math.max(6, Math.round(12 * detail));
  const nw = Math.max(6, Math.round(12 * detail));
  const pos: number[] = [];
  const uv: number[] = [];
  for (let i = 0; i <= ns; i++) {
    const s = i / ns;
    for (let j = 0; j <= nw; j++) {
      const w = (j / nw) * 2 - 1;
      // Outer edge follows the ring (slightly beyond the chord); tip meets the centre.
      const width = c * Math.pow(1 - s, 0.85) * (1 + 0.12 * Math.sin(s * Math.PI));
      const x = w * width;
      const y = s * h - (1 - s) * (1 - w * w) * c * 0.18;
      const z = bulge * ringRadius * (1 - w * w) * Math.sin(Math.PI * Math.min(1, s * 1.15)) * (1 - s * 0.4);
      pos.push(x, y, z);
      uv.push(j / nw, s);
    }
  }
  const idx: number[] = [];
  const cols = nw + 1;
  for (let i = 0; i < ns; i++) {
    for (let j = 0; j < nw; j++) {
      const a = i * cols + j;
      const b = (i + 1) * cols + j;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Where each flap's hinge sits on the ring, and which way it faces, for `flaps` evenly spaced flaps. */
export function hingeLayout(ringRadius: number, flaps: number): { x: number; y: number; angle: number }[] {
  const half = Math.PI / flaps;
  const d = ringRadius * Math.cos(half);
  return Array.from({ length: flaps }, (_, i) => {
    const a = (i / flaps) * Math.PI * 2 + Math.PI / 2;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, angle: a };
  });
}
