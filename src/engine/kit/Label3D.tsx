import { Html } from '@react-three/drei';
import type { CSSProperties, ReactNode } from 'react';
import styles from './Label3D.module.css';

/**
 * Floating name tag pinned to a 3D point. DOM-based (crisp text, no font downloads — never use drei <Text>,
 * which fetches fonts from a CDN). Decorative: the HUD carries the accessible text.
 */
export function Label3D({
  children,
  position,
  accent,
  visible = true,
  distanceFactor,
}: {
  children: ReactNode;
  position: [number, number, number];
  accent?: string;
  visible?: boolean;
  distanceFactor?: number;
}) {
  if (!visible) return null;
  return (
    <Html position={position} center={false} distanceFactor={distanceFactor} zIndexRange={[20, 0]} aria-hidden="true">
      <div className={styles.label} style={accent ? ({ ['--accent' as string]: accent } as CSSProperties) : undefined}>
        {children}
      </div>
    </Html>
  );
}
