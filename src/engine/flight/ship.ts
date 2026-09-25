import { obstacleOffset } from './course';
import { pushEvent, type FlightEventQueue } from './events';
import { lineAt, type LineSample } from './line';
import type { ControlState, Course } from './types';

export type ShipPhase = 'countdown' | 'flying' | 'arrived';

/**
 * Everything about the ship in one mutable object (course space). The physics step mutates it in place; visuals,
 * cameras, audio and world FX read it every frame (`session.ship`). Never replace it — mutate.
 */
export interface ShipState {
  phase: ShipPhase;
  /** True once the 'go' event has fired. */
  started: boolean;
  /** Seconds left in the countdown. */
  countdown: number;
  /** Flight clock in seconds (drives drifting obstacles; visuals share it). */
  time: number;
  /** Distance along the path. */
  s: number;
  /** Lateral offset inside the tube (right / up). */
  x: number;
  y: number;
  /** Lateral velocity. */
  vx: number;
  vy: number;
  /** Forward speed, world units / s. */
  speed: number;
  /** Speed normalised to boost speed, 0–1 — the value to drive FX (streaks, FOV, engine pitch) with. */
  speed01: number;
  /** Smoothed 0–1 boost intensity (eases in/out) for visuals. */
  boost01: number;
  /** Boost energy 0–1. */
  energy: number;
  boosting: boolean;
  braking: boolean;
  /** Visual attitude, radians: roll (positive = rolling right), pitch (positive = nose up), yaw (positive = nose right). */
  bank: number;
  pitch: number;
  yaw: number;
  /** 0–1 impact kick that decays quickly (camera shake, chromatic pulse). */
  shake: number;
  /** 0–1 flash that pops on each collect and decays (ship glow, HUD pulse). */
  collectFlash: number;
  combo: number;
  bestCombo: number;
  ringsPassed: number;
  ringsMissed: number;
  collected: number;
  bumps: number;
  nearMisses: number;
  /** 0–1 along the course. */
  progress: number;
  arrived: boolean;
  /** Whether the last step flew itself. */
  autopilot: boolean;
  slowTimer: number;
  nextRing: number;
  nextCollect: number;
  nextObstacle: number;
  /** Per ring: 0 ahead, 1 passed, 2 missed. */
  readonly ringState: Uint8Array;
  /** Per ring: flight time it was passed/missed (−1 = not yet). */
  readonly ringTime: Float32Array;
  /** Per collectible: 0 waiting, 1 being pulled by the magnet, 2 collected, 3 missed. */
  readonly collectState: Uint8Array;
  /** Per collectible: magnet pull progress 0–1. */
  readonly collectPull: Float32Array;
  /** Per obstacle: flight time of the last bump (−1000 = never). */
  readonly obstacleHit: Float32Array;
  /** Per obstacle: 1 once it has been passed (near-miss judged). */
  readonly obstaclePassed: Uint8Array;
  /** Bumped whenever the matching per-item arrays change, so visuals re-upload only then. */
  readonly versions: { rings: number; collect: number; obstacles: number };
}

export interface StepOptions {
  /** Fly itself (tiny band, the shell's autopilot, reduced motion). Input still controls BOOST. */
  readonly autopilot?: boolean;
  /** Warp to the finish (autopilot at double boost, no energy cost) — e.g. after the child asks to skip. */
  readonly hyperdrive?: boolean;
}

/** Largest time step the physics accepts (bigger frames are clamped — a hitch never teleports the ship). */
export const MAX_STEP = 0.05;
const NEVER = -1000;
const BUMP_COOLDOWN = 0.6;
const PULL_RATE = 4.5;

