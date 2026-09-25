import type { AgeBand } from '@/core/types';

/**
 * Difficulty for every mission task, per age band.
 * tiny = very easy, forgiving, big targets, auto-assist from the start;
 * junior = a little challenge; senior = more targets, precision and real numbers.
 */

export type CheckId = 'fuel' | 'spacecraft' | 'weather' | 'clock';

export interface LaunchRules {
  /** Pre-launch checks to tap before LAUNCH unlocks (empty for tiny). */
  readonly checks: readonly CheckId[];
  /** Checks must be done in the listed order. */
  readonly ordered: boolean;
  /** Seconds of holding needed to fill the LAUNCH ring. */
  readonly holdSeconds: number;
  /** Each quick tap adds this much fill (tap alternative to holding). */
  readonly tapFill: number;
  /** Fill lost per second when not pressed (forgiving for little hands). */
  readonly decayPerSecond: number;
  readonly countdownFrom: number;
}

export interface OrbitRules {
  readonly boostsNeeded: number;
  /** Half-width of the perigee zone, radians of true anomaly. */
  readonly zoneHalfAngle: number;
  /** Seconds per loop. */
  readonly period: number;
  /** How much faster the craft moves at perigee than on average (0 = uniform). */
  readonly speedup: number;
  /** Always show "NOW!" when inside the zone. */
  readonly alwaysAssist: boolean;
}

export interface TransferRules {
  readonly waypoints: number;
  readonly numbered: boolean;
}

export interface SeparationRules {
  readonly latches: number;
}

export interface LandingRules {
  /** 'autopilot' = can't crash, the child holds at "gates"; 'manual' = real braking game. */
  readonly mode: 'autopilot' | 'manual';
  readonly startAlt: number;
  /** Initial vertical velocity (m/s, negative = falling). */
  readonly startVel: number;
  /** Moon gravity, m/s². */
  readonly gravity: number;
  /** Engine acceleration while thrusting, m/s². */
  readonly thrust: number;
  /** Touchdown faster than this is a hard (bouncy) landing. */
  readonly safeSpeed: number;
  /** Fuel units, or null for unlimited. */
  readonly fuel: number | null;
  readonly burnPerSecond: number;
  /** Autopilot altitudes where Vikram waits for the child to hold THRUST. */
  readonly gates: readonly number[];
  /** Seconds of holding needed to pass a gate. */
  readonly gateHold: number;
  /** A gate passes by itself after this many seconds (auto-assist). */
  readonly gateAutoAfter: number;
  /** Show altitude / speed / fuel gauges with numbers. */
  readonly gauges: boolean;
}

export interface RoverRules {
  readonly samples: number;
  readonly showSymbols: boolean;
}

export interface NightRules {
  /** Senior hop uses a moving height gauge that must be stopped near 40 cm. */
  readonly hopGauge: boolean;
  /** Gauge window in cm that counts as a good hop. */
  readonly window: readonly [number, number];
  readonly gaugeMax: number;
  readonly gaugePeriod: number;
}

export interface BandRules {
  readonly launch: LaunchRules;
  readonly orbit: OrbitRules;
  readonly transfer: TransferRules;
  readonly separation: SeparationRules;
  readonly landing: LandingRules;
  readonly rover: RoverRules;
  readonly night: NightRules;
}

const DEG = Math.PI / 180;

export const RULES: Readonly<Record<AgeBand, BandRules>> = {
  tiny: {
    launch: { checks: [], ordered: false, holdSeconds: 1.2, tapFill: 0.34, decayPerSecond: 0.05, countdownFrom: 3 },
    orbit: { boostsNeeded: 2, zoneHalfAngle: 75 * DEG, period: 8, speedup: 0.3, alwaysAssist: true },
    transfer: { waypoints: 3, numbered: false },
    separation: { latches: 1 },
    landing: {
      mode: 'autopilot',
      startAlt: 100,
      startVel: -5,
      gravity: 1.62,
      thrust: 4.5,
      safeSpeed: 3,
      fuel: null,
      burnPerSecond: 0,
      gates: [66, 30],
      gateHold: 0.7,
      gateAutoAfter: 7,
      gauges: false,
    },
    rover: { samples: 2, showSymbols: false },
    night: { hopGauge: false, window: [0, 100], gaugeMax: 60, gaugePeriod: 2.6 },
  },
  junior: {
    launch: { checks: ['fuel', 'spacecraft', 'weather'], ordered: false, holdSeconds: 1.5, tapFill: 0.25, decayPerSecond: 0.12, countdownFrom: 5 },
    orbit: { boostsNeeded: 3, zoneHalfAngle: 45 * DEG, period: 7, speedup: 0.5, alwaysAssist: false },
    transfer: { waypoints: 4, numbered: true },
    separation: { latches: 3 },
    landing: {
      mode: 'manual',
      startAlt: 100,
      startVel: -3,
      gravity: 1.62,
      thrust: 4.6,
      safeSpeed: 3.5,
      fuel: null,
      burnPerSecond: 0,
      gates: [],
      gateHold: 0,
      gateAutoAfter: 0,
      gauges: false,
    },
    rover: { samples: 3, showSymbols: false },
    night: { hopGauge: false, window: [0, 100], gaugeMax: 60, gaugePeriod: 2.6 },
  },
  senior: {
    launch: { checks: ['fuel', 'spacecraft', 'weather', 'clock'], ordered: true, holdSeconds: 1.8, tapFill: 0.2, decayPerSecond: 0.25, countdownFrom: 5 },
    orbit: { boostsNeeded: 4, zoneHalfAngle: 30 * DEG, period: 7, speedup: 0.5, alwaysAssist: false },
    transfer: { waypoints: 5, numbered: true },
    separation: { latches: 4 },
    landing: {
      mode: 'manual',
      startAlt: 120,
      startVel: -6,
      gravity: 1.62,
      thrust: 4,
      safeSpeed: 2,
      fuel: 100,
      burnPerSecond: 9,
      gates: [],
      gateHold: 0,
      gateAutoAfter: 0,
      gauges: true,
    },
    rover: { samples: 4, showSymbols: true },
    night: { hopGauge: true, window: [35, 45], gaugeMax: 60, gaugePeriod: 2.6 },
  },
};

export function rulesFor(band: AgeBand): BandRules {
  return RULES[band];
}

/** Misses before the world starts helping (glowing next target, slow-mo, autopilot…). */
export const ASSIST_AFTER_MISSES = 2;
