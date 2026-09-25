import type { AgeBand } from '@/core/types';

/**
 * How much of the flying the child does.
 * - `auto`   (tiny, 3–5): the ship steers itself along the racing line; only BOOST matters.
 * - `assist` (junior, 6–8): the child steers, and a gentle hand pulls the ship back toward the line.
 * - `pilot`  (senior, 9–12): full steering, tighter rings, more obstacles, and a brake.
 */
export type FlightMode = 'auto' | 'assist' | 'pilot';

/**
 * Course space: every gameplay object lives at a distance `s` along the path and an offset (`x` right, `y` up)
 * inside the flight tube. Keeping gameplay in course space makes the physics trivial, deterministic and
 * impossible to get lost in — the path itself can bend however a world likes.
 */
export interface CoursePoint {
  /** Distance along the path, world units. */
  readonly s: number;
  /** Offset to the right of the path, world units. */
  readonly x: number;
  /** Offset above the path, world units. */
  readonly y: number;
}

/** A fly-through ring gate. */
export interface RingGate extends CoursePoint {
  readonly index: number;
  /** Inner radius (world units). */
  readonly radius: number;
  /** Rings come in chains; `chain` numbers them so worlds can theme a chain. */
  readonly chain: number;
}

/** Something to scoop up (stardust, oxygen bubbles, fuel cells…). */
export interface Collectible extends CoursePoint {
  readonly index: number;
}

/** Lateral wobble of a drifting obstacle: offset = dir(angle) · amp · sin(time · freq + phase). */
export interface Drift {
  readonly amp: number;
  readonly freq: number;
  readonly phase: number;
  /** Direction of travel in the tube cross-section, radians (0 = right, π/2 = up). */
  readonly angle: number;
}

/** A soft obstacle (asteroid, blood clot, space junk). Bumping one pushes the ship aside — never a crash. */
export interface Obstacle extends CoursePoint {
  readonly index: number;
  readonly radius: number;
  /** Unit spin axis (object space) — visual only. */
  readonly spinAxis: readonly [number, number, number];
  /** Spin speed, rad/s — visual only. */
  readonly spinSpeed: number;
  readonly drift: Drift;
  /** 0–1 shape/colour variation seed for visuals. */
  readonly seed: number;
}

/** Decorative scenery outside the tube (big tumbling rocks) — never collides, just sells speed and scale. */
export interface Scenery extends CoursePoint {
  readonly radius: number;
  readonly spinAxis: readonly [number, number, number];
  readonly spinSpeed: number;
  readonly seed: number;
}

/** Per-band gameplay tuning. Distances are in tube radii unless noted. */
export interface FlightTuning {
  readonly mode: FlightMode;
  /** Target run time at cruise speed, seconds (boosting makes it shorter). */
  readonly runSeconds: number;
  /** Boost speed ÷ cruise speed. */
  readonly boostMultiplier: number;
  /** Brake speed ÷ cruise speed; 0 = no brake. */
  readonly brakeMultiplier: number;
  /** Max lateral steering speed, tube radii per second. */
  readonly steerSpeed: number;
  /** How quickly lateral velocity follows the stick, 1/s. */
  readonly steerResponse: number;
  /** 0–1: how strongly the ship drifts back to the racing line when the stick is idle. */
  readonly assist: number;
  /** Collectibles within this distance get pulled in. */
  readonly magnetRadius: number;
  /** Ring gate inner radius. */
  readonly ringRadius: number;
  /** Extra forgiveness when judging a ring pass. */
  readonly ringTolerance: number;
  /** Rings per chain. */
  readonly chainLength: number;
  /** How far ring centres may sit from the path centre. */
  readonly ringOffset: number;
  /** Number of obstacles on the course. */
  readonly obstacleCount: number;
  readonly obstacleRadius: readonly [number, number];
  /** Fraction of obstacles that drift across the tube. */
  readonly driftShare: number;
  /** Approximate number of collectibles. */
  readonly collectibleCount: number;
  /** Boost energy used per second while boosting (energy is 0–1). */
  readonly energyDrain: number;
  /** Boost energy regained per second while not boosting. */
  readonly energyRecharge: number;
  /** Speed multiplier right after a bump (recovers within a second). */
  readonly bumpSlow: number;
}

export interface Course {
  readonly seed: number;
  readonly band: AgeBand;
  readonly mode: FlightMode;
  readonly tuning: FlightTuning;
  /** Arc length of the path, world units. */
  readonly length: number;
  /** Radius of the flyable tube around the path, world units. */
  readonly tubeRadius: number;
  /** Collision radius of the ship, world units. */
  readonly shipRadius: number;
  /** Speeds in world units per second. */
  readonly cruiseSpeed: number;
  readonly boostSpeed: number;
  readonly brakeSpeed: number;
  readonly path: CoursePath;
  /** Sorted by `s`. */
  readonly rings: readonly RingGate[];
  /** Sorted by `s`. */
  readonly collectibles: readonly Collectible[];
  /** Sorted by `s`. */
  readonly obstacles: readonly Obstacle[];
  readonly scenery: readonly Scenery[];
  /** The racing line autopilot follows: flat [s, x, y, s, x, y, …], sorted by s. */
  readonly line: Float32Array;
}

/** Arc-length sampled path with an upright, twist-free frame at each sample. */
export interface CoursePath {
  readonly length: number;
  readonly count: number;
  /** xyz per sample. */
  readonly positions: Float32Array;
  readonly tangents: Float32Array;
  readonly ups: Float32Array;
  readonly rights: Float32Array;
}

export type FlightEventType = 'go' | 'ring' | 'ringMiss' | 'collect' | 'bump' | 'nearMiss' | 'boostStart' | 'boostEnd' | 'arrive';

/**
 * One gameplay event. Events come from a fixed pool (no garbage while flying): read the fields inside your
 * callback and copy what you need — the object is reused on the next frame.
 */
export interface FlightEvent {
  type: FlightEventType;
  /** Ring / collectible / obstacle index, or -1. */
  index: number;
  /** Current ring combo (ring events), otherwise the running total where it makes sense. */
  combo: number;
  /** ring: 1 when dead-centre ("perfect"); collect: total collected; bump: strength 0–1. */
  value: number;
}

/** Resolved pilot input for one frame. x/y lie inside the unit circle (x right, y up). */
export interface ControlState {
  x: number;
  y: number;
  boost: boolean;
  brake: boolean;
}
