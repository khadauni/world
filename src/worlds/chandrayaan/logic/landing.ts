import type { LandingRules } from './bands';

/**
 * Vertical landing physics for Vikram (metres, seconds). Deterministic fixed-step integration,
 * mutated in place so it can run inside useFrame without allocating.
 */
export type LanderStatus = 'flying' | 'gate' | 'soft' | 'hard';

export interface LanderState {
  alt: number;
  vel: number;
  fuel: number;
  time: number;
  status: LanderStatus;
  /** Engine actually firing this step (input, autopilot or assist). */
  firing: boolean;
  /** Index of the next autopilot gate (tiny mode). */
  gate: number;
  /** Seconds of holding accumulated at the current gate. */
  gateHeld: number;
  /** Seconds spent waiting at the current gate. */
  gateWait: number;
  /** Touchdown speed (positive), once landed. */
  touchdownSpeed: number;
}

export interface LanderInput {
  /** The child is holding THRUST. */
  thrust: boolean;
  /** Auto-assist on (after two hard landings): autopilot brakes whenever it's too fast. */
  assist: boolean;
}

export const STEP = 1 / 120;

export function createLander(rules: LandingRules): LanderState {
  return {
    alt: rules.startAlt,
    vel: rules.startVel,
    fuel: rules.fuel ?? Infinity,
    time: 0,
    status: 'flying',
    firing: false,
    gate: 0,
    gateHeld: 0,
    gateWait: 0,
    touchdownSpeed: 0,
  };
}

export function resetLander(s: LanderState, rules: LandingRules): void {
  Object.assign(s, createLander(rules));
}

/** Target descent speed profile the autopilot follows: fast high up, gentle near the ground. */
export function targetDescent(alt: number, safeSpeed: number): number {
  const gentle = Math.min(1.1, safeSpeed * 0.55);
  return -Math.min(9, gentle + 0.12 * Math.max(0, alt));
}

/** Bang-bang autopilot: brake whenever we are falling faster than the profile. */
export function autopilotWants(s: LanderState, rules: LandingRules): boolean {
  return s.vel < targetDescent(s.alt, rules.safeSpeed);
}

function stepOnce(s: LanderState, input: LanderInput, rules: LandingRules, h: number): void {
  if (s.status === 'soft' || s.status === 'hard') return;

  let fire: boolean;
  if (rules.mode === 'autopilot') {
    const gateAlt = rules.gates[s.gate];
    const atGate = gateAlt !== undefined && s.alt <= gateAlt;
    if (atGate) {
      s.status = 'gate';
      s.gateWait += h;
      if (input.thrust) s.gateHeld += h;
      if (s.gateHeld >= rules.gateHold || s.gateWait >= rules.gateAutoAfter) {
        s.gate += 1;
        s.gateHeld = 0;
        s.gateWait = 0;
        s.status = 'flying';
      }
      // Hover: brake towards zero vertical speed while waiting.
      fire = s.vel < 0;
    } else {
      s.status = 'flying';
      fire = autopilotWants(s, rules);
    }
  } else {
    fire = input.thrust || (input.assist && autopilotWants(s, rules));
    if (s.fuel <= 0) fire = false;
  }

  s.firing = fire;
  const acc = -rules.gravity + (fire ? rules.thrust : 0);
  if (fire && Number.isFinite(s.fuel)) s.fuel = Math.max(0, s.fuel - rules.burnPerSecond * h);
  s.vel += acc * h;
  // Engines never push Vikram back up into the sky — they only slow the fall.
  if (s.vel > 0.6) s.vel = 0.6;
  s.alt += s.vel * h;
  s.time += h;

  if (s.alt <= 0) {
    s.alt = 0;
    s.touchdownSpeed = -s.vel;
    s.status = s.touchdownSpeed <= rules.safeSpeed ? 'soft' : 'hard';
    s.vel = 0;
    s.firing = false;
  }
}

/** Advance the lander by dt seconds (fixed sub-steps). Mutates `s`. */
export function stepLander(s: LanderState, input: LanderInput, dt: number, rules: LandingRules): void {
  const steps = Math.min(240, Math.max(1, Math.round(dt / STEP)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) stepOnce(s, input, rules, h);
}

/** 0 → 1 descent progress (for the task progress bar). */
export function descentProgress(s: LanderState, rules: LandingRules): number {
  return Math.min(1, Math.max(0, 1 - s.alt / rules.startAlt));
}

/** Quick simulation helper (tests + tuning): run a policy until landing or timeout. */
export function simulate(
  rules: LandingRules,
  policy: (s: LanderState) => boolean,
  opts: { assist?: boolean; maxSeconds?: number } = {},
): LanderState {
  const s = createLander(rules);
  const max = opts.maxSeconds ?? 300;
  while ((s.status === 'flying' || s.status === 'gate') && s.time < max) {
    stepLander(s, { thrust: policy(s), assist: opts.assist ?? false }, STEP, rules);
  }
  return s;
}
