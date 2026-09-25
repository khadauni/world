import type { Object3D } from 'three';
import { create } from 'zustand';

/**
 * Name tags for 3D things, drawn as crisp DOM (no font downloads) in the Overlay. The scene registers
 * specs (rarely changes) and anchor objects; once per frame, after everything has moved, the projector
 * places the DOM nodes directly — no React renders per frame.
 */
export interface LabelSpec {
  readonly id: string;
  readonly text: string;
  readonly accent?: string;
  readonly emoji?: string;
  /** Where the tag sits relative to its anchor ('left'/'right': beside it, vertically centred). */
  readonly placement?: 'above' | 'below' | 'left' | 'right';
  readonly visible: boolean;
}

interface LabelStore {
  labels: Record<string, LabelSpec>;
  upsert: (spec: LabelSpec) => void;
  remove: (id: string) => void;
}

export const useLabels = create<LabelStore>((set, get) => ({
  labels: {},
  upsert: (spec) => {
    const cur = get().labels[spec.id];
    if (cur && cur.text === spec.text && cur.accent === spec.accent && cur.visible === spec.visible && cur.emoji === spec.emoji && cur.placement === spec.placement) return;
    set({ labels: { ...get().labels, [spec.id]: spec } });
  },
  remove: (id) => {
    if (!get().labels[id]) return;
    const next = { ...get().labels };
    delete next[id];
    set({ labels: next });
  },
}));

/** The 3D object each label is pinned to (registered by <Tag>; the projector reads its world position). */
export const anchors = new Map<string, Object3D>();
/** DOM node per label (registered by the LabelLayer). */
export const elements = new Map<string, HTMLElement>();
