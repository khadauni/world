import type { ControlState } from './types';

/**
 * Pilot input. Every source (keyboard, the touch joystick + BOOST button, a gamepad) writes its own channel;
 * `resolveControls` merges them once per frame. Plain mutable objects — no React state, no re-renders.
 */
export interface FlightInputChannels {
  readonly keyboard: ControlState;
  readonly pointer: ControlState;
  readonly gamepad: ControlState;
}

export function createControlState(): ControlState {
  return { x: 0, y: 0, boost: false, brake: false };
}

export function createInputChannels(): FlightInputChannels {
  return { keyboard: createControlState(), pointer: createControlState(), gamepad: createControlState() };
}

export function resetControl(c: ControlState): void {
  c.x = 0;
  c.y = 0;
  c.boost = false;
  c.brake = false;
}

/** Clamp (x, y) into the unit circle in place. */
function clampUnit(c: ControlState): void {
  const m = Math.hypot(c.x, c.y);
  if (m > 1) {
    c.x /= m;
    c.y /= m;
  }
}

/** Merge all channels into `out`: stick values add (clamped to the unit circle), buttons OR together. */
export function resolveControls(ch: FlightInputChannels, out: ControlState): ControlState {
  out.x = ch.keyboard.x + ch.pointer.x + ch.gamepad.x;
  out.y = ch.keyboard.y + ch.pointer.y + ch.gamepad.y;
  clampUnit(out);
  out.boost = ch.keyboard.boost || ch.pointer.boost || ch.gamepad.boost;
  out.brake = ch.keyboard.brake || ch.pointer.brake || ch.gamepad.brake;
  return out;
}

/** Key codes (KeyboardEvent.code) the flight kit listens to. */
export const FLIGHT_KEYS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  boost: ['Space', 'ShiftLeft', 'ShiftRight'],
  brake: ['KeyX', 'ControlLeft', 'ControlRight'],
} as const;

const ALL_KEYS: ReadonlySet<string> = new Set<string>(Object.values(FLIGHT_KEYS).flat());

export function isFlightKey(code: string): boolean {
  return ALL_KEYS.has(code);
}

function anyDown(pressed: ReadonlySet<string>, codes: readonly string[]): boolean {
  for (const c of codes) if (pressed.has(c)) return true;
  return false;
}

/**
 * Map the set of held keys to a control state. Opposite keys cancel; diagonals are normalised so steering
 * diagonally is not faster. `invertY` flips up/down for kids who prefer "plane" controls.
 */
export function keysToControl(pressed: ReadonlySet<string>, out: ControlState, invertY = false): ControlState {
  out.x = (anyDown(pressed, FLIGHT_KEYS.right) ? 1 : 0) - (anyDown(pressed, FLIGHT_KEYS.left) ? 1 : 0);
  const y = (anyDown(pressed, FLIGHT_KEYS.up) ? 1 : 0) - (anyDown(pressed, FLIGHT_KEYS.down) ? 1 : 0);
  out.y = invertY ? -y : y;
  clampUnit(out);
  out.boost = anyDown(pressed, FLIGHT_KEYS.boost);
  out.brake = anyDown(pressed, FLIGHT_KEYS.brake);
  return out;
}

/**
 * Radial dead zone with rescaling: inside `dead` → 0; outside, the remaining range maps smoothly to 0–1 so
 * small, shaky thumbs don't jitter the ship but full deflection still reaches full speed.
 */
export function applyDeadzone(x: number, y: number, dead: number, out: { x: number; y: number }): { x: number; y: number } {
  const m = Math.hypot(x, y);
  if (m <= dead || m === 0) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const scaled = Math.min(1, (m - dead) / (1 - dead));
  out.x = (x / m) * scaled;
  out.y = (y / m) * scaled;
  return out;
}

/**
 * Virtual joystick: pointer offset from the base centre (screen pixels, y down) → stick vector (y up), clamped to
 * the knob travel `radius`, with a small dead zone. Also returns the knob's clamped pixel offset for drawing.
 */
export function joystickVector(
  dx: number,
  dy: number,
  radius: number,
  out: { x: number; y: number; knobX: number; knobY: number },
  dead = 0.12,
): { x: number; y: number; knobX: number; knobY: number } {
  const m = Math.hypot(dx, dy);
  const k = m > radius && m > 0 ? radius / m : 1;
  out.knobX = dx * k;
  out.knobY = dy * k;
  applyDeadzone(out.knobX / radius, -out.knobY / radius, dead, out);
  return out;
}

/** Minimal slice of the Gamepad API we read (lets tests pass plain objects). */
export interface GamepadLike {
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
}

/**
 * Standard-mapping gamepad → control state: left stick steers (dead zone 0.18), A / RB / RT boost, B / LT brake.
 */
export function gamepadToControl(pad: GamepadLike | null | undefined, out: ControlState): ControlState {
  if (!pad) {
    out.x = 0;
    out.y = 0;
    out.boost = false;
    out.brake = false;
    return out;
  }
  applyDeadzone(pad.axes[0] ?? 0, -(pad.axes[1] ?? 0), 0.18, out);
  const btn = (i: number) => {
    const b = pad.buttons[i];
    return !!b && (b.pressed || b.value > 0.35);
  };
  out.boost = btn(0) || btn(5) || btn(7);
  out.brake = btn(1) || btn(6);
  return out;
}

/**
 * Should this key event be left alone? Always while the child is typing in a field; and Space/Enter stay with
 * any focused non-flight button or link (so keyboard users can still press "Autopilot" or "Home"). Our own
 * controls opt in with a `data-flight-ui` attribute.
 */
export function shouldIgnoreKey(code: string, target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return false;
  const el = target as Element;
  if (el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return true;
  const activates = code === 'Space' || code === 'Enter' || code === 'NumpadEnter';
  return activates && !!el.closest('button, a[href], [role="button"], summary') && !el.closest('[data-flight-ui]');
}
