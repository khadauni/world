import { describe, expect, it } from 'vitest';
import { content } from './content';
import { fitAround, hudFor, OVERLAY_TASKS, rotateZ } from './logic/camera';
import { latchAngles, latchScale } from './parts/Spacecraft';

describe('HUD reservation per task', () => {
  it('keeps the bottom free during pure-3D tasks and reserves it for overlay controls', () => {
    const [, withControls] = hudFor('task', 800, 'land-vikram');
    const [, pure3d] = hudFor('task', 800, 'trace-path');
    expect(withControls).toBeGreaterThan(200);
    expect(pure3d).toBeLessThan(60);
    // Outside the task phase the task kind does not matter.
    expect(hudFor('explore', 800, 'trace-path')).toEqual(hudFor('explore', 800));
  });

  it('knows every task kind in the content, and every overlay kind is used by a stop', () => {
    const kinds = content.stops.map((s) => s.task?.kind).filter((k): k is string => !!k);
    expect(kinds).toHaveLength(content.stops.length);
    for (const k of OVERLAY_TASKS) expect(kinds, k).toContain(k);
    expect(kinds.filter((k) => !OVERLAY_TASKS.has(k)).sort()).toEqual(['release-latches', 'rover-samples', 'trace-path']);
  });
});

describe('portrait tilt framing', () => {
  it('rotates about Z like Object3D.rotation.z', () => {
    const [x, y, z] = rotateZ([1, 0, 3], Math.PI / 2);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
    expect(z).toBe(3);
  });

  it('turns a wide Earth → Moon diorama into a tall frame', () => {
    const items = [
      [-7.6, -1.3, 0, 2.3],
      [7.6, 1.2, 0, 1.8],
    ] as const;
    const flat = fitAround(items, 0, [0, 0, 1]);
    const tipped = fitAround(items, 0.9, [0, 0, 1]);
    expect(flat.fit[0]).toBeGreaterThan(flat.fit[1]);
    expect(tipped.fit[1]).toBeGreaterThan(tipped.fit[0]);
    // Everything stays inside the frame.
    for (const [x, y, z, r] of items) {
      const [rx, ry] = rotateZ([x, y, z], 0.9);
      expect(Math.abs(rx - tipped.target[0]) + r).toBeLessThanOrEqual(tipped.fit[0] / 2 + 1e-9);
      expect(Math.abs(ry - tipped.target[1]) + r).toBeLessThanOrEqual(tipped.fit[1] / 2 + 1e-9);
    }
    expect(fitAround([], 0.5, [0, 0, 1]).fit).toEqual([1, 1]);
  });
});

describe('separation latches', () => {
  it('sit between Vikram’s front legs (±45°) for every band size, without overlapping', () => {
    for (const count of [1, 3, 4]) {
      const angles = latchAngles(count);
      expect(angles).toHaveLength(count);
      const halfWidth = (0.26 * latchScale(count)) / 0.92; // clamp half-width in radians on the ring
      for (const a of angles) expect(Math.abs(a) + halfWidth).toBeLessThan(Math.PI / 4 + 0.05);
      for (let i = 1; i < angles.length; i++) expect((angles[i] as number) - (angles[i - 1] as number)).toBeGreaterThan(halfWidth * 1.6);
    }
  });
});
