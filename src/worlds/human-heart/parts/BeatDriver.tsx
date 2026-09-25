import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import type { SfxName } from '@/core/types';
import { beat } from '../store';

/**
 * Advances the shared heartbeat for the set on screen. `bpm` can change live (a ref), and `onLub/onDub`
 * fire exactly on the valve sounds — the heartbeat stop plays its "lub-dub" through them.
 */
export function BeatDriver({
  bpm,
  paused,
  sfx,
  onLub,
  onDub,
  startPhase = 0.5,
}: {
  bpm: RefObject<number>;
  paused?: RefObject<boolean>;
  sfx?: (name: SfxName) => void;
  onLub?: () => void;
  onDub?: () => void;
  startPhase?: number;
}) {
  const cb = useRef({ onLub, onDub, sfx });
  cb.current = { onLub, onDub, sfx };
  useEffect(() => {
    beat.reset(startPhase);
  }, [startPhase]);
  useFrame((_, dt) => {
    if (paused?.current) {
      beat.rest(dt);
      return;
    }
    beat.step(dt, bpm.current ?? 70);
    if (beat.lub) {
      cb.current.onLub?.();
      cb.current.sfx?.('beat');
    }
    if (beat.dub) cb.current.onDub?.();
  });
  return null;
}
