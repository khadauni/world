import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';

type Vec3 = readonly [number, number, number];

/**
 * Smoothly flies the camera to `position` while looking at `target`, then calls `onArrive` once.
 * Frame-rate independent critically-damped easing; honours reduced motion by snapping.
 * Pass `enabled={false}` to hand the camera to OrbitControls/CameraControls during free exploration.
 */
export function CameraRig({
  position,
  target,
  smoothTime = 1.1,
  onArrive,
  enabled = true,
  reducedMotion = false,
}: {
  position: Vec3;
  target: Vec3;
  smoothTime?: number;
  onArrive?: () => void;
  enabled?: boolean;
  reducedMotion?: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const look = useRef(new Vector3(...target));
  const goalPos = useRef(new Vector3(...position));
  const goalLook = useRef(new Vector3(...target));
  const arrived = useRef(false);
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;

  useEffect(() => {
    goalPos.current.set(...position);
    goalLook.current.set(...target);
    arrived.current = false;
    if (reducedMotion) {
      camera.position.copy(goalPos.current);
      look.current.copy(goalLook.current);
      camera.lookAt(look.current);
    }
  }, [camera, position[0], position[1], position[2], target[0], target[1], target[2], reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    if (!enabled) return;
    const k = 1 - Math.exp(-dt * (4 / Math.max(0.05, smoothTime)));
    camera.position.lerp(goalPos.current, k);
    look.current.lerp(goalLook.current, k);
    camera.lookAt(look.current);
    if (!arrived.current && camera.position.distanceTo(goalPos.current) < 0.05 && look.current.distanceTo(goalLook.current) < 0.05) {
      arrived.current = true;
      onArriveRef.current?.();
    }
  });

  return null;
}
