/**
 * Drag-to-spin "turntable" physics for the hero model: a child can swipe to peek around the heart,
 * it keeps a little momentum, and it always springs gently back to the teaching angle (no getting lost).
 */
export interface Spin {
  yaw: number;
  vel: number;
  dragging: boolean;
}

export function makeSpin(): Spin {
  return { yaw: 0, vel: 0, dragging: false };
}

/** Radians of spin per pixel dragged, relative to the canvas width. */
export function dragToYaw(dxPx: number, widthPx: number): number {
  return (dxPx / Math.max(200, widthPx)) * Math.PI * 1.4;
}

/** Soft limit: resistance grows smoothly past `limit` (rubber band), never a hard stop. */
export function rubber(yaw: number, limit: number): number {
  const a = Math.abs(yaw);
  if (a <= limit) return yaw;
  const extra = a - limit;
  return Math.sign(yaw) * (limit + extra / (1 + extra * 2.5));
}

/** Advance one frame (mutates, no allocations). */
export function stepSpin(s: Spin, dt: number, limit: number, springBack = true): void {
  const d = Math.min(Math.max(dt, 0), 0.1);
  if (s.dragging) return;
  s.yaw += s.vel * d;
  s.vel *= Math.exp(-d * 3.2);
  if (springBack) {
    // Gentle spring toward the hero angle, stronger when far out of bounds.
    const k = Math.abs(s.yaw) > limit ? 7 : 0.9;
    s.vel += -s.yaw * k * d;
  }
  s.yaw = rubber(s.yaw, limit * 1.25);
}
