import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { playSfx } from '@/core/audio/sfx';
import { speak, stopSpeaking } from '@/core/audio/speech';
import type { GuideCharacter } from '@/core/types';
import { Button } from '@/ui/Button';
import { Guide } from '@/ui/Guide';
import { Modal } from '@/ui/Modal';
import styles from './Hud.module.css';

/** World mastered: badge reveal, a certificate with the explorer's name, and the guide's farewell. */
export function Finale({
  open,
  badgeName,
  badgeEmoji,
  badgeDescription,
  worldTitle,
  name,
  outro,
  guide,
  autoSpeak,
  rate,
  onHub,
  onStay,
}: {
  open: boolean;
  badgeName: string;
  badgeEmoji: string;
  badgeDescription: string;
  worldTitle: string;
  name: string;
  outro: readonly string[];
  guide: GuideCharacter;
  autoSpeak: boolean;
  rate: number;
  onHub: () => void;
  onStay: () => void;
}) {
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLine(0);
    playSfx('celebrate');
  }, [open]);

  const text = outro[line] ?? '';
  useEffect(() => {
    if (open && autoSpeak && text) speak(text, { rate });
  }, [open, autoSpeak, text, rate]);
  useEffect(() => () => stopSpeaking(), []);

  return (
    <Modal open={open} label={`${worldTitle} mastered`} dismissable={false} width={560}>
      <div style={{ display: 'grid', gap: 16, justifyItems: 'center', textAlign: 'center' }} data-testid="finale">
        <motion.div
          className={styles.medal}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 12, delay: 0.2 }}
        >
          <span className="emoji" aria-hidden="true">
            {badgeEmoji}
          </span>
        </motion.div>
        <p style={{ color: 'var(--sun-deep)', fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '0.08em' }}>NEW BADGE</p>
        <h2 style={{ color: 'var(--grape-deep)', fontSize: 'clamp(1.8rem,5vw,2.4rem)' }}>{badgeName}</h2>
        <p className={styles.cert}>
          <strong>{name}</strong> mastered <strong>{worldTitle}</strong>!
        </p>
        <p style={{ color: 'var(--paper-ink-soft)', fontWeight: 700 }}>{badgeDescription}</p>
        {text && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', background: 'var(--paper-2)', padding: 12, borderRadius: 20 }}>
            <Guide look={guide.look} size={56} />
            <p style={{ fontWeight: 700, color: 'var(--paper-ink)' }} aria-live="polite">
              {text}
            </p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {line + 1 < outro.length ? (
            <Button tone="grape" onClick={() => setLine((l) => l + 1)} data-autofocus>
              Next ▶
            </Button>
          ) : (
            <>
              <Button tone="paper" onClick={onStay} icon="🔁">
                Keep exploring
              </Button>
              <Button tone="leaf" size="l" onClick={onHub} icon="🌍" data-autofocus data-testid="finale-hub">
                More worlds
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
