import { useCallback, useEffect, useRef } from 'react';
import type { WorldRuntimeProps } from '@/core/types';
import styles from './Overlay.module.css';
import { live } from './store';
import { LabelLayer } from './LabelLayer';
import { BeatDrum } from './tasks/BeatDrum';
import { LabTray } from './tasks/LabTray';
import { RideStatus } from './tasks/RideStatus';
import { RoomPrompt } from './tasks/RoomPrompt';

/**
 * DOM layer above the canvas: the 3D name tags, plus task controls where a button beats a 3D tap
 * (heartbeat drum, Heart Lab tray, round prompts). Controls only appear during the task phase, when the
 * HUD leaves the bottom of the screen free.
 */
export function Overlay({ phase, task, band }: WorldRuntimeProps) {
  const measure = useOverlayMeasure(phase === 'task' ? (task?.kind ?? null) : null);
  return (
    <>
      <LabelLayer />
      <div ref={measure} className={styles.controls}>
      {phase === 'task' && task?.kind === 'beat-rhythm' && <BeatDrum band={band} />}
      {phase === 'task' && task?.kind === 'name-chambers' && <RoomPrompt band={band} />}
      {phase === 'task' && task?.kind === 'take-apart' && <LabTray band={band} />}
      {phase === 'task' && task?.kind === 'blood-ride' && <RideStatus band={band} />}
      </div>
    </>
  );
}

/**
 * Report how much of the screen bottom our task controls cover, so the camera can frame the 3D subject
 * in the space that is really free (the tray grows and shrinks as parts come and go).
 */
function useOverlayMeasure(kind: string | null) {
  const observer = useRef<ResizeObserver | null>(null);
  const node = useRef<HTMLDivElement | null>(null);
  const update = useCallback(() => {
    const el = node.current;
    if (!el || !kind) {
      live.overlayBottom = 0;
      return;
    }
    let top = Infinity;
    for (const child of Array.from(el.children)) {
      const r = child.getBoundingClientRect();
      if (r.height > 0) top = Math.min(top, r.top);
    }
    live.overlayBottom = Number.isFinite(top) ? Math.max(0, window.innerHeight - top) : 0;
  }, [kind]);
  useEffect(() => {
    update();
    const t = setInterval(update, 400);
    return () => {
      clearInterval(t);
      live.overlayBottom = 0;
    };
  }, [update]);
  return useCallback(
    (el: HTMLDivElement | null) => {
      observer.current?.disconnect();
      node.current = el;
      if (el && typeof ResizeObserver !== 'undefined') {
        observer.current = new ResizeObserver(update);
        observer.current.observe(el);
      }
    },
    [update],
  );
}
