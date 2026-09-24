import { useCursor } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef, useState, type ReactNode } from 'react';
import type { Group } from 'three';

/**
 * Makes any 3D object feel touchable: pointer cursor, springy hover grow, squash on press.
 * Kids tap fast and imprecisely, so the hit area can be enlarged with an invisible sphere (`hitRadius`).
 */
export function Tappable({
  children,
  onTap,
  disabled = false,
  hoverScale = 1.08,
  hitRadius,
  position,
  name,
}: {
  children: ReactNode;
  onTap: (e: ThreeEvent<MouseEvent>) => void;
  disabled?: boolean;
  hoverScale?: number;
  hitRadius?: number;
  position?: [number, number, number];
  name?: string;
}) {
  const ref = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const pressed = useRef(0);
  useCursor(hovered && !disabled);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    pressed.current = Math.max(0, pressed.current - dt * 4);
    const target = (hovered && !disabled ? hoverScale : 1) * (1 - Math.sin(pressed.current * Math.PI) * 0.12);
    const s = g.scale.x + (target - g.scale.x) * Math.min(1, dt * 12);
    g.scale.setScalar(s);
  });

  return (
    <group
      ref={ref}
      position={position}
      name={name}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        pressed.current = 1;
        onTap(e);
      }}
    >
      {children}
      {hitRadius !== undefined && (
        <mesh visible={false}>
          <sphereGeometry args={[hitRadius, 12, 12]} />
          <meshBasicMaterial />
        </mesh>
      )}
    </group>
  );
}
