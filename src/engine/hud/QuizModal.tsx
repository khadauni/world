import { m } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { playSfx } from '@/core/audio/sfx';
import { speak, stopSpeaking } from '@/core/audio/speech';
import { questionSpeech, starsFor } from '@/core/quiz';
import type { AgeBand, GuideCharacter, QuizQuestion } from '@/core/types';
import { Button } from '@/ui/Button';
import { Guide } from '@/ui/Guide';
import { Modal } from '@/ui/Modal';
import { fmt } from '../text';
import styles from './Hud.module.css';

type Status = 'asking' | 'right' | 'oops';

/**
 * Kind, never-punishing quiz: wrong answers get a gentle nudge and another try; pre-readers get the
 * right answer highlighted after one miss. Stars reward first-try answers.
 */
export function QuizModal({
  open,
  questions,
  band,
  name,
  guide,
  autoSpeak,
  rate,
  title,
  onDone,
}: {
  open: boolean;
  questions: readonly QuizQuestion[];
  band: AgeBand;
  name: string;
  guide: GuideCharacter;
  autoSpeak: boolean;
  rate: number;
  title: string;
  onDone: (stars: 1 | 2 | 3) => void;
}) {
  const [index, setIndex] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [misses, setMisses] = useState<readonly string[]>([]);
  const [status, setStatus] = useState<Status>('asking');
  const [shakeKey, setShakeKey] = useState(0);

  const q = questions[index];
  const total = questions.length;

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setFirstTry(0);
    setMisses([]);
    setStatus('asking');
  }, [open, questions]);

  const spoken = useMemo(() => (q ? questionSpeech({ ...q, prompt: fmt(q.prompt, band, name) }, band) : ''), [q, band, name]);

  useEffect(() => {
    if (open && q && autoSpeak && status === 'asking' && misses.length === 0) speak(spoken, { rate });
  }, [open, q, autoSpeak, spoken, rate, status, misses.length]);

  useEffect(() => {
    if (!open && total === 0) return;
    if (open && total === 0) onDone(starsFor(0, 0));
  }, [open, total, onDone]);

  useEffect(() => () => stopSpeaking(), []);

  if (!q) return null;

  const explain = fmt(q.explain, band, name);
  const showHint = band === 'tiny' && misses.length >= 1 && status === 'oops';

  function choose(id: string) {
    if (!q || status === 'right' || misses.includes(id)) return;
    if (id === q.answerId) {
      playSfx('correct');
      if (misses.length === 0) setFirstTry((n) => n + 1);
      setStatus('right');
      if (autoSpeak) speak(`${band === 'tiny' ? 'Yes! ' : 'Correct! '}${explain}`, { rate });
    } else {
      playSfx('wrong');
      setMisses((m) => [...m, id]);
      setStatus('oops');
      setShakeKey((k) => k + 1);
      if (autoSpeak) speak(band === 'tiny' ? 'Oops! Try again!' : 'Nice try! Have another go.', { rate });
    }
  }

  function next() {
    stopSpeaking();
    if (index + 1 >= total) {
      onDone(starsFor(firstTry, total));
      return;
    }
    setIndex((i) => i + 1);
    setMisses([]);
    setStatus('asking');
  }

  return (
    <Modal open={open} label={`Quiz: ${title}`} dismissable={false} width={720}>
      <div className={styles.quizHead}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Guide look={guide.look} size={54} />
          <span className={styles.quizCount}>
            Question {index + 1} of {total}
          </span>
        </div>
        <button type="button" className={styles.iconBtn} aria-label="Read the question aloud" onClick={() => speak(spoken, { rate })}>
          <span className="emoji" aria-hidden="true">
            🔊
          </span>
        </button>
      </div>

      <h2 className={styles.quizPrompt} data-testid="quiz-prompt">
        {fmt(q.prompt, band, name)}
      </h2>

      <m.div key={shakeKey} className={`${styles.choices} ${status === 'oops' ? styles.shake : ''}`} role="group" aria-label="Answers">
        {q.choices.map((c) => {
          const isAnswer = c.id === q.answerId;
          const missed = misses.includes(c.id);
          const cls = [
            styles.choice,
            status === 'right' && isAnswer ? styles.choiceRight : '',
            missed ? styles.choiceWrong : '',
            showHint && isAnswer ? styles.choiceHint : '',
          ].join(' ');
          return (
            <button
              key={c.id}
              type="button"
              className={cls}
              disabled={missed || status === 'right'}
              data-testid={`choice-${c.id}`}
              data-correct={import.meta.env.DEV || import.meta.env.MODE === 'test' ? String(isAnswer) : undefined}
              aria-label={`${fmt(c.label, band, name)}${missed ? ' (not this one)' : ''}${status === 'right' && isAnswer ? ' (correct!)' : ''}`}
              onClick={() => choose(c.id)}
            >
              {c.color && <span className={styles.choiceSwatch} style={{ background: c.color }} aria-hidden="true" />}
              {c.emoji && (
                <span className={`${styles.choiceEmoji} emoji`} aria-hidden="true">
                  {c.emoji}
                </span>
              )}
              <span>{fmt(c.label, band, name)}</span>
            </button>
          );
        })}
      </m.div>

      <div aria-live="polite">
        {status === 'right' && (
          <div className={`${styles.feedback} ${styles.feedbackGood}`}>
            <span className="emoji" aria-hidden="true" style={{ fontSize: '1.6rem' }}>
              🎉
            </span>
            <span>{explain}</span>
          </div>
        )}
        {status === 'oops' && (
          <div className={`${styles.feedback} ${styles.feedbackOops}`}>
            <span className="emoji" aria-hidden="true" style={{ fontSize: '1.6rem' }}>
              🤔
            </span>
            <span>{band === 'tiny' ? 'Oops! Try again — look for the glowing one!' : misses.length >= 2 ? `Hint: ${explain}` : 'Nice try! Have another go.'}</span>
          </div>
        )}
      </div>

      <div className={styles.quizFoot}>
        {status === 'right' && (
          <Button tone="leaf" size="l" onClick={next} data-autofocus data-testid="quiz-next">
            {index + 1 >= total ? 'Finish' : 'Next question'} <span aria-hidden="true">➜</span>
          </Button>
        )}
      </div>
    </Modal>
  );
}
