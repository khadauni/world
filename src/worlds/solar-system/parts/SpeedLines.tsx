import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BoxGeometry, Matrix4, MeshBasicMaterial, Vector3, type InstancedMesh, type Quaternion } from 'three';
import { mulberry32 } from '@/core/random';
import { useSolar } from '../state';
import { useDisposable } from './hooks';

const COUNT = 48;
const NEAR = 2;
const FAR = 46;
const m = new Matrix4();
const pos = new Vector3();
const right = new Vector3();
const up = new Vector3();
const fwd = new Vector3();
const scl = new Vector3();

/**
 * Warp-speed streaks that rush past the camera while the rocket is at full speed (one instanced draw call).
 * Lives in camera space, so it reads as "we're going fast!" whatever direction we fly.
 */
export function SpeedLines({ enabled }: { enabled: boolean }) {
  const sys = useSolar();
  const camera = useThree((s) => s.camera);
  const mesh = useRef<InstancedMesh>(null);
  const geo = useDisposable(() => new BoxGeometry(0.035, 0.035, 1), []);
  const mat = useDisposable(() => new MeshBasicMaterial({ color: '#d6e6ff', transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  const streaks = useMemo(() => {
    const rand = mulberry32(77);
    return Array.from({ length: COUNT }, () => {
      const a = rand() * Math.PI * 2;
      const r = 1.4 + rand() * 5;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: NEAR + rand() * (FAR - NEAR) };
    });
  }, []);

  useLayoutEffect(() => {
    if (mesh.current) mesh.current.count = COUNT;
  }, []);

  useFrame((_, delta) => {
    const inst = mesh.current;
    if (!inst) return;
    const speed = enabled ? sys.rocket.speed : 0;
    mat.opacity += (speed * 0.55 - mat.opacity) * Math.min(1, delta * 6);
    inst.visible = mat.opacity > 0.01;
    if (!inst.visible) return;
    const q: Quaternion = camera.quaternion;
    right.set(1, 0, 0).applyQuaternion(q);
    up.set(0, 1, 0).applyQuaternion(q);
    fwd.set(0, 0, -1).applyQuaternion(q);
    const dt = Math.min(delta, 0.1);
    const len = 1.5 + speed * 7;
    for (let i = 0; i < COUNT; i++) {
      const s = streaks[i];
      if (s === undefined) continue;
      s.z -= dt * (18 + 70 * speed);
      if (s.z < NEAR) s.z += FAR - NEAR;
      pos.copy(camera.position).addScaledVector(right, s.x).addScaledVector(up, s.y).addScaledVector(fwd, s.z);
      m.compose(pos, q, scl.set(1, 1, len));
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geo, mat, COUNT]} frustumCulled={false} renderOrder={9} />;
}
