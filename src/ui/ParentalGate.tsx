import { useMemo, useState } from 'react';
import { makeChallenge, numberWords } from '@/core/parentalGate';
import { Button } from './Button';
import { Modal } from './Modal';
import styles from './ParentalGate.module.css';

/** "Grown-ups only" check before settings, resets and the parent dashboard. */
export function ParentalGate({ open, onPass, onCancel }: { open: boolean; onPass: () => void; onCancel: () => void }) {
  const [seed, setSeed] = useState(() => {
    const b = new Uint32Array(1);
    crypto.getRandomValues(b);
    return b[0] ?? 1;
  });
  const [error, setError] = useState(false);
  const c = useMemo(() => makeChallenge(seed), [seed]);

  return (
    <Modal open={open} onClose={onCancel} label="Grown-ups only" width={520}>
      <div className={styles.wrap}>
        <span className="emoji" style={{ fontSize: 48 }} aria-hidden="true">
          🔐
        </span>
        <h2 style={{ color: 'var(--paper-ink)' }}>Grown-ups only</h2>
        <p className={styles.sub}>Please answer to continue.</p>
        <p className={styles.q}>
          What is {numberWords(c.a)} times {numberWords(c.b)}?
        </p>
        <div className={styles.grid}>
          {c.choices.map((n) => (
            <Button
              key={n}
              tone="paper"
              size="l"
              onClick={() => {
                if (n === c.answer) {
                  setError(false);
                  setSeed((s) => s + 1);
                  onPass();
                } else {
                  setError(true);
                  setSeed((s) => s + 7);
                }
              }}
            >
              {n}
            </Button>
          ))}
        </div>
        <p className={styles.err} role="status" aria-live="polite">
          {error ? 'Not quite — here is a new one.' : ''}
        </p>
        <Button tone="ghost" onClick={onCancel} style={{ color: 'var(--paper-ink)', justifySelf: 'center' }}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
