import { createContext, useContext } from 'react';
import { Quaternion, Vector3 } from 'three';
import { STOP_IDS, type BodyId, type StageBasis } from './layout';

/**
 * Mutable state shared by the scene's components. Everything here is written in useFrame (never React state),
 * so the per-frame hot path allocates nothing and never re-renders.
 */
export interface Stage extends StageBasis {
  readonly origin: Vector3;
  readonly quat: Quaternion;
  /** Body radius — tasks lay things out in "body radii". */
  unit: number;
  body: BodyId | null;
}

export type BurstFn = (pos: Vector3, color: string, count?: number, speed?: number, size?: number) => void;

export interface SolarState {
  /** Shared `uTime` uniform: every shader reads the same object, so one write per frame animates them all. */
  readonly time: { value: number };
  /** Orbit clock (seconds of map time). Only advances on the map, so a stop never drifts away mid-visit. */
  clock: number;
  readonly positions: Record<BodyId, Vector3>;
  /** Current spin angle of each body (radians). */
  readonly spin: Record<BodyId, number>;
  /** Tasks can ask a body to turn a feature toward the camera and hold still. */
  readonly spinLock: Partial<Record<BodyId, number>>;
  /** World positions of moons / satellites, written by their bodies, read by tasks. */
  readonly moons: Record<string, Vector3>;
  /** Current orbital angle of each moon (radians) — tasks may nudge one into view. */
  readonly moonAngles: Record<string, number>;
  /** Multiplier on moon orbit speed (tasks slow them down for small hands). */
  moonSpeed: number;
  readonly rocket: {
    readonly pos: Vector3;
    readonly quat: Quaternion;
    scale: number;
    /** Squash-and-stretch along the rocket's length (1 = rest). */
    stretch: number;
    home: BodyId;
    flying: boolean;
    /** 0..1 cruise speed (drives speed lines). */
    speed: number;
    readonly throttle: { value: number };
  };
  /** Screen-aligned basis of the current stop's task camera. */
  readonly stage: Stage;
  /** Close-up focus: other planets shrink away (0 = everything visible, 1 = only the focused stop). */
  focus: BodyId | null;
  focusMix: number;
  reducedMotion: boolean;
  /** Uranus tilt shown on screen (degrees). */
  uranusTilt: number;
  /** Venus cloud window 0..1, and where it opens (world direction from Venus's centre). */
  venusReveal: number;
  /** True while the Venus mission holds the window open; otherwise the clouds slowly roll back in. */
  venusHold: boolean;
  readonly venusRevealDir: Vector3;
  burst: BurstFn;
}

function perBody<T>(make: () => T): Record<BodyId, T> {
  return Object.fromEntries(STOP_IDS.map((id) => [id, make()])) as Record<BodyId, T>;
}

export function createSolarState(): SolarState {
  return {
    time: { value: 0 },
    clock: 0,
    positions: perBody(() => new Vector3()),
    spin: perBody(() => 0),
    spinLock: {},
    moons: {},
    moonAngles: {},
    moonSpeed: 1,
    rocket: { pos: new Vector3(), quat: new Quaternion(), scale: 1, stretch: 1, home: 'earth', flying: false, speed: 0, throttle: { value: 0.2 } },
    stage: { origin: new Vector3(), right: new Vector3(1, 0, 0), up: new Vector3(0, 1, 0), fwd: new Vector3(0, 0, 1), quat: new Quaternion(), unit: 1, body: null },
    focus: null,
    focusMix: 0,
    reducedMotion: false,
    uranusTilt: 97.8,
    venusReveal: 0,
    venusHold: false,
    venusRevealDir: new Vector3(0, 0, 1),
    burst: () => undefined,
  };
}

export const SolarContext = createContext<SolarState | null>(null);

export function useSolar(): SolarState {
  const s = useContext(SolarContext);
  if (!s) throw new Error('useSolar must be used inside the Solar System scene');
  return s;
}

/** A moon's world-position slot (created on first use, then reused every frame). */
export function moonSlot(s: SolarState, id: string): Vector3 {
  let v = s.moons[id];
  if (!v) {
    v = new Vector3();
    s.moons[id] = v;
  }
  return v;
}
