import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CanvasTexture, CatmullRomCurve3, SRGBColorSpace, Vector3, type Mesh, type MeshBasicMaterial } from 'three';

let arrowTex: CanvasTexture | null = null;
/** A soft rounded chevron drawn once on a 2D canvas (no image files). */
function chevron(): CanvasTexture {
  if (arrowTex) return arrowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,255,255,1)';
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(22, 14);
    g.lineTo(42, 32);
    g.lineTo(22, 50);
    g.stroke();
  }
  arrowTex = new CanvasTexture(c);
  arrowTex.colorSpace = SRGBColorSpace;
  return arrowTex;
}

const p = new Vector3();
const t = new Vector3();

/**
 * Little chevrons gliding along the path blood takes (in the local XY plane) — shows direction of flow.
 */
export function FlowArrows({ points, count = 5, z = 0.2, speed = 0.18, color = '#ffffff', size = 0.16, visible = true }: { points: readonly (readonly [number, number])[]; count?: number; z?: number; speed?: number; color?: string; size?: number; visible?: boolean }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((q) => new Vector3(q[0], q[1], z)), false, 'centripetal'), [points, z]);
  const arrows = useRef<(Mesh | null)[]>([]);
  const time = useRef(0);
  const tex = useMemo(chevron, []);
  useFrame((_, dt) => {
    time.current += Math.min(dt, 0.1) * speed;
    for (let i = 0; i < arrows.current.length; i++) {
      const a = arrows.current[i];
      if (!a) continue;
      a.visible = visible;
      if (!visible) continue;
      const u = (time.current + i / count) % 1;
      curve.getPointAt(u, p);
      curve.getTangentAt(u, t);
      a.position.copy(p);
      a.rotation.z = Math.atan2(t.y, t.x);
      const fade = Math.min(1, Math.min(u, 1 - u) * 6);
      (a.material as MeshBasicMaterial).opacity = fade * 0.9;
      a.scale.setScalar(size * (0.7 + fade * 0.3));
    }
  });
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          renderOrder={9}
          ref={(el) => {
            arrows.current[i] = el;
          }}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex} color={color} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
