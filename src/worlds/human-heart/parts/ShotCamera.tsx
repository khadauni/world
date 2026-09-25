import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { Vector3, type PerspectiveCamera } from 'three';
import { damp, fitDistance, usableFraction, type Shot } from '../logic/camera';
import { live } from '../store';

const tmpDir = new Vector3();

export interface CameraOverride {
  on: boolean;
  pos: Vector3;
  look: Vector3;
}

/**
 * Drives the camera for one set: snaps to `entry` on mount (hidden by the iris), then glides to `shot`,
 * fitting the framing box to the viewport and the space the HUD leaves free. `override` lets a set take
 * the camera directly (the blood-cell chase cam) while keeping the same smoothing.
 */
export function ShotCamera({
  shot,
  entry,
  reducedMotion,
  smooth = 1,
  onSettled,
  override,
}: {
  shot: Shot;
  entry?: Shot;
  reducedMotion: boolean;
  smooth?: number;
  onSettled?: () => void;
  override?: RefObject<CameraOverride | null>;
}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const pos = useRef(new Vector3());
  const look = useRef(new Vector3());
  const goal = useRef(new Vector3());
  const goalLook = useRef(new Vector3());
  const settled = useRef(false);
  const time = useRef(0);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const key = `${shot.target.join(',')}|${shot.dir.join(',')}|${shot.fit.join(',')}`;
  const aspect = size.width / Math.max(1, size.height);

  const compute = (s: Shot) => {
    const dist = fitDistance(s.fit, aspect, camera.fov, usableFraction(size.height, live.hudTop, live.hudBottom));
    goalLook.current.set(s.target[0], s.target[1], s.target[2]);
    tmpDir.set(s.dir[0], s.dir[1], s.dir[2]).normalize().multiplyScalar(dist);
    goal.current.copy(goalLook.current).add(tmpDir);
    return dist;
  };

  useLayoutEffect(() => {
    compute(entry ?? shot);
    pos.current.copy(goal.current);
    look.current.copy(goalLook.current);
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
    settled.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  useLayoutEffect(() => {
    settled.current = false;
    time.current = 0;
  }, [key]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.25);
    time.current += dt;
    const o = override?.current;
    let dist = 1;
    if (o?.on) {
      goal.current.copy(o.pos);
      goalLook.current.copy(o.look);
    } else dist = compute(shot);
    const k = reducedMotion ? 1 : damp(dt, smooth);
    pos.current.lerp(goal.current, k);
    look.current.lerp(goalLook.current, k);
    camera.position.copy(pos.current);
    camera.lookAt(look.current);
    if (!settled.current && (pos.current.distanceTo(goal.current) < Math.max(0.02, dist * 0.006) || time.current > 3.2)) {
      settled.current = true;
      onSettledRef.current?.();
    }
  });

  return null;
}
