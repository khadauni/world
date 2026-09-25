import { useEffect, useRef } from 'react';
import type { AgeBand } from '@/core/types';
import { CYCLE, periodFor, wrap01 } from '../logic/beat';
import { beat, useHeart } from '../store';
import styles from '../Overlay.module.css';

const FEEDBACK: Record<AgeBand, Record<string, string>> = {
  tiny: { good: 'Boom! 💥', early: 'Wait… 🙂', late: 'Next one! 🙂', again: 'Wait… 🙂' },
  junior: { good: 'Great beat! ✨', early: 'Too early', late: 'A bit late', again: 'Wait for the next one' },
  senior: { good: 'On the beat ✓', early: 'Early', late: 'Late', again: 'One tap per beat' },
};

/**
 * The big heartbeat drum. It swells with the real beat (read every animation frame from the shared
 * heartbeat — no React renders), and its golden ring closes in just before each squeeze.
 */
export function BeatDrum({ band }: { band: AgeBand }) {
  const send = useHeart((s) => s.send);
  const feedback = useHeart((s) => s.beat.feedback);
  const emoji = useRef<HTMLSpanElement>(null);
  const ring = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    // Quantised to 1/200 and only written when changed: no string churn while the drum sits still.
    const last = { swell: -1, ring: -1, fade: -1 };
    const loop = () => {
      const swell = Math.round(Math.max(0, beat.vent) * 200);
      if (emoji.current && swell !== last.swell) {
        last.swell = swell;
        emoji.current.style.transform = `scale(${1 + (swell / 200) * 0.28})`;
      }
      const toPeak = wrap01(CYCLE.ventPeak - beat.phase) * periodFor(beat.bpm);
      if (ring.current) {
        const k = Math.round(Math.min(1, toPeak / 0.95) * 200);
        const fade = toPeak < 0.95 ? Math.round((1 - (k / 200) * 0.6) * 100) : 0;
        if (fade !== last.fade) {
          last.fade = fade;
          ring.current.style.opacity = String(fade / 100);
        }
        if (k !== last.ring) {
          last.ring = k;
          ring.current.style.transform = `scale(${1 + (k / 200) * 0.35})`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const label = feedback.kind ? FEEDBACK[band][feedback.kind] : null;
  return (
    <div className={styles.dock}>
      <div className={styles.drumRow}>
        <button
          type="button"
          className={styles.drum}
          data-testid="beat-drum"
          aria-label="Tap in time with the heartbeat"
          onPointerDown={(e) => {
            // Pointer-down feels instant for rhythm; keyboard users get onClick below.
            e.preventDefault();
            send({ type: 'beat-tap' });
          }}
          onClick={(e) => {
            if (e.detail === 0) send({ type: 'beat-tap' });
          }}
        >
          <span ref={ring} className={styles.drumRing} aria-hidden="true" />
          <span>
            <span ref={emoji} className={`${styles.drumEmoji} emoji`} aria-hidden="true">
              ❤️
            </span>
            <span className={styles.drumLabel}>TAP!</span>
          </span>
        </button>
        {label && (
          <div key={feedback.n} className={`${styles.feedback} ${feedback.kind === 'good' ? styles.feedbackGood : ''}`} role="status">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
