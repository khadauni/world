import type { AgeBand } from '@/core/types';
import type { FlightMode, FlightTuning } from './types';

/**
 * Gameplay tuning per age band. The same course generator and physics serve a 3-year-old (the ship flies
 * itself; the only button is BOOST) and a 12-year-old (full steering through tight slaloms and drifting rocks).
 * Distances are in tube radii so a course scales to any world size.
 */
export const FLIGHT_TUNING: Readonly<Record<AgeBand, FlightTuning>> = {
  tiny: {
    mode: 'auto',
    runSeconds: 21,
    boostMultiplier: 1.8,
    brakeMultiplier: 0,
    steerSpeed: 1.2,
    steerResponse: 3.5,
    assist: 1,
    magnetRadius: 0.8,
    ringRadius: 0.5,
    ringTolerance: 0.3,
    chainLength: 3,
    ringOffset: 0.22,
    obstacleCount: 2,
    obstacleRadius: [0.12, 0.17],
    driftShare: 0,
    collectibleCount: 24,
    energyDrain: 0.2,
    energyRecharge: 0.42,
    bumpSlow: 0.88,
  },
  junior: {
    mode: 'assist',
    runSeconds: 32,
    boostMultiplier: 1.7,
    brakeMultiplier: 0,
    steerSpeed: 1.15,
    steerResponse: 5,
    assist: 0.5,
    magnetRadius: 0.48,
    ringRadius: 0.36,
    ringTolerance: 0.12,
    chainLength: 4,
    ringOffset: 0.5,
    obstacleCount: 12,
    obstacleRadius: [0.12, 0.24],
    driftShare: 0.25,
    collectibleCount: 30,
    energyDrain: 0.3,
    energyRecharge: 0.26,
    bumpSlow: 0.76,
  },
  senior: {
    mode: 'pilot',
    runSeconds: 38,
    boostMultiplier: 1.75,
    brakeMultiplier: 0.55,
    steerSpeed: 1.4,
    steerResponse: 7,
    assist: 0,
    magnetRadius: 0.3,
    ringRadius: 0.28,
    ringTolerance: 0.05,
    chainLength: 5,
    ringOffset: 0.72,
    obstacleCount: 26,
    obstacleRadius: [0.1, 0.3],
    driftShare: 0.4,
    collectibleCount: 36,
    energyDrain: 0.36,
    energyRecharge: 0.22,
    bumpSlow: 0.68,
  },
};

/** The default flight mode for an age band. */
export function modeForBand(band: AgeBand): FlightMode {
  return FLIGHT_TUNING[band].mode;
}
