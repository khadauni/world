import type { WorldRuntimeProps } from '@/core/types';
import { BoostControls } from './tasks/BoostControls';
import { HopControls } from './tasks/HopControls';
import { LaunchControls } from './tasks/LaunchControls';
import { ThrustControls } from './tasks/ThrustControls';

/**
 * DOM controls for the tasks that need a button (hold LAUNCH, BOOST, THRUST, HOP). Tasks that are pure
 * 3D taps (waypoints, latches, rock samples) need nothing here. Only shown during the task phase, when the
 * HUD leaves the bottom of the screen free.
 */
export function Overlay({ phase, task, band }: WorldRuntimeProps) {
  if (phase !== 'task' || !task) return null;
  switch (task.kind) {
    case 'launch-countdown':
      return <LaunchControls band={band} />;
    case 'orbit-boost':
      return <BoostControls band={band} />;
    case 'land-vikram':
      return <ThrustControls band={band} />;
    case 'hop-and-sleep':
      return <HopControls band={band} />;
    default:
      return null;
  }
}
