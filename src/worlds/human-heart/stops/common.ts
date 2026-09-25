import { useEffect, useRef } from 'react';
import type { FlowPhase, Tiered, WorldActions, WorldRuntimeProps } from '@/core/types';
import { useHeart, type Command } from '../store';

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
    useHeart.getState().setHandler(fn);
    return () => {
      if (useHeart.getState().handler === fn) useHeart.getState().setHandler(null);
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

/** Run `fn` when the flow leaves the task phase (completed or skipped), so the set can show its finished look. */
export function useOnTaskEnd(phase: FlowPhase, fn: () => void): void {
  const ref = useRef(fn);
  ref.current = fn;
  const prev = useRef<FlowPhase | null>(null);
  useEffect(() => {
    if (prev.current === 'task' && phase !== 'task') ref.current();
    prev.current = phase;
  }, [phase]);
}

/**
 * Timers that die with the set (celebration delays etc.). Never leaks a completeTask() into another stop.
 */
export function useTimers(): (fn: () => void, ms: number) => void {
  const ids = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      ids.current.forEach(clearTimeout);
      ids.current = [];
    },
    [],
  );
  return useRef((fn: () => void, ms: number) => {
    ids.current.push(setTimeout(fn, ms));
  }).current;
}

/** Say a line at most once every `gapMs` (kids tap fast — don't stack speech). */
export function useSayThrottle(actions: WorldActions, gapMs = 900): (line: Tiered<string>, force?: boolean) => void {
  const last = useRef(0);
  return useRef((line: Tiered<string>, force = false) => {
    const now = performance.now();
    if (!force && now - last.current < gapMs) return;
    last.current = now;
    actions.say(line);
  }).current;
}
