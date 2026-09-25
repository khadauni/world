import { useEffect } from 'react';
import { gamepadToControl, isFlightKey, keysToControl, resetControl, shouldIgnoreKey, type GamepadLike } from './input';
import type { FlightSession } from './session';

/**
 * Keyboard steering for a flight session: WASD / arrows steer, Space / Shift boost, X / Ctrl brake.
 * Writes `session.input.keyboard` directly (no React state). Held keys are released when the window blurs.
 */
export function useFlightKeyboard(session: FlightSession, enabled = true, invertY = false): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const pressed = new Set<string>();
    const out = session.input.keyboard;
    const sync = () => keysToControl(pressed, out, invertY);
    const down = (e: KeyboardEvent) => {
      if (!isFlightKey(e.code) || e.metaKey || e.altKey) return;
      if (shouldIgnoreKey(e.code, e.target)) return;
      e.preventDefault();
      pressed.add(e.code);
      sync();
    };
    const up = (e: KeyboardEvent) => {
      if (!pressed.has(e.code)) return;
      e.preventDefault();
      pressed.delete(e.code);
      sync();
    };
    const clear = () => {
      pressed.clear();
      resetControl(out);
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') clear();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', onVisibility);
      clear();
    };
  }, [session, enabled, invertY]);
}

let padsSeen = false;
if (typeof window !== 'undefined') {
  window.addEventListener('gamepadconnected', () => {
    padsSeen = true;
  });
}

/**
 * Poll the first connected gamepad into `session.input.gamepad`. Call once per frame; does nothing (and costs
 * nothing) until a gamepad has been connected.
 */
export function pollGamepad(session: FlightSession): void {
  if (!padsSeen || typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
  const pads = navigator.getGamepads();
  let pad: GamepadLike | null = null;
  for (let i = 0; i < pads.length; i++) {
    const p = pads[i];
    if (p && p.connected) {
      pad = p;
      break;
    }
  }
  gamepadToControl(pad, session.input.gamepad);
}
