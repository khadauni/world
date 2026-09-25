import type { Tiered } from '@/core/types';
import type { CheckId, LaunchRules } from './bands';

export interface LaunchCheck {
  readonly id: CheckId;
  readonly emoji: string;
  readonly label: Tiered<string>;
  /** Said when this check turns green. */
  readonly done: Tiered<string>;
}

/** Pre-launch checks, listed in the correct order (fuel → spacecraft → weather → countdown clock). */
export const LAUNCH_CHECKS: readonly LaunchCheck[] = [
  {
    id: 'fuel',
    emoji: '⛽',
    label: { tiny: 'Fuel', junior: 'Fill fuel', senior: 'Load propellant' },
    done: { tiny: 'Fuel full!', junior: 'Fuel tanks full!', senior: 'Propellant loaded — the cryogenic stage is venting cold vapour.' },
  },
  {
    id: 'spacecraft',
    emoji: '🛰️',
    label: { tiny: 'Ship', junior: 'Check ship', senior: 'Spacecraft check' },
    done: { tiny: 'Ship ready!', junior: 'Chandrayaan-3 is ready!', senior: 'Chandrayaan-3 reports all systems healthy.' },
  },
  {
    id: 'weather',
    emoji: '🌤️',
    label: { tiny: 'Sky', junior: 'Check weather', senior: 'Weather GO' },
    done: { tiny: 'Sunny sky!', junior: 'The weather is clear!', senior: 'Winds and clouds are within limits — weather is GO.' },
  },
  {
    id: 'clock',
    emoji: '⏱️',
    label: { tiny: 'Clock', junior: 'Start clock', senior: 'Start auto-sequence' },
    done: { tiny: 'Clock on!', junior: 'Countdown clock started!', senior: 'Automatic launch sequence running — computers take over.' },
  },
];

export function checksFor(rules: LaunchRules): LaunchCheck[] {
  return rules.checks.map((id) => LAUNCH_CHECKS.find((c) => c.id === id) as LaunchCheck);
}

/**
 * The order the cards are shown in. When the order matters (seniors) the cards are mixed up, so the child has
 * to know the sequence (fuel → spacecraft → weather → clock) rather than read it off the screen.
 */
export function displayOrder(checks: readonly LaunchCheck[], ordered: boolean): LaunchCheck[] {
  if (!ordered || checks.length < 3) return [...checks];
  const mixed = [2, 0, 3, 1].filter((i) => i < checks.length).map((i) => checks[i] as LaunchCheck);
  return mixed.length === checks.length ? mixed : [...checks];
}

/**
 * LAUNCH hold ring: fills while pressed, drains slowly when released. Quick taps also add fill,
 * so a child who can't press-and-hold can still launch.
 */
export function stepHold(value: number, holding: boolean, dt: number, rules: LaunchRules): number {
  const v = holding ? value + dt / rules.holdSeconds : value - dt * rules.decayPerSecond;
  return Math.min(1, Math.max(0, v));
}

export function tapHold(value: number, rules: LaunchRules): number {
  return Math.min(1, value + rules.tapFill);
}

/** Rocket height (scene units) t seconds after liftoff: gentle start, then accelerating. */
export function liftoffHeight(t: number): number {
  if (t <= 0) return 0;
  return 0.8 * t * t + 0.3 * t;
}
