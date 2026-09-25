import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Vector3 } from 'three';
import type { AgeBand, SfxName, Tiered, WorldActions } from '@/core/types';
import { useSolar } from '../state';
import { HELP_LINE, NO_HELP, afterHit, afterMiss, cheerFor, idleHelps, tuningFor, type HelpState, type TaskKind, type Tuning } from './rules';

export interface HitOptions {
  readonly color?: string;
  /** Replace the automatic cheer (null = stay quiet). */
  readonly line?: Tiered<string> | null;
  readonly sound?: SfxName;
}

export interface TaskKit {
  readonly tuning: Tuning;
  readonly done: number;
  /** True once the world has started helping (after 2 misses or a long pause). Never switches back off. */
  readonly helping: boolean;
  /** Live flag for useFrame readers. */
  readonly helpingRef: { readonly current: boolean };
  hit(at?: Vector3, opts?: HitOptions): void;
  miss(line?: Tiered<string> | null): void;
}

/**
 * Shared task plumbing: progress reporting, cheers, gentle help after misses or idling, juicy feedback,
 * and a short celebration before the shell moves on to the quiz. Never a fail state.
 */
export function useTaskKit(kind: TaskKind, band: AgeBand, actions: WorldActions, total: number, finishDelayMs = 1400): TaskKit {
  const sys = useSolar();
  const tuning = tuningFor(kind, band);
  const [done, setDone] = useState(0);
  const [helping, setHelping] = useState(false);
  const doneRef = useRef(0);
  const help = useRef<HelpState>(NO_HELP);
  /** Seconds since the start or the last success (a plain number: it ticks every frame). */
  const idle = useRef(0);
  const helpingRef = useRef(false);
  const finished = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Which celebration line to use this time (varies between visits, stable within one).
  const [seed] = useState(() => Math.floor(Math.random() * 7));

  useEffect(() => {
    actions.taskProgress(0, total);
  }, [actions, total]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const startHelping = useCallback(() => {
    if (helpingRef.current) return;
    helpingRef.current = true;
    setHelping(true);
    actions.say(HELP_LINE);
  }, [actions]);

  useFrame((_, dt) => {
    if (finished.current || helpingRef.current) return;
    idle.current += Math.min(dt, 0.1);
    if (idleHelps(idle.current, tuning)) startHelping();
  });

  const hit = useCallback(
    (at?: Vector3, opts: HitOptions = {}) => {
      if (finished.current) return;
      const color = opts.color ?? '#ffe27a';
      const line = opts.line;
      const n = doneRef.current + 1;
      doneRef.current = n;
      setDone(n);
      help.current = afterHit(help.current);
      idle.current = 0;
      actions.taskProgress(n, total);
      if (at) sys.burst(at, color, n >= total ? 60 : 30, 1.4 * sys.stage.unit, sys.stage.unit * 1.2);
      if (n >= total) {
        finished.current = true;
        actions.sfx('star');
        if (line !== null) actions.say(line ?? cheerFor(n, total, seed) ?? 'Hooray!');
        timer.current = setTimeout(() => actions.completeTask(), finishDelayMs);
        return;
      }
      actions.sfx(opts.sound ?? 'collect');
      const cheer = line === null ? null : (line ?? cheerFor(n, total, seed));
      if (cheer) actions.say(cheer);
    },
    [actions, finishDelayMs, seed, sys, total],
  );

  const miss = useCallback(
    (line?: Tiered<string> | null) => {
      if (finished.current) return;
      help.current = afterMiss(help.current, tuning);
      actions.sfx('tap');
      if (help.current.helping && !helpingRef.current) startHelping();
      else if (line) actions.say(line);
    },
    [actions, startHelping, tuning],
  );

  return { tuning, done, helping, helpingRef, hit, miss };
}
