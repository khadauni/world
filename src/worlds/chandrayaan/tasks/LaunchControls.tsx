import { useEffect, useRef } from 'react';
import type { AgeBand } from '@/core/types';
import { tier } from '@/core/tier';
import { RULES } from '../logic/bands';
import { checksFor, displayOrder, stepHold, tapHold } from '../logic/launch';
import styles from '../Overlay.module.css';
import { live, useMission } from '../store';
import { HoldButton, RING_C } from './HoldButton';

const GRACE_MS = 1500;

/** Pre-launch checklist cards + the big hold-to-LAUNCH button + the countdown numbers. */
export function LaunchControls({ band }: { band: AgeBand }) {
  const rules = RULES[band].launch;
  const checks = checksFor(rules);
  const shown = displayOrder(checks, rules.ordered);
  const launch = useMission((s) => s.launch);
  const send = useMission((s) => s.send);
  const ring = useRef<SVGCircleElement>(null);
  const holding = useRef(false);
  const fillAtPress = useRef(0);
  const releasedAt = useRef(0);
  const sent = useRef(false);
  const stage = launch.stage;

  useEffect(() => {
    sent.current = stage !== 'hold' && stage !== 'checks';
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      if (stage === 'hold') {
        // Little hands get a grace period: the ring only starts draining 1.5 s after the last press.
        const resting = !holding.current && now - releasedAt.current < GRACE_MS;
        if (!resting) live.launchFill = stepHold(live.launchFill, holding.current, dt, rules);
        if (live.launchFill >= 1 && !sent.current) {
          sent.current = true;
          send({ type: 'launch' });
        }
      }
      if (ring.current) ring.current.style.strokeDashoffset = String(RING_C * (1 - (stage === 'hold' ? live.launchFill : stage === 'checks' ? 0 : 1)));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stage, rules, send]);

  const locked = stage === 'checks';
  return (
    <>
      {stage === 'countdown' && launch.count > 0 && (
        <div key={launch.count} className={styles.countdown} aria-live="assertive">
          {launch.count}
        </div>
      )}
      {stage === 'liftoff' && (
        <div className={`${styles.countdown} ${styles.liftoff}`} aria-live="assertive">
          {band === 'tiny' ? 'WHOOSH! 🚀' : 'LIFTOFF! 🚀'}
        </div>
      )}
      <div className={styles.dock}>
        <div className={styles.column}>
          {checks.length > 0 && (
            <div className={styles.checks} role="group" aria-label="Launch checks">
              {shown.map((c) => {
                const isDone = launch.done.includes(c.id);
                const step = launch.done.indexOf(c.id) + 1;
                const wiggle = launch.wiggle.id === c.id;
                return (
                  <button
                    key={wiggle ? `${c.id}-${launch.wiggle.n}` : c.id}
                    type="button"
                    data-testid={`check-${c.id}`}
                    className={`${styles.check} ${isDone ? styles.checkDone : ''} ${launch.assist === c.id ? styles.assist : ''} ${wiggle ? styles.wiggle : ''}`}
                    aria-pressed={isDone}
                    disabled={isDone || stage !== 'checks'}
                    onClick={() => send({ type: 'check', id: c.id })}
                  >
                    <span className={`${styles.checkEmoji} emoji`} aria-hidden="true">
                      {c.emoji}
                    </span>
                    <span>{tier(c.label, band)}</span>
                    {rules.ordered && isDone && <span className={styles.orderTag}>{step}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {(stage === 'checks' || stage === 'hold') && (
            <HoldButton
              testId="launch-button"
              label={locked ? 'Launch (finish the checks first)' : 'Hold to launch'}
              disabled={locked}
              className={!locked ? styles.ready : ''}
              ringRef={ring}
              onPress={() => {
                holding.current = true;
                fillAtPress.current = live.launchFill;
              }}
              onRelease={() => {
                holding.current = false;
                releasedAt.current = performance.now();
                // Every press counts at least as one "tap" of fill; holding longer fills more.
                if (stage === 'hold') live.launchFill = Math.max(live.launchFill, tapHold(fillAtPress.current, rules));
              }}
            >
              <span className={`${styles.bigEmoji} emoji`} aria-hidden="true">
                {locked ? '🔒' : '🚀'}
              </span>
              <span>{band === 'tiny' ? 'LAUNCH' : locked ? 'LAUNCH' : 'HOLD'}</span>
            </HoldButton>
          )}
        </div>
      </div>
    </>
  );
}
