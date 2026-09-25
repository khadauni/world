import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { tier } from '@/core/tier';
import type { Tiered, WorldRuntimeProps } from '@/core/types';
import { LabelLayer } from './LabelLayer';
import styles from './Overlay.module.css';
import { URANUS_TILT, bestTiltButton, cheerFor, tiltConfig, tiltProgress, tuningFor } from './tasks/rules';
import { useTiltStore } from './tiltStore';

const TOO_FAR: Tiered<string> = { tiny: 'Whoa, too far! 😄', junior: 'Too far — tip it back a little!', senior: 'Overshot 98° — nudge it back.' };
const DONE: Tiered<string> = {
  tiny: 'Uranus is on its side! Roll, roll! 🎉',
  junior: 'You did it! Uranus rolls around the Sun on its side.',
  senior: 'Exactly 98° — Uranus orbits the Sun lying on its side.',
};

/** DOM layer: 3D name tags, plus controls for tasks that are easier with buttons (the Uranus "Tilt it!" mission). */
export function Overlay(props: WorldRuntimeProps) {
  return (
    <>
      <LabelLayer />
      {props.phase === 'task' && props.stopId === 'uranus' && <TiltControls {...props} />}
    </>
  );
}

function TiltControls({ band, actions, reducedMotion }: WorldRuntimeProps) {
  const cfg = tiltConfig(band);
  const tuning = tuningFor('tilt-uranus', band);
  const angle = useTiltStore((s) => s.angle);
  const solved = useTiltStore((s) => s.solved);
  const taps = useTiltStore((s) => s.taps);
  const [helping, setHelping] = useState(false);
  const misses = useRef(0);
  const last = useRef(0);
  const idle = useRef(0);

  // Fresh start every time the mission opens (Uranus "stands up" and waits to be tipped over), and leave
  // nothing behind for the next visit.
  useEffect(() => {
    useTiltStore.getState().reset();
    return () => useTiltStore.getState().reset();
  }, []);

  // Progress + feedback whenever the angle changes (from buttons or from tapping the planet).
  useEffect(() => {
    const p = tiltProgress(angle, cfg);
    actions.taskProgress(p.done, p.total);
    if (taps === 0) return;
    idle.current = 0;
    if (solved) {
      actions.sfx('star');
      actions.say(DONE);
      const t = setTimeout(() => actions.completeTask(), 2000);
      return () => clearTimeout(t);
    }
    if (angle > URANUS_TILT && last.current <= URANUS_TILT) {
      misses.current += 1;
      actions.sfx('thud');
      actions.say(TOO_FAR);
      if (misses.current >= tuning.assistAfterMisses) setHelping(true);
    } else {
      actions.sfx('whoosh');
      const cheer = cfg.buttons.length === 1 ? cheerFor(Math.round(angle / (cfg.buttons[0]?.delta ?? 1)), p.total) : null;
      if (cheer && angle < URANUS_TILT - cfg.tolerance) actions.say(cheer);
    }
    last.current = angle;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angle, taps, solved]);

  // Gentle help after a long pause.
  useEffect(() => {
    if (helping || solved) return;
    const t = setInterval(() => {
      idle.current += 1;
      if (idle.current >= tuning.assistAfterIdle) setHelping(true);
    }, 1000);
    return () => clearInterval(t);
  }, [helping, solved, tuning.assistAfterIdle]);

  const best = helping ? bestTiltButton(angle, cfg) : null;
  const big = band === 'tiny';

  return (
    <div className={styles.dock} role="group" aria-label="Tilt Uranus">
      {cfg.showDegrees && (
        <div className={styles.gauge} aria-live="polite">
          <div className={styles.dial} aria-hidden="true">
            <span className={styles.goal} />
            <span className={styles.axis} style={{ transform: `rotate(${angle}deg)`, transition: reducedMotion ? 'none' : undefined } as CSSProperties} />
          </div>
          <div className={styles.degrees} data-testid="uranus-angle">
            {Math.round(angle)}°
          </div>
          <div className={styles.goalText}>Goal: {URANUS_TILT}°</div>
        </div>
      )}
      {cfg.buttons.map((b) => (
        <button
          key={b.id}
          type="button"
          className={[styles.btn, big ? styles.big : '', b.delta < 0 ? styles.back : '', best === b.id ? styles.help : ''].filter(Boolean).join(' ')}
          disabled={solved}
          data-testid={`tilt-${b.id}`}
          onClick={() => useTiltStore.getState().tilt(b.delta, cfg)}
        >
          <span className={styles.btnEmoji} aria-hidden="true">
            {b.emoji}
          </span>
          {tier(b.label, band)}
        </button>
      ))}
    </div>
  );
}
