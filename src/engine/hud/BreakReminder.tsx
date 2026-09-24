import { useEffect, useState } from 'react';
import { speak } from '@/core/audio/speech';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';

const IDEAS = [
  { emoji: '🧘', text: 'Stretch up tall like a rocket, then curl up small like a moon!' },
  { emoji: '💧', text: 'Have a sip of water — astronauts need water too!' },
  { emoji: '👀', text: 'Look out of a window at something far away for 20 seconds.' },
  { emoji: '🤸', text: 'Do five star jumps!' },
];

/** Gentle screen-time break set by the parent. The "I'm back" button unlocks after a short pause. */
export function BreakReminder({ open, onResume, autoSpeak, seed }: { open: boolean; onResume: () => void; autoSpeak: boolean; seed: number }) {
  const idea = IDEAS[seed % IDEAS.length] as (typeof IDEAS)[number];
  const [wait, setWait] = useState(15);
  useEffect(() => {
    if (!open) return;
    setWait(15);
    if (autoSpeak) speak(`Time for a little break! ${idea.text}`);
    const t = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => clearInterval(t);
  }, [open, autoSpeak, idea.text]);

  return (
    <Modal open={open} label="Break time" dismissable={false} width={480}>
      <div style={{ display: 'grid', gap: 14, justifyItems: 'center', textAlign: 'center' }}>
        <span className="emoji" style={{ fontSize: 72 }} aria-hidden="true">
          {idea.emoji}
        </span>
        <h2 style={{ color: 'var(--grape-deep)' }}>Break time!</h2>
        <p style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--paper-ink)' }}>{idea.text}</p>
        <Button tone="leaf" size="l" disabled={wait > 0} onClick={onResume}>
          {wait > 0 ? `Back in ${wait}…` : "I'm back! ➜"}
        </Button>
      </div>
    </Modal>
  );
}
