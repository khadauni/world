import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_FOV_KICK, DEFAULT_SHAKE } from '../store/fxStore';
import { createSignals } from '../store/signals';
import { CameraFxRig } from './CameraFxRig';

function cam() {
  const c = new PerspectiveCamera(50, 1.5, 0.1, 100);
  c.position.set(1, 2, 3);
  c.lookAt(0, 0, 0);
  c.updateMatrixWorld();
  return c;
}

describe('CameraFxRig', () => {
  it('shakes during the render and restores the exact pose afterwards (no drift over many frames)', () => {
    const c = cam();
    const pos = c.position.clone();
    const quat = c.quaternion.clone();
    const rig = new CameraFxRig();
    const s = createSignals();
    s.shake = 1;
    let moved = false;
    for (let i = 0; i < 500; i++) {
      s.time = i / 60;
      rig.apply(c, s, DEFAULT_SHAKE, DEFAULT_FOV_KICK, 1 / 60);
      if (c.position.distanceTo(pos) > 1e-4) moved = true;
      rig.restore();
      expect(c.position.equals(pos)).toBe(true);
      expect(c.quaternion.equals(quat)).toBe(true);
    }
    expect(moved).toBe(true);
  });

  it('a controller moving the camera between frames is respected (the rig never overrides it)', () => {
    const c = cam();
    const rig = new CameraFxRig();
    const s = createSignals();
    s.shake = 0.8;
    s.time = 0.3;
    rig.apply(c, s, DEFAULT_SHAKE, DEFAULT_FOV_KICK, 1 / 60);
    rig.restore();
    c.position.set(10, 0, 0); // controller moves it
    rig.apply(c, s, DEFAULT_SHAKE, DEFAULT_FOV_KICK, 1 / 60);
    rig.restore();
    expect(c.position.toArray()).toEqual([10, 0, 0]);
  });

  it('kicks the FOV only when <FovKick> is enabled, and restores it', () => {
    const c = cam();
    const rig = new CameraFxRig();
    const s = createSignals();
    s.fovKick = 20;
    rig.apply(c, s, DEFAULT_SHAKE, DEFAULT_FOV_KICK, 1 / 60);
    expect(c.fov).toBe(50);
    rig.restore();
    const on = { ...DEFAULT_FOV_KICK, enabled: true, maxDegrees: 12 };
    for (let i = 0; i < 120; i++) {
      rig.apply(c, s, DEFAULT_SHAKE, on, 1 / 60);
      if (i < 119) rig.restore();
    }
    expect(c.fov).toBeGreaterThan(61);
    expect(c.fov).toBeLessThanOrEqual(62);
    rig.restore();
    expect(c.fov).toBe(50);
  });

  it('does nothing at all when calm', () => {
    const c = cam();
    const before = c.matrixWorld.clone();
    const rig = new CameraFxRig();
    rig.apply(c, createSignals(), DEFAULT_SHAKE, DEFAULT_FOV_KICK, 1 / 60);
    expect(c.matrixWorld.equals(before)).toBe(true);
    rig.restore();
    expect(c.matrixWorld.equals(before)).toBe(true);
  });
});
