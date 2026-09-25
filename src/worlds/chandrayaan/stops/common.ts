import { useEffect, useRef } from 'react';
import type { FlowPhase, WorldRuntimeProps } from '@/core/types';
import { useMission, type Command } from '../store';

/** Props every stop "set" receives from the Scene director. */
export interface StopProps extends WorldRuntimeProps {
  /** Travel phase and this set is on screen: glide the camera in, then call onArrive. */
  readonly arriving: boolean;
  readonly onArrive: () => void;
}

/** Register this stop as the receiver of Overlay commands while mounted. */
export function useCommands(handler: (cmd: Command) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const fn = (cmd: Command) => ref.current(cmd);
    useMission.getState().setHandler(fn);
    return () => {
      if (useMission.getState().handler === fn) useMission.getState().setHandler(null);
    };
  }, []);
}

/** Run `fn` each time the flow enters the task phase (fresh attempt), and on mount if already there. */
export function useOnTaskStart(phase: FlowPhase, fn: () => void): void {
  const ref = useRef(fn);
  ref.current = fn;
  const prev = useRef<FlowPhase | null>(null);
  useEffect(() => {
    if (phase === 'task' && prev.current !== 'task') ref.current();
    prev.current = phase;
  }, [phase]);
}

/**
 * Run `fn` when the flow leaves the task phase (completed *or* skipped via "Help me → Skip"), so the set can
 * jump to its finished look for the reward screen and stop any pending celebration timers.
 */
export function useOnTaskEnd(phase: FlowPhase, fn: () => void): void {
  const ref = useRef(fn);
  ref.current = fn;
  const prev = useRef<FlowPhase | null>(null);
  useEffect(() => {
    if (prev.current === 'task' && phase !== 'task') ref.current();
    prev.current = phase;
  }, [phase]);
}

/** Has the task been finished (or skipped) for this visit? True once past the task phase. */
export function isAfterTask(phase: FlowPhase): boolean {
  return phase === 'quiz' || phase === 'reward';
}

/** setTimeout that is cleared on unmount (for short celebration pauses before completeTask). */
export function useTimers() {
  const timers = useRef<number[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
    [],
  );
  return {
    later(fn: () => void, ms: number) {
      timers.current.push(window.setTimeout(fn, ms));
    },
    clear() {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
  };
}
