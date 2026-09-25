import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Vector3 } from 'three';
import { anchors, elements, useLabels, type LabelSpec } from '../labels';

/**
 * Pins a DOM name tag to this point in the 3D scene (follows parent transforms: exploding parts,
 * bobbing bubbles…). Rendered by the Overlay's LabelLayer.
 */
export function Tag({ id, position = [0, 0, 0], ...spec }: Omit<LabelSpec, 'id'> & { id: string; position?: [number, number, number] }) {
  const upsert = useLabels((s) => s.upsert);
  const remove = useLabels((s) => s.remove);
  const { text, accent, emoji, placement, visible } = spec;

  useEffect(() => {
    upsert({ id, text, accent, emoji, placement, visible });
  }, [id, text, accent, emoji, placement, visible, upsert]);
  useEffect(() => () => remove(id), [id, remove]);

  return (
    <group
      position={position}
      ref={(el) => {
        if (!el) return;
        anchors.set(id, el);
        return () => {
          if (anchors.get(id) === el) anchors.delete(id);
        };
      }}
    />
  );
}

const ndc = new Vector3();
const last = new WeakMap<HTMLElement, { x: number; y: number }>();

/**
 * Projects every anchor to the screen and moves its DOM tag (one pass per frame, no allocations).
 * Tags behind the camera or off-screen are hidden.
 */
export function LabelProjector() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const labels = useLabels((s) => s.labels);
  const ids = useMemo(() => Object.keys(labels), [labels]);
  useFrame(() => {
    for (const id of ids) {
      const el = elements.get(id);
      const a = anchors.get(id);
      if (!el || !a) continue;
      // Read the anchor's world position now — this runs after every set has moved its things this frame.
      a.getWorldPosition(ndc).project(camera);
      const on = labels[id]?.visible && ndc.z < 1 && Math.abs(ndc.x) < 1.2 && Math.abs(ndc.y) < 1.2;
      if (!on) {
        if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
        continue;
      }
      const x = ((ndc.x + 1) / 2) * size.width;
      const y = ((1 - ndc.y) / 2) * size.height;
      let l = last.get(el);
      if (!l) {
        l = { x: -1e4, y: -1e4 };
        last.set(el, l);
      }
      // Only touch the DOM when the tag actually moved.
      if (Math.abs(l.x - x) > 0.3 || Math.abs(l.y - y) > 0.3) {
        l.x = x;
        l.y = y;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      }
      if (el.style.visibility !== 'visible') el.style.visibility = 'visible';
    }
  });
  return null;
}
