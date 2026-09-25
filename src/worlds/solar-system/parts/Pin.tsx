import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3, type Camera, type Group } from 'three';
import { anchors, elements, useLabelStore, type LabelSpec } from '../labels';

/**
 * Pins a DOM name tag (rendered by the Overlay) to this point in the 3D scene. Place it inside the group
 * the tag should follow; `offset` is in that group's local units.
 */
export function Pin({ spec, offset = [0, 0, 0] }: { spec: LabelSpec; offset?: [number, number, number] }) {
  const g = useRef<Group>(null);
  const { put, remove } = useLabelStore.getState();
  useEffect(() => {
    put(spec);
  }, [put, spec]);
  useEffect(() => {
    const obj = g.current;
    if (obj) anchors.set(spec.id, obj);
    return () => {
      remove(spec.id);
      if (anchors.get(spec.id) === obj) anchors.delete(spec.id);
    };
  }, [remove, spec.id]);
  return <group ref={g} position={offset} />;
}

const v = new Vector3();

/** What was last written to a tag element, so unchanged tags cost nothing (a re-created element starts fresh). */
interface Applied {
  x: number;
  y: number;
  /** 0 = shown, 1 = off screen / behind, 2 = no anchor. */
  hidden: 0 | 1 | 2;
}
const applied = new WeakMap<HTMLElement, Applied>();

/** Per-frame projection context (module scope so the forEach callback below is created once, not per frame). */
const ctx: { camera: Camera | null; width: number; height: number } = { camera: null, width: 1, height: 1 };

function project(el: HTMLElement, id: string) {
  let a = applied.get(el);
  if (!a) {
    a = { x: Number.NaN, y: Number.NaN, hidden: 2 };
    applied.set(el, a);
  }
  const obj = anchors.get(id);
  const camera = ctx.camera;
  if (!obj || !camera) {
    if (a.hidden !== 2) el.style.visibility = 'hidden';
    a.hidden = 2;
    return;
  }
  obj.getWorldPosition(v).project(camera);
  const x = Math.round(((v.x + 1) / 2) * ctx.width);
  const y = Math.round(((1 - v.y) / 2) * ctx.height);
  const off = v.z > 1 || v.z < -1 || x < -200 || x > ctx.width + 200 || y < -120 || y > ctx.height + 120;
  if (off) {
    if (a.hidden !== 1) el.style.visibility = 'hidden';
    a.hidden = 1;
    return;
  }
  if (a.hidden !== 0) el.style.visibility = 'visible';
  a.hidden = 0;
  if (x === a.x && y === a.y) return;
  a.x = x;
  a.y = y;
  el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

/**
 * Projects every pinned anchor to screen pixels once per frame (after the camera director has moved the
 * camera) and moves its DOM tag. Uses the lens-shifted projection, so tags line up with what you see.
 * Allocation-free unless a tag actually moves.
 */
export function LabelProjector() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    ctx.camera = camera;
    ctx.width = size.width;
    ctx.height = size.height;
    elements.forEach(project);
  });
  return null;
}