export function createShipState(course: Course, countdown = 0): ShipState {
  const nr = course.rings.length;
  const nc = course.collectibles.length;
  const no = course.obstacles.length;
  return {
    phase: countdown > 0 ? 'countdown' : 'flying',
    started: false,
    countdown: Math.max(0, countdown),
    time: 0,
    s: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    speed01: 0,
    boost01: 0,
    energy: 1,
    boosting: false,
    braking: false,
    bank: 0,
    pitch: 0,
    yaw: 0,
    shake: 0,
    collectFlash: 0,
    combo: 0,
    bestCombo: 0,
    ringsPassed: 0,
    ringsMissed: 0,
    collected: 0,
    bumps: 0,
    nearMisses: 0,
    progress: 0,
    arrived: false,
    autopilot: false,
    slowTimer: 0,
    nextRing: 0,
    nextCollect: 0,
    nextObstacle: 0,
    ringState: new Uint8Array(nr),
    ringTime: new Float32Array(nr).fill(-1),
    collectState: new Uint8Array(nc),
    collectPull: new Float32Array(nc),
    obstacleHit: new Float32Array(no).fill(NEVER),
    obstaclePassed: new Uint8Array(no),
    versions: { rings: 0, collect: 0, obstacles: 0 },
  };
}

const ls: LineSample = { x: 0, y: 0 };
const off = { x: 0, y: 0 };

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function smooth01(v: number): number {
  const t = clamp(v, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Length of the final approach where the ship lines up and eases off for a gentle arrival. */
export function approachLength(course: Course): number {
  return Math.min(course.length * 0.06, course.cruiseSpeed * 1.6);
}

/**
 * Where the ship wants to be laterally: the racing line a short way ahead (so it arrives at ring centres on time),
 * nudged around any obstacle sitting on it, blended to the centre on final approach. Writes into `out`.
 */
export function autopilotTarget(state: ShipState, course: Course, out: LineSample): LineSample {
  const lead = Math.max(2, state.speed * 0.22);
  lineAt(course.line, state.s + lead, out);
  // Dodge anything (e.g. a drifting rock) that has wandered onto the line just ahead.
  const obs = course.obstacles;
  const reach = state.s + Math.max(8, state.speed * 1.1);
  for (let i = state.nextObstacle; i < obs.length; i++) {
    const o = obs[i];
    if (!o) break;
    if (o.s > reach) break;
    if (o.s + o.radius < state.s) continue;
    obstacleOffset(o, state.time + (o.s - state.s) / Math.max(1, state.speed), off);
    const need = o.radius + course.shipRadius + course.tubeRadius * 0.08;
    const dx = out.x - off.x;
    const dy = out.y - off.y;
    const d = Math.hypot(dx, dy);
    if (d < need) {
      const nx = d > 1e-4 ? dx / d : off.x > 0 ? -1 : 1;
      const ny = d > 1e-4 ? dy / d : 0;
      out.x = off.x + nx * need;
      out.y = off.y + ny * need;
    }
  }
  const app = approachLength(course);
  const a = smooth01((state.s - (course.length - app)) / app);
  out.x *= 1 - a;
  out.y *= 1 - a;
  return out;
}

function integrate(state: ShipState, course: Course, c: ControlState, h: number, events: FlightEventQueue, auto: boolean, hyper: boolean): void {
  const t = course.tuning;
  const R = course.tubeRadius;
  const shipR = course.shipRadius;
  const steer = t.steerSpeed * R;
  const L = course.length;
  const app = approachLength(course);
  const approach = smooth01((state.s - (L - app)) / app);

  // --- steering ----------------------------------------------------------------------------------------------
  let tvx: number;
  let tvy: number;
  let response = t.steerResponse;
  if (auto) {
    autopilotTarget(state, course, ls);
    const gain = 4.2;
    tvx = clamp((ls.x - state.x) * gain, -steer * 1.6, steer * 1.6);
    tvy = clamp((ls.y - state.y) * gain, -steer * 1.6, steer * 1.6);
    response = 7;
  } else {
    tvx = c.x * steer;
    tvy = c.y * steer;
    if (t.assist > 0) {
      const idle = 1 - Math.min(1, Math.hypot(c.x, c.y));
      const pull = t.assist * (0.25 + 0.75 * idle);
      autopilotTarget(state, course, ls);
      tvx += clamp((ls.x - state.x) * 2.4, -steer, steer) * pull;
      tvy += clamp((ls.y - state.y) * 2.4, -steer, steer) * pull;
    }
    if (approach > 0) {
      tvx += (-state.x * 2.5 - tvx) * approach;
      tvy += (-state.y * 2.5 - tvy) * approach;
    }
  }
  const k = 1 - Math.exp(-h * response);
  state.vx += (tvx - state.vx) * k;
  state.vy += (tvy - state.vy) * k;
  state.x += state.vx * h;
  state.y += state.vy * h;

  // --- the tube is a soft wall: slide along it, never out ------------------------------------------------------
  const maxR = R - shipR;
  const d = Math.hypot(state.x, state.y);
  if (d > maxR) {
    const nx = state.x / d;
    const ny = state.y / d;
    state.x = nx * maxR;
    state.y = ny * maxR;
    const vn = state.vx * nx + state.vy * ny;
    if (vn > 0) {
      state.vx -= vn * nx * 1.5;
      state.vy -= vn * ny * 1.5;
    }
  }

  // --- speed, boost, brake -----------------------------------------------------------------------------------
  const inApproach = state.s > L - app;
  const wantBoost = (c.boost || hyper) && !inApproach;
  if (!state.boosting && wantBoost && (state.energy >= 0.12 || hyper)) {
    state.boosting = true;
    pushEvent(events, 'boostStart');
  } else if (state.boosting && (!wantBoost || (state.energy <= 0 && !hyper))) {
    state.boosting = false;
    pushEvent(events, 'boostEnd');
  }
  if (state.boosting && !hyper) state.energy = Math.max(0, state.energy - t.energyDrain * h);
  else if (!state.boosting) state.energy = Math.min(1, state.energy + t.energyRecharge * h);
  state.braking = c.brake && t.brakeMultiplier > 0 && !auto && !state.boosting;
  let target = state.boosting ? course.boostSpeed * (hyper ? 2 : 1) : state.braking ? course.brakeSpeed : course.cruiseSpeed;
  if (state.slowTimer > 0) {
    target *= 1 - (1 - t.bumpSlow) * clamp(state.slowTimer / 0.7, 0, 1);
    state.slowTimer = Math.max(0, state.slowTimer - h);
  }
  if (inApproach) target = Math.min(target, course.cruiseSpeed * (0.45 + 0.55 * smooth01((L - state.s) / app)));
  const accel = target > state.speed ? (state.boosting ? 3.6 : 1.7) : 2.4;
  state.speed += (target - state.speed) * (1 - Math.exp(-h * accel));
  state.s += state.speed * h;

  // --- ring gates ----------------------------------------------------------------------------------------------
  const rings = course.rings;
  while (state.nextRing < rings.length) {
    const r = rings[state.nextRing];
    if (!r || r.s > state.s) break;
    const dist = Math.hypot(state.x - r.x, state.y - r.y);
    const i = state.nextRing;
    state.ringTime[i] = state.time;
    if (dist <= r.radius + t.ringTolerance * R) {
      state.ringState[i] = 1;
      state.combo++;
      state.ringsPassed++;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.energy = Math.min(1, state.energy + 0.12);
      pushEvent(events, 'ring', i, state.combo, dist < r.radius * 0.35 ? 1 : 0);
    } else {
      state.ringState[i] = 2;
      state.combo = 0;
      state.ringsMissed++;
      pushEvent(events, 'ringMiss', i, 0, 0);
    }
    state.versions.rings++;
    state.nextRing++;
  }

  // --- collectibles + magnet -----------------------------------------------------------------------------------
  const col = course.collectibles;
  const magnet = Math.max(shipR + 0.5, t.magnetRadius * R);
  for (let i = state.nextCollect; i < col.length; i++) {
    const cc = col[i];
    if (!cc || cc.s > state.s + magnet) break;
    const st = state.collectState[i] ?? 0;
    if (st >= 2) continue;
    if (st === 0) {
      const ds = cc.s - state.s;
      if (ds < -magnet) {
        state.collectState[i] = 3;
        state.versions.collect++;
        continue;
      }
      if (Math.hypot(ds, cc.x - state.x, cc.y - state.y) < magnet) {
        state.collectState[i] = 1;
        state.collectPull[i] = 0;
        state.versions.collect++;
      } else continue;
    }
    const p = (state.collectPull[i] ?? 0) + h * PULL_RATE;
    state.collectPull[i] = Math.min(1, p);
    if (p >= 1) {
      state.collectState[i] = 2;
      state.collected++;
      state.collectFlash = 1;
      state.energy = Math.min(1, state.energy + 0.02);
      pushEvent(events, 'collect', i, state.combo, state.collected);
    }
    state.versions.collect++;
  }
  while (state.nextCollect < col.length && (state.collectState[state.nextCollect] ?? 0) >= 2) state.nextCollect++;

  // --- obstacles: bump (push aside + slow), near misses ---------------------------------------------------------
  const obs = course.obstacles;
  const nearMargin = R * 0.14;
  for (let i = state.nextObstacle; i < obs.length; i++) {
    const o = obs[i];
    if (!o || o.s - o.radius - shipR > state.s) break;
    obstacleOffset(o, state.time, off);
    const dx = state.x - off.x;
    const dy = state.y - off.y;
    const lat = Math.hypot(dx, dy);
    if (o.s + o.radius + shipR < state.s) {
      if (!state.obstaclePassed[i]) {
        state.obstaclePassed[i] = 1;
        const hitRecently = state.time - (state.obstacleHit[i] ?? NEVER) < 2;
        if (!hitRecently && lat < o.radius + shipR + nearMargin) {
          state.nearMisses++;
          pushEvent(events, 'nearMiss', i, state.combo, 0);
        }
      }
      if (i === state.nextObstacle) state.nextObstacle++;
      continue;
    }
    const ds = state.s - o.s;
    const minD = o.radius + shipR;
    if (ds * ds + lat * lat >= minD * minD) continue;
    if (state.time - (state.obstacleHit[i] ?? NEVER) < BUMP_COOLDOWN) continue;
    const nx = lat > 1e-4 ? dx / lat : off.x > 0 ? -1 : 1;
    const ny = lat > 1e-4 ? dy / lat : 0;
    const need = Math.sqrt(Math.max(0, (minD + 0.05) * (minD + 0.05) - ds * ds));
    if (lat < need) {
      state.x = off.x + nx * need;
      state.y = off.y + ny * need;
    }
    const strength = clamp(state.speed / course.boostSpeed, 0.25, 1);
    state.vx += nx * R * 1.2 * strength;
    state.vy += ny * R * 1.2 * strength;
    state.speed *= 0.82;
    state.slowTimer = 0.7;
    state.shake = Math.min(1, state.shake + 0.55 + 0.45 * strength);
    state.obstacleHit[i] = state.time;
    state.bumps++;
    if (course.mode === 'pilot') state.combo = 0;
    state.versions.obstacles++;
    pushEvent(events, 'bump', i, state.combo, strength);
  }

  // --- arrival -------------------------------------------------------------------------------------------------
  if (state.s >= L) {
    state.s = L;
    state.phase = 'arrived';
    state.arrived = true;
    if (state.boosting) {
      state.boosting = false;
      pushEvent(events, 'boostEnd');
    }
    pushEvent(events, 'arrive', -1, state.combo, state.collected);
  }
}

/**
 * Advance the flight by `dt` seconds. Pure and allocation-free: mutates `state`, appends to `events`.
 * The ship always moves forward along the course; input only changes its offset inside the tube and its speed,
 * so a child can never get lost or fail — at worst they bump a rock and wobble aside.
 */
export function stepFlight(state: ShipState, course: Course, controls: ControlState, dt: number, events: FlightEventQueue, opts: StepOptions = {}): void {
  const step = Math.min(MAX_STEP, Math.max(0, dt));
  if (step === 0) return;
  const auto = !!opts.autopilot || !!opts.hyperdrive || course.mode === 'auto';
  state.autopilot = auto;

  if (state.phase === 'countdown') {
    state.countdown -= step;
    if (state.countdown <= 0) {
      state.countdown = 0;
      state.phase = 'flying';
    }
  } else if (state.phase === 'flying') {
    if (!state.started) {
      state.started = true;
      pushEvent(events, 'go');
    }
    state.time += step;
    const n = clamp(Math.ceil((state.speed * step) / (course.shipRadius * 1.2)), 1, 8);
    const h = step / n;
    for (let i = 0; i < n && state.phase === 'flying'; i++) integrate(state, course, controls, h, events, auto, !!opts.hyperdrive);
  } else {
    // Arrived: coast to a stop and level out.
    state.time += step;
    state.speed *= Math.exp(-step * 3);
    state.vx *= Math.exp(-step * 4);
    state.vy *= Math.exp(-step * 4);
  }

  // --- visual attitude + meters (per frame) --------------------------------------------------------------------
  const steer = Math.max(1e-3, course.tuning.steerSpeed * course.tubeRadius);
  const f = 1 - Math.exp(-step * 6);
  state.bank += (clamp((state.vx / steer) * 0.75, -0.9, 0.9) - state.bank) * f;
  state.pitch += (clamp((state.vy / steer) * 0.35, -0.45, 0.45) - state.pitch) * f;
  state.yaw += (clamp(Math.atan2(state.vx, Math.max(4, state.speed)), -0.35, 0.35) - state.yaw) * f;
  state.boost01 += ((state.boosting ? 1 : 0) - state.boost01) * (1 - Math.exp(-step * (state.boosting ? 5 : 2.2)));
  state.speed01 = clamp(state.speed / course.boostSpeed, 0, 1);
  state.shake *= Math.exp(-step * 4.5);
  state.collectFlash *= Math.exp(-step * 5);
  state.progress = clamp(state.s / course.length, 0, 1);
}

/**
 * Jump the ship to distance `s` (e.g. resume a run, lab tools, tests). Gates and pickups behind the new position
 * are skipped (neither passed nor missed); the lateral offset defaults to the racing line.
 */
export function seekFlight(state: ShipState, course: Course, s: number, x?: number, y?: number): void {
  state.s = clamp(s, 0, course.length);
  lineAt(course.line, state.s, ls);
  state.x = x ?? ls.x;
  state.y = y ?? ls.y;
  state.vx = 0;
  state.vy = 0;
  state.phase = state.s >= course.length ? 'arrived' : 'flying';
  state.arrived = state.phase === 'arrived';
  state.countdown = 0;
  if (state.speed < course.cruiseSpeed * 0.8) state.speed = course.cruiseSpeed;
  state.started = true;
  let r = 0;
  while (r < course.rings.length && (course.rings[r]?.s ?? 0) <= state.s) r++;
  state.nextRing = r;
  let c = 0;
  while (c < course.collectibles.length && (course.collectibles[c]?.s ?? 0) < state.s - 1) c++;
  state.nextCollect = c;
  let o = 0;
  while (o < course.obstacles.length) {
    const ob = course.obstacles[o];
    if (!ob || ob.s + ob.radius >= state.s) break;
    state.obstaclePassed[o] = 1;
    o++;
  }
  state.nextObstacle = o;
  state.progress = state.s / course.length;
  state.versions.rings++;
  state.versions.collect++;
  state.versions.obstacles++;
}
