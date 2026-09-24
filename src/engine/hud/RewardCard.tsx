import { motion } from 'motion/react';
import { useEffect } from 'react';
import { playSfx } from '@/core/audio/sfx';
import { speak } from '@/core/audio/speech';
import { Button } from '@/ui/Button';
import { Stars } from '@/ui/Stars';
import styles from './Hud.module.css';

const CHEERS: Record<1 | 2 | 3, string[]> = {
  1: ['Well done!', 'You did it!', 'Great exploring!'],
  2: ['Super job!', 'Brilliant!', 'Fantastic!'],
  3: ['WOW! Perfect!', 'Superstar!', 'Out of this world!'],
};

export function RewardCard({
  stars,
  stopTitle,
  name,
  nextTitle,
  autoSpeak,
  rate,
  onNext,
  onMap,
  seed,
}: {
  stars: 1 | 2 | 3;
  stopTitle: string;
  name: string;
  nextTitle: string | null;
  autoSpeak: boolean;
  rate: number;
  onNext: () => void;
  onMap: () => void;
  seed: number;
}) {
  const options = CHEERS[stars];
  const cheer = options[seed % options.length] as string;

  useEffect(() => {
    const timers = Array.from({ length: stars }, (_, i) => setTimeout(() => playSfx('star'), 350 + i * 280));
    if (autoSpeak) speak(`${cheer} ${name}, you finished ${stopTitle}!`, { rate });
    return () => timers.forEach(clearTimeout);
  }, [stars, cheer, name, stopTitle, autoSpeak, rate]);

  return (
    <div className={styles.center}>
      <motion.div
        className={styles.rewardCard}
        role="dialog"
        aria-label="Stop complete"
        initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        data-testid="reward-card"
      >
        <h2 className={styles.rewardTitle}>{cheer}</h2>
        <Stars value={stars} size="3.2rem" animate />
        <p className={styles.rewardSub}>
          {name}, you finished <strong>{stopTitle}</strong>!
        </p>
        <div className={styles.rewardActions}>
          <Button tone="paper" onClick={onMap} icon="🗺️">
            Map
          </Button>
          <Button tone="leaf" size="l" onClick={onNext} data-autofocus data-testid="reward-next">
            {nextTitle ? `Next: ${nextTitle}` : 'Continue'} <span aria-hidden="true">➜</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
