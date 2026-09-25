import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import type { Object3D } from 'three';
import { dragToYaw, makeSpin, stepSpin, type Spin } from '../logic/spin';

/**
 * Swipe-to-spin for the hero model. Listens on the canvas (so it works anywhere on screen), ignores tiny
 * movements (those are taps), and springs back to the teaching angle. Applies yaw to `target.rotation.y`.
 */
export function useSpin(target: RefObject<Object3D | null>, enabled: boolean, limit = 0.9, base = 0): RefObject<Spin> {
  const gl = useThree((s) => s.gl);
  const width = useThree((s) => s.size.width);
  const spin = useRef<Spin>(makeSpin());
  const drag = useRef({ id: -1, x: 0, startX: 0, lastT: 0, moved: false });
  const on = useRef(enabled);
  on.current = enabled;
  const w = useRef(width);
  w.current = width;

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (!on.current || drag.current.id !== -1) return;
      drag.current = { id: e.pointerId, x: e.clientX, startX: e.clientX, lastT: performance.now(), moved: false };
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (d.id !== e.pointerId || !on.current) return;
      if (!d.moved && Math.abs(e.clientX - d.startX) < 8) return;
      d.moved = true;
      spin.current.dragging = true;
      const now = performance.now();
      const dy = dragToYaw(e.clientX - d.x, w.current);
      spin.current.yaw += dy;
      const dt = Math.max(1, now - d.lastT) / 1000;
      spin.current.vel = spin.current.vel * 0.5 + (dy / dt) * 0.5;
      d.x = e.clientX;
      d.lastT = now;
    };
    const up = (e: PointerEvent) => {
      if (drag.current.id !== e.pointerId) return;
      drag.current.id = -1;
      spin.current.dragging = false;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const s = spin.current;
    if (!on.current) {
      s.dragging = false;
      s.vel = 0;
      s.yaw += (0 - s.yaw) * Math.min(1, dt * 4);
    } else stepSpin(s, dt, limit);
    const t = target.current;
    if (t) t.rotation.y = base + s.yaw;
  });

  return spin;
}
