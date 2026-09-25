import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Vector3, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { fitDistance, orbitLimits, usableFraction, type Shot } from '../logic/camera';
import { live } from '../store';

const tmpDir = new Vector3();

/**
 * Drives the camera for one stop: snaps to `entry` on mount (hidden behind the iris), then glides to
 * `shot` with critically-damped easing, fitting the framing box to the viewport. When `orbit` is on and
 * the camera has settled, hands over to OrbitControls with tight limits so a child can peek around
 * without getting lost. `liveTarget` lets a stop follow a moving subject without re-rendering.
 */
export function ShotCamera({
  shot,
  entry,
  reducedMotion,
  smooth = 1,
  orbit = false,
  onSettled,
  shake,
  liveTarget,
  liveFit,
}: {
  shot: Shot;
  entry?: Shot;
  reducedMotion: boolean;
  smooth?: number;
  orbit?: boolean;
  onSettled?: () => void;
  shake?: RefObject<number>;
  liveTarget?: RefObject<Vector3 | null>;
  /** Optional per-frame framing box (e.g. grow the view while a lander is high up). */
  liveFit?: RefObject<readonly [number, number] | null>;
}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const base = useRef(new Vector3());
  const look = useRef(new Vector3());
  const goal = useRef(new Vector3());
  const goalLook = useRef(new Vector3());
  const settled = useRef(false);
  const time = useRef(0);
  const controls = useRef<OrbitControlsImpl>(null);
  const [orbitOn, setOrbitOn] = useState(false);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const key = `${shot.target.join(',')}|${shot.dir.join(',')}|${shot.fit.join(',')}`;
  const aspect = size.width / Math.max(1, size.height);

  function computeGoal(s: Shot, target?: Vector3 | null) {
    const fit = liveFit?.current ?? s.fit;
    const dist = fitDistance(fit, aspect, camera.fov, usableFraction(size.height, live.hudTop, live.hudBottom));
    if (target) goalLook.current.copy(target);
    else goalLook.current.set(s.target[0], s.target[1], s.target[2]);
    tmpDir.set(s.dir[0], s.dir[1], s.dir[2]).normalize().multiplyScalar(dist);
    goal.current.copy(goalLook.current).add(tmpDir);
    return dist;
  }

  // Snap to the entry framing on mount (the iris hides the jump).
  useLayoutEffect(() => {
    computeGoal(entry ?? shot);
    base.current.copy(goal.current);
    look.current.copy(goalLook.current);
    camera.position.copy(base.current);
    camera.lookAt(look.current);
    settled.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  // New shot → leave orbit mode and glide again.
  useLayoutEffect(() => {
    settled.current = false;
    time.current = 0;
    if (orbitOn) {
      base.current.copy(camera.position);
      if (controls.current) look.current.copy(controls.current.target);
      setOrbitOn(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useLayoutEffect(() => {
    if (!orbit && orbitOn) {
      base.current.copy(camera.position);
      if (controls.current) look.current.copy(controls.current.target);
      setOrbitOn(false);
    }
  }, [orbit, orbitOn, camera]);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.25);
    time.current += step;
    const dist = computeGoal(shot, liveTarget?.current ?? null);
    if (orbitOn) return;
    const k = reducedMotion ? 1 : 1 - Math.exp(-step * (4 / Math.max(0.05, smooth)));
    base.current.lerp(goal.current, k);
    look.current.lerp(goalLook.current, k);
    camera.position.copy(base.current);
    const sh = shake?.current ?? 0;
    if (sh > 0 && !reducedMotion) {
      const t = time.current * 38;
      camera.position.x += Math.sin(t * 1.3) * sh * 0.06;
      camera.position.y += Math.sin(t * 1.7 + 1) * sh * 0.06;
    }
    camera.lookAt(look.current);
    if (!settled.current && (base.current.distanceTo(goal.current) < Math.max(0.02, dist * 0.004) || time.current > 4)) {
      settled.current = true;
      onSettledRef.current?.();
      if (orbit && !liveTarget?.current) setOrbitOn(true);
    }
  });

  const limits = useMemo(
    () => orbitLimits(shot, fitDistance(shot.fit, aspect, camera.fov, usableFraction(size.height, live.hudTop, live.hudBottom))),
    [shot, aspect, camera.fov, size.height],
  );

  if (!orbit || !orbitOn) return null;
  return (
    <OrbitControls
      ref={controls}
      makeDefault={false}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.6}
      target={[shot.target[0], shot.target[1], shot.target[2]]}
      {...limits}
    />
  );
}
