import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { createInputChannels, createControlState, resetControl, type FlightInputChannels } from './input';
import { createPathFrame, samplePath, type PathFrame } from './path';
import type { ShipPhase, ShipState } from './ship';
import type { ControlState, Course, FlightMode } from './types';

export type FlightPopupKind = 'ring' | 'nearMiss' | 'bump' | 'boost' | 'go' | 'arrive';

/** A transient HUD callout ("Ring x3!", "Close one!"). `id` changes every time, so the HUD can re-animate. */
export interface FlightPopup {
  readonly id: number;
  readonly kind: FlightPopupKind;
  readonly combo: number;
  readonly perfect: boolean;
}

/** What the DOM HUD shows. Published ~10×/s (plus instantly for popups) — never per frame. */
export interface FlightHudState {
  readonly active: boolean;
  readonly mode: FlightMode;
  readonly phase: ShipPhase;
  /** Whole seconds left in the countdown (0 once flying). */
  readonly countdown: number;
  readonly speed01: number;
  readonly energy: number;
  readonly boosting: boolean;
  readonly braking: boolean;
  readonly progress: number;
  readonly collected: number;
  readonly collectTotal: number;
  readonly ringsPassed: number;
  readonly ringTotal: number;
  readonly combo: number;
  readonly autopilot: boolean;
  readonly popup: FlightPopup | null;
}

export const INITIAL_HUD: FlightHudState = {
  active: false,
  mode: 'assist',
  phase: 'countdown',
  countdown: 0,
  speed01: 0,
  energy: 1,
  boosting: false,
  braking: false,
  progress: 0,
  collected: 0,
  collectTotal: 0,
  ringsPassed: 0,
  ringTotal: 0,
  combo: 0,
  autopilot: false,
  popup: null,
};

/** The ship's world transform, refreshed every frame by <FlightRun> (cameras and world FX read it). */
export interface ShipPose {
  readonly position: Vector3;
  /** Visual orientation including bank / pitch / yaw. The ship model's nose points along local −Z. */
  readonly quaternion: Quaternion;
  /** The unbanked path frame at the ship's distance. */
  readonly frame: PathFrame;
}

/**
 * The link between a world's Scene (inside the canvas) and its Overlay (DOM): input channels written by the
 * controls, the live ship state, the pose, and the throttled HUD store. Create one per world at module level:
 *
 * ```ts
 * export const flight = createFlightSession();
 * ```
 */
export interface FlightSession {
  /** Written by keyboard / touch / gamepad sources. */
  readonly input: FlightInputChannels;
  /** Merged controls for the current frame (read-only for consumers). */
  readonly controls: ControlState;
  readonly hud: StoreApi<FlightHudState>;
  readonly pose: ShipPose;
  /** Live ship state while a run is mounted (mutated in place every frame), else null. */
  ship: ShipState | null;
  course: Course | null;
  /** Runtime autopilot switch (e.g. an in-HUD toggle). Combined with <FlightRun autopilot>. */
  autopilot: boolean;
  /** Clear all held input (call when controls unmount or the window loses focus). */
  resetInput(): void;
}

export function createFlightSession(): FlightSession {
  const input = createInputChannels();
  return {
    input,
    controls: createControlState(),
    hud: createStore<FlightHudState>(() => INITIAL_HUD),
    pose: { position: new Vector3(), quaternion: new Quaternion(), frame: createPathFrame() },
    ship: null,
    course: null,
    autopilot: false,
    resetInput() {
      resetControl(input.keyboard);
      resetControl(input.pointer);
      resetControl(input.gamepad);
    },
  };
}

const basis = new Matrix4();
const back = new Vector3();
const attitude = new Euler(0, 0, 0, 'YXZ');
const local = new Quaternion();

/** Course-space ship state → world pose (position + banked orientation). Allocation-free. */
export function computeShipPose(course: Course, ship: ShipState, pose: ShipPose): ShipPose {
  const f = samplePath(course.path, ship.s, pose.frame);
  pose.position.copy(f.position).addScaledVector(f.right, ship.x).addScaledVector(f.up, ship.y);
  back.copy(f.forward).negate();
  basis.makeBasis(f.right, f.up, back);
  pose.quaternion.setFromRotationMatrix(basis);
  attitude.set(ship.pitch, -ship.yaw, -ship.bank, 'YXZ');
  local.setFromEuler(attitude);
  pose.quaternion.multiply(local);
  return pose;
}
