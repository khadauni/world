import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import { Quaternion, type Camera, type Group, type Object3D } from 'three';

const parentQ = new Quaternion();
const cameraQ = new Quaternion();

/**
 * Rotate `inner` (a child of `outer`) so that it ends up with the camera's world orientation — i.e. it faces the
 * camera — whatever the rotation of `outer` and its parents. Allocation-free.
 */
export function turnToFace(outer: Object3D, inner: Object3D, camera: Camera): void {
  outer.getWorldQuaternion(parentQ);
  camera.getWorldQuaternion(cameraQ);
  inner.quaternion.copy(parentQ.invert().multiply(cameraQ));
}

/**
 * Keeps its children turned to face the camera — like drei's `<Billboard>`, but without its per-frame
 * allocations (it runs for every map ring, target halo and the Sun's corona).
 */
export function Facing({ children }: { children: ReactNode }) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (outer.current && inner.current) turnToFace(outer.current, inner.current, camera);
  });
  return (
    <group ref={outer}>
      <group ref={inner}>{children}</group>
    </group>
  );
}
