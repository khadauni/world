import { useFrame } from '@react-three/fiber';
import type { FlowPhase } from '@/core/types';
import { STOP_IDS, bodyPosition, type BodyId } from '../layout';
import { useSolar } from '../state';

/**
 * Advances the shared shader clock and the orbit clock, then writes every body's world position.
 * Planets only orbit while the map is showing, so the stop being visited never slides out of frame.
 */
export function SystemClock({ phase, reducedMotion }: { phase: FlowPhase; reducedMotion: boolean }) {
  const sys = useSolar();
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    sys.time.value += dt * (reducedMotion ? 0.35 : 1);
    if (phase === 'map' || phase === 'intro' || phase === 'finale') sys.clock += dt * (reducedMotion ? 0.25 : 1);
    for (let i = 0; i < STOP_IDS.length; i++) {
      const id = STOP_IDS[i] as BodyId;
      bodyPosition(id, sys.clock, sys.positions[id]);
    }
  }, -3);
  return null;
}
