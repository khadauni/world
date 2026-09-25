import { useCallback, useEffect, useRef, useState } from 'react';
import { speak, stopSpeaking } from '@/core/audio/speech';
import type { AgeBand, TourBeat } from '@/core/types';
import { fmt } from '../text';
import { readingTime } from '../tour';

export interface TourPlayback {
  readonly index: number;
  readonly playing: boolean;
  /** True once the last beat has finished — the end card is showing. */
  readonly done: boolean;
  next(): void;
  prev(): void;
  toggle(): void;
  restart(): void;
  goTo(i: number): void;
}

/**
 * Drives a guided tour: each beat is narrated (when voice is on) and advances when BOTH the narration has
 * finished and the beat's minimum time has passed, so camera moves and animations always get to land.
 * Without voice, beats advance on a reading-time estimate tuned per age band.
 */
export function useTourPlayback({
  beats,
  active,
  band,
  name,
  voice,
  rate,
  resetKey,
}: {
  beats: readonly TourBeat[];
  active: boolean;
  band: AgeBand;
  name: string;
  voice: boolean;
  rate: number;
  /** Changing this restarts the tour (new stop, replay). */
  resetKey: string;
}): TourPlayback {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [done, setDone] = useState(false);
  const total = beats.length;

  useEffect(() => {
    setIndex(0);
    setPlaying(true);
    setDone(total === 0);
  }, [resetKey, total]);

  const advance = useRef<() => void>(() => undefined);
  advance.current = () => {
    if (index + 1 < total) setIndex(index + 1);
    else setDone(true);
  };

  useEffect(() => {
    if (!active || !playing || done) return;
    const beat = beats[index];
    if (!beat) return;
    const text = fmt(beat.say, band, name);
    const minMs = voice ? Math.max(beat.hold ?? 0, 1500) : readingTime(text, band, beat.hold ?? 0);
    let speechDone = !voice;
    let timeDone = false;
    let cancelled = false;
    const maybeAdvance = () => {
      if (!cancelled && speechDone && timeDone) advance.current();
    };
    if (voice) {
      speak(text, {
        rate,
        onEnd: () => {
          speechDone = true;
          // A short breath between beats feels natural and lets the picture be seen.
          setTimeout(maybeAdvance, 450);
        },
      });
    }
    const minTimer = setTimeout(() => {
      timeDone = true;
      maybeAdvance();
    }, minMs);
    // Safety net: some browsers never fire `end` for speech.
    const safety = setTimeout(() => {
      speechDone = true;
      timeDone = true;
      maybeAdvance();
    }, readingTime(text, band, beat.hold ?? 0) * 2 + 4000);
    return () => {
      cancelled = true;
      clearTimeout(minTimer);
      clearTimeout(safety);
    };
  }, [active, playing, done, index, beats, band, name, voice, rate]);

  useEffect(() => {
    if (!playing || !active) stopSpeaking();
  }, [playing, active]);

  useEffect(() => () => stopSpeaking(), []);

  const live = useRef({ index, done });
  live.current = { index, done };

  const next = useCallback(() => {
    stopSpeaking();
    const { index: i, done: d } = live.current;
    if (d) return;
    if (i + 1 < total) setIndex(i + 1);
    else setDone(true);
    setPlaying(true);
  }, [total]);

  const prev = useCallback(() => {
    stopSpeaking();
    setDone(false);
    setIndex((i) => Math.max(0, i - 1));
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => setPlaying((p) => !p), []);

  const restart = useCallback(() => {
    stopSpeaking();
    setDone(total === 0);
    setIndex(0);
    setPlaying(true);
  }, [total]);

  const goTo = useCallback(
    (i: number) => {
      stopSpeaking();
      setDone(false);
      setIndex(Math.max(0, Math.min(total - 1, i)));
      setPlaying(true);
    },
    [total],
  );

  return { index: Math.min(index, Math.max(0, total - 1)), playing, done, next, prev, toggle, restart, goTo };
}
