import type { Object3D } from 'three';
import { create } from 'zustand';

/**
 * Name tags for 3D things, drawn as plain DOM in the world's Overlay (crisp text, no font downloads, and
 * always *under* the HUD). Scene components publish a spec + an anchor object; the scene projects anchors to
 * screen pixels every frame and moves the registered elements directly (no React re-render per frame).
 */
export type LabelVariant = 'done' | 'next' | 'locked' | 'plain';

export interface LabelSpec {
  readonly id: string;
  readonly text: string;
  readonly emoji?: string;
  readonly trailing?: string;
  readonly variant: LabelVariant;
  readonly placement: 'above' | 'below';
  readonly accent?: string;
  readonly small?: boolean;
}

interface LabelStore {
  readonly labels: Readonly<Record<string, LabelSpec>>;
  put(spec: LabelSpec): void;
  remove(id: string): void;
}

export function sameSpec(a: LabelSpec, b: LabelSpec): boolean {
  return (
    a.id === b.id &&
    a.text === b.text &&
    a.emoji === b.emoji &&
    a.trailing === b.trailing &&
    a.variant === b.variant &&
    a.placement === b.placement &&
    a.accent === b.accent &&
    a.small === b.small
  );
}

export const useLabelStore = create<LabelStore>((set) => ({
  labels: {},
  put: (spec) =>
    set((s) => {
      const old = s.labels[spec.id];
      if (old && sameSpec(old, spec)) return s;
      return { labels: { ...s.labels, [spec.id]: spec } };
    }),
  remove: (id) =>
    set((s) => {
      if (!(id in s.labels)) return s;
      const next = { ...s.labels };
      delete next[id];
      return { labels: next };
    }),
}));

/** 3D anchor object per label id (registered by <Pin>). */
export const anchors = new Map<string, Object3D>();
/** DOM element per label id (registered by the overlay). */
export const elements = new Map<string, HTMLElement>();
