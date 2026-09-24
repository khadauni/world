import { AnimatePresence, m } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { speak, stopSpeaking, useIsSpeaking } from '@/core/audio/speech';
import type { GuideCharacter } from '@/core/types';
import { Button } from '@/ui/Button';
import { Guide } from '@/ui/Guide';
import styles from './Hud.module.css';

export interface BubbleSlide {
  readonly kind: 'say' | 'fact';
  readonly text: string;
}

/**
 * The guide's speech bubble — the child's main source of information. Text doubles as captions,
 * is announced to screen readers, and is spoken aloud for pre-readers.
 */
export function GuideBubble({
  guide,
  slide,
  step,
  total,
  autoSpeak,
  rate,
  onNext,
  nextLabel = 'Next',
  nextIcon = '▶',
  extraActions,
  compact = false,
}: {
  guide: GuideCharacter;
  slide: BubbleSlide;
  step: number;
  total: number;
  autoSpeak: boolean;
  rate: number;
  onNext?: () => void;
  nextLabel?: string;
  nextIcon?: ReactNode;
  extraActions?: ReactNode;
  compact?: boolean;
}) {
  const talking = useIsSpeaking();

  useEffect(() => {
    if (autoSpeak) speak(slide.text, { rate });
  }, [slide.text, autoSpeak, rate]);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    if (!onNext) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.isContentEditable)) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext]);

  return (
    <div className={styles.guideRow}>
      <div className={styles.guideAvatar}>
        <Guide look={guide.look} size={compact ? 70 : 96} talking={talking} />
      </div>
      <AnimatePresence mode="wait">
        <m.div
          key={slide.text}
          className={styles.bubble}
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        >
          <div className={styles.bubbleHead}>
            <span className={`${styles.speaker} ${slide.kind === 'fact' ? styles.factTag : ''}`}>
              {slide.kind === 'fact' ? '💡 Did you know?' : guide.name}
            </span>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={talking ? 'Stop reading' : 'Read aloud'}
              aria-pressed={talking}
              onClick={() => (talking ? stopSpeaking() : speak(slide.text, { rate }))}
            >
              <span className="emoji" aria-hidden="true">
                {talking ? '⏹' : '🔊'}
              </span>
            </button>
          </div>
          <p className={styles.bubbleText} aria-live="polite">
            {slide.text}
          </p>
          <div className={styles.bubbleFoot}>
            {total > 1 ? (
              <div className={styles.stepper} aria-label={`Part ${step + 1} of ${total}`}>
                {Array.from({ length: total }, (_, i) => (
                  <span key={i} className={`${styles.step} ${i <= step ? styles.stepOn : ''}`} />
                ))}
              </div>
            ) : (
              <span />
            )}
            <div className={styles.actions}>
              {extraActions}
              {onNext && (
                <NextButton label={nextLabel} icon={nextIcon} onClick={onNext} />
              )}
            </div>
          </div>
        </m.div>
      </AnimatePresence>
    </div>
  );
}

function NextButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <Button tone="grape" onClick={onClick} data-testid="guide-next">
      {label} <span aria-hidden="true">{icon}</span>
    </Button>
  );
}
