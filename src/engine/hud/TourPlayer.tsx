import { AnimatePresence, m } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useIsSpeaking } from '@/core/audio/speech';
import type { AgeBand, GuideCharacter, TourBeat } from '@/core/types';
import { Button } from '@/ui/Button';
import { Guide } from '@/ui/Guide';
import { fmt } from '../text';
import { formatStat, parseStat, readingTime } from '../tour';
import styles from './TourPlayer.module.css';
import type { TourPlayback } from './useTourPlayback';

/**
 * Documentary-style guided tour: each beat shows (the 3D scene stages `beat.shot`) and tells (narrated caption,
 * optional headline and a big animated number). Stories-style segments show progress and let kids jump around.
 */
export function TourPlayer({
  beats,
  playback,
  band,
  name,
  guide,
  kicker,
  accent,
  voice,
  onSkip,
  skipLabel,
  reducedMotion,
}: {
  beats: readonly TourBeat[];
  playback: TourPlayback;
  band: AgeBand;
  name: string;
  guide: GuideCharacter;
  kicker: string;
  accent: string;
  voice: boolean;
  onSkip: () => void;
  skipLabel: string;
  reducedMotion: boolean;
}) {
  const beat = beats[playback.index];
  const talking = useIsSpeaking();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight') playback.next();
      else if (e.key === 'ArrowLeft') playback.prev();
      else if (e.key === ' ' && t?.tagName !== 'BUTTON') {
        e.preventDefault();
        playback.toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playback]);

  if (!beat) return null;
  const say = fmt(beat.say, band, name);
  const title = beat.title ? fmt(beat.title, band, name) : null;
  const dur = voice ? Math.max(readingTime(say, band, beat.hold ?? 0), 2500) : readingTime(say, band, beat.hold ?? 0);

  return (
    <>
      <div className={styles.scrimTop} aria-hidden="true" />
      <div className={styles.scrimBottom} aria-hidden="true" />

      <div className={styles.progress} role="group" aria-label={`Tour, part ${playback.index + 1} of ${beats.length}`} style={{ ['--accent' as string]: accent }}>
        {beats.map((b, i) => {
          const state = i < playback.index || playback.done ? styles.segDone : i === playback.index ? styles.segNow : styles.segTodo;
          return (
            <button
              key={`${b.id}-${i === playback.index ? playback.index : 'x'}`}
              type="button"
              className={`${styles.seg} ${state} ${!playback.playing ? styles.segPaused : ''}`}
              style={{ ['--dur' as string]: `${dur}ms` }}
              aria-label={`Go to part ${i + 1}`}
              aria-current={i === playback.index ? 'step' : undefined}
              onClick={() => playback.goTo(i)}
            >
              <span className={styles.segFill} />
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {beat.stat && (
          <m.div
            key={`stat-${beat.id}`}
            className={styles.stat}
            style={{ ['--accent' as string]: accent }}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            aria-hidden="true"
          >
            <CountUp value={fmt(beat.stat.value, band, name)} animate={!reducedMotion} />
            <div className={styles.statLabel}>{fmt(beat.stat.label, band, name)}</div>
          </m.div>
        )}
      </AnimatePresence>

      <div className={styles.lower} style={{ ['--accent' as string]: accent }} data-testid="tour-player">
        <div className={styles.guide}>
          <Guide look={guide.look} size={84} talking={talking} />
        </div>
        <AnimatePresence mode="wait">
          <m.div
            key={beat.id}
            className={styles.panel}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.kicker}>
              <span className={styles.kickerDot} aria-hidden="true" />
              {kicker}
            </div>
            {title && <h2 className={styles.title}>{title}</h2>}
            <p className={styles.caption} aria-live="polite" data-testid="tour-caption">
              {say}
            </p>
            <div className={styles.controls}>
              <button type="button" className={styles.ctrl} onClick={playback.prev} disabled={playback.index === 0} aria-label="Previous">
                <span aria-hidden="true">⏮</span>
              </button>
              <button
                type="button"
                className={`${styles.ctrl} ${styles.ctrlMain}`}
                onClick={playback.toggle}
                aria-label={playback.playing ? 'Pause' : 'Play'}
                data-testid="tour-toggle"
              >
                <span aria-hidden="true">{playback.playing ? '❚❚' : '▶'}</span>
              </button>
              <button type="button" className={styles.ctrl} onClick={playback.next} aria-label="Next" data-testid="tour-next">
                <span aria-hidden="true">⏭</span>
              </button>
              <span className={styles.count} aria-hidden="true">
                {playback.index + 1}/{beats.length}
              </span>
              <span className={styles.grow} />
              <button type="button" className={styles.skip} onClick={onSkip} data-testid="tour-skip">
                {skipLabel} <span aria-hidden="true">⚡</span>
              </button>
            </div>
          </m.div>
        </AnimatePresence>
      </div>
    </>
  );
}

/** Counts a stat's leading number up from zero; non-numeric values just appear. */
function CountUp({ value, animate }: { value: string; animate: boolean }) {
  const parsed = parseStat(value);
  const [text, setText] = useState(() => (animate && parsed ? formatStat(parsed, 0, true) : value));
  const raf = useRef(0);

  useEffect(() => {
    const p = parseStat(value);
    if (!animate || !p) {
      setText(value);
      return;
    }
    const grouping = /\d,\d/.test(value);
    const start = performance.now();
    const dur = 1100;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setText(t >= 1 ? value : formatStat(p, p.number * eased, grouping));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, animate]);

  return <div className={styles.statValue}>{text}</div>;
}

/** Shown when a tour ends: choose the mission, the quiz, or watch again. */
export function TourEndCard({
  title,
  hasMission,
  onMission,
  onQuiz,
  onReplay,
  reducedMotion,
}: {
  title: string;
  hasMission: boolean;
  onMission: () => void;
  onQuiz: () => void;
  onReplay: () => void;
  reducedMotion: boolean;
}) {
  return (
    <div className={styles.endWrap}>
      <m.div
        className={styles.end}
        role="dialog"
        aria-label="Tour complete"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        data-testid="tour-end"
      >
        <span className="emoji" style={{ fontSize: 54 }} aria-hidden="true">
          🎬
        </span>
        <h2 className={styles.endTitle}>You explored {title}!</h2>
        <p className={styles.endSub}>{hasMission ? 'Ready for your mission?' : 'Ready to show what you learned?'}</p>
        <div className={styles.endActions}>
          {hasMission && (
            <Button tone="sun" size="l" icon="🎯" onClick={onMission} data-autofocus data-testid="start-mission">
              Start mission
            </Button>
          )}
          <Button tone={hasMission ? 'ghost' : 'sun'} size={hasMission ? 'm' : 'l'} icon="❓" onClick={onQuiz} data-testid="start-quiz">
            {hasMission ? 'Skip to quiz' : 'Quiz time'}
          </Button>
        </div>
        <button type="button" className={styles.replay} onClick={onReplay}>
          🔁 Watch again
        </button>
      </m.div>
    </div>
  );
}
