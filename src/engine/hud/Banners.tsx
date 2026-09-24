import { m } from 'motion/react';
import { useEffect, useState } from 'react';
import { speak } from '@/core/audio/speech';
import { Button } from '@/ui/Button';
import styles from './Hud.module.css';

const HELP_AFTER_MS = 20_000;
const SKIP_AFTER_MS = 35_000;

/** Task instruction + live progress. Offers a hint, then (after a while) a no-shame skip so nobody gets stuck. */
export function TaskBanner({
  instruction,
  hint,
  done,
  total,
  autoSpeak,
  rate,
  storyMode,
  onSkip,
}: {
  instruction: string;
  hint?: string;
  done: number;
  total: number;
  autoSpeak: boolean;
  rate: number;
  storyMode: boolean;
  onSkip: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setElapsed(0);
    setShowHint(false);
    const start = performance.now();
    const t = setInterval(() => setElapsed(performance.now() - start), 1000);
    return () => clearInterval(t);
  }, [instruction]);

  useEffect(() => {
    if (autoSpeak) speak(instruction, { rate });
  }, [instruction, autoSpeak, rate]);

  const canHelp = storyMode || elapsed > HELP_AFTER_MS;
  const canSkip = storyMode || elapsed > SKIP_AFTER_MS || showHint || (canHelp && !hint);

  return (
    <div className={styles.bannerWrap}>
      <m.div
        className={styles.banner}
        role="status"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        data-testid="task-banner"
      >
        <span className="emoji" aria-hidden="true" style={{ fontSize: '1.8rem' }}>
          🎯
        </span>
        <div className={styles.bannerText}>
          <div>{showHint && hint ? hint : instruction}</div>
          {total > 0 && total <= 8 && (
            <div className={styles.progressDots} aria-label={`${done} of ${total} done`}>
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={`${styles.dot} ${i < done ? styles.dotOn : ''}`} />
              ))}
            </div>
          )}
          {total > 8 && (
            <div className={styles.progressBar} aria-label={`${Math.round((done / total) * 100)} percent done`}>
              <div className={styles.progressFill} style={{ width: `${Math.min(100, (done / total) * 100)}%` }} />
            </div>
          )}
        </div>
        {hint && !showHint && (
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Show a hint"
            onClick={() => {
              setShowHint(true);
              speak(hint, { rate });
            }}
          >
            <span className="emoji" aria-hidden="true">
              💡
            </span>
          </button>
        )}
        {canHelp && !canSkip && hint && (
          <Button
            tone="sun"
            size="s"
            onClick={() => {
              setShowHint(true);
              speak(hint, { rate });
            }}
            data-testid="task-help"
          >
            Help me!
          </Button>
        )}
        {canSkip && (
          <Button tone={storyMode ? 'leaf' : 'ghost'} size="s" onClick={onSkip} style={storyMode ? undefined : { color: 'var(--paper-ink)' }} data-testid="task-skip">
            {storyMode ? 'Continue ➜' : 'Skip for now'}
          </Button>
        )}
      </m.div>
    </div>
  );
}

export function TravelBanner({ label, onSkip }: { label: string; onSkip: () => void }) {
  const [canSkip, setCanSkip] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCanSkip(true), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={styles.bannerWrap}>
      <m.div className={styles.banner} role="status" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <span className="emoji" aria-hidden="true" style={{ fontSize: '1.6rem' }}>
          🚀
        </span>
        <span className={styles.bannerText}>{label}</span>
        {canSkip && (
          <Button tone="ghost" size="s" onClick={onSkip} style={{ color: 'var(--paper-ink)' }} aria-label="Skip the flight" data-testid="travel-skip">
            ⏩
          </Button>
        )}
      </m.div>
    </div>
  );
}
