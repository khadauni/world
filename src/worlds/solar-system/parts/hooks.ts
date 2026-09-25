import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type DependencyList, type RefObject } from 'react';
import { Quaternion, SphereGeometry, Vector3, type Group, type Object3D } from 'three';
import { BODIES, tiltAxis, type BodyId } from '../layout';
import { useSolar } from '../state';

interface Disposable {
  dispose(): void;
}

/** useMemo for GPU resources: the old one is disposed when deps change or the component unmounts. */
export function useDisposable<T extends Disposable>(factory: () => T, deps: DependencyList): T {
  const value = useMemo(factory, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => value.dispose(), [value]);
  return value;
}

/** Unit sphere with segment count scaled by the device's detail level. */
export function useSphere(segments: number, detail: number): SphereGeometry {
  const w = Math.max(16, Math.round(segments * detail));
  return useDisposable(() => new SphereGeometry(1, w, Math.max(12, Math.round(w * 0.75))), [w]);
}

const axis = new Vector3();
const q = new Quaternion();

/**
 * Keeps a body's anchor on its orbit, its tilt group leaning on the right axis, and its surface spinning.
 * A task may lock the spin (sys.spinLock) to turn a feature toward the camera.
 */
export function useBodyMotion(id: BodyId, anchor: RefObject<Group | null>, tilt: RefObject<Group | null> | null, spinners: readonly RefObject<Object3D | null>[], tiltDegOverride?: () => number) {
  const sys = useSolar();
  const pop = useRef({ s: 1, v: 0 });
  useFrame((_, dt) => {
    const b = BODIES[id];
    const pos = sys.positions[id];
    const a = anchor.current;
    if (a) {
      a.position.copy(pos);
      // Focus mode: other planets shrink away for a clean close-up, then bounce back on the map.
      const target = id === 'sun' || id === sys.focus ? 1 : 1 - sys.focusMix;
      const p = pop.current;
      if (sys.reducedMotion || dt > 0.3) {
        p.s = target;
        p.v = 0;
      } else {
        const step = Math.min(dt, 0.05);
        p.v += ((target - p.s) * 90 - p.v * (target < p.s ? 19 : 9)) * step;
        p.s = Math.max(0, p.s + p.v * step);
      }
      a.scale.setScalar(Math.max(p.s, 0.0001));
      a.visible = p.s > 0.01;
    }
    if (tilt?.current) {
      const t = tiltDegOverride ? (tiltDegOverride() * Math.PI) / 180 : b.tilt;
      tiltAxis(id, pos, axis);
      tilt.current.quaternion.copy(q.setFromAxisAngle(axis, t));
    }
    const lock = sys.spinLock[id];
    if (lock === undefined) {
      sys.spin[id] += dt * b.spin;
    } else {
      // Ease the shortest way round to the locked angle.
      let d = lock - sys.spin[id];
      d = Math.atan2(Math.sin(d), Math.cos(d));
      sys.spin[id] += d * Math.min(1, dt * 2.2);
    }
    for (let i = 0; i < spinners.length; i++) {
      const sp = spinners[i]?.current;
      if (sp) sp.rotation.y = sys.spin[id];
    }
  });
}
