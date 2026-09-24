import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';
import { BRAND } from '@/config/brand';
import { AVATARS } from '@/core/avatars';
import { playSfx } from '@/core/audio/sfx';
import { speak } from '@/core/audio/speech';
import { MAX_NAME_LENGTH, MAX_PROFILES, sanitizeName } from '@/core/sanitize';
import { useApp } from '@/core/store';
import { BANDS } from '@/core/tier';
import type { AgeBand } from '@/core/types';
import { AvatarBadge } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { SkyBackground } from '@/ui/SkyBackground';
import { navigate } from '../router';
import styles from './Screens.module.css';

export function bandForAge(age: number): AgeBand {
  if (age <= 5) return 'tiny';
  if (age <= 8) return 'junior';
  return 'senior';
}

const AGES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** First screen: a hero for new families, or "Who's exploring today?" for returning ones. */
export function Welcome() {
  const profiles = useApp((s) => s.profiles);
  const setActive = useApp((s) => s.setActive);
  const [mode, setMode] = useState<'hero' | 'create'>('hero');

  if (mode === 'create') return <CreateExplorer onCancel={() => setMode('hero')} />;

  if (!profiles.length) {
    return (
      <main className={styles.hero}>
        <SkyBackground />
        <div className={styles.orbitRow} aria-hidden="true">
          <span className="emoji">🪐</span>
          <span className="emoji">🚀</span>
          <span className="emoji">🌙</span>
          <span className="emoji">❤️</span>
          <span className="emoji">🦕</span>
        </div>
        <h1 className={styles.logo}>{BRAND.name}</h1>
        <p className={styles.lead} style={{ maxWidth: 560 }}>
          Step inside amazing 3D worlds. Fly through space, land on the Moon, and journey inside the human heart!
        </p>
        <Button
          tone="sun"
          size="xl"
          icon="🚀"
          sound="unlock"
          onClick={() => {
            setMode('create');
          }}
          data-testid="start-button"
        >
          Start exploring
        </Button>
        <div className={styles.trust}>
          <span>🧒 Ages 3–12</span>
          <span>🔒 No ads · No tracking</span>
          <span>📴 Your data stays on this device</span>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.center}>
      <SkyBackground />
      <h1 className={styles.h1}>Who’s exploring today?</h1>
      <div className={styles.profiles}>
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.profileBtn}
            onClick={() => {
              playSfx('pop');
              setActive(p.id);
              navigate({ name: 'hub' });
            }}
            data-testid="profile-button"
          >
            <AvatarBadge avatar={p.avatar} size={96} />
            <span>{p.name}</span>
            <span className={styles.profileBand}>{BANDS[p.band].label}</span>
          </button>
        ))}
        {profiles.length < MAX_PROFILES && (
          <button type="button" className={styles.profileBtn} onClick={() => setMode('create')} data-testid="add-profile">
            <span className={`${styles.addOrb} emoji`} aria-hidden="true">
              ➕
            </span>
            <span>New explorer</span>
          </button>
        )}
      </div>
      <Button tone="ghost" size="s" icon="🔐" onClick={() => navigate({ name: 'parents' })}>
        Grown-ups
      </Button>
    </main>
  );
}

function CreateExplorer({ onCancel }: { onCancel: () => void }) {
  const createProfile = useApp((s) => s.createProfile);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[0]?.id ?? 'fox');
  const [age, setAge] = useState<number | null>(null);
  const clean = sanitizeName(name);

  const steps = ['name', 'avatar', 'age'] as const;

  function finish() {
    if (!clean || age === null) return;
    const p = createProfile({ name: clean, avatar, band: bandForAge(age) });
    if (p) {
      playSfx('celebrate');
      navigate({ name: 'hub' });
    }
  }

  return (
    <main className={styles.center}>
      <SkyBackground />
      <div className={styles.card}>
        <div className={styles.stepDots} aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((s, i) => (
            <span key={s} className={`${styles.stepDot} ${i === step ? styles.stepDotOn : ''}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <m.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            style={{ display: 'grid', gap: 18 }}
          >
            {step === 0 && (
              <form
                style={{ display: 'grid', gap: 18 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (clean) setStep(1);
                }}
              >
                <h2 className={styles.h2} style={{ color: 'var(--paper-ink)' }}>
                  What should we call you, explorer?
                </h2>
                <label className="sr-only" htmlFor="explorer-name">
                  Explorer nickname
                </label>
                <input
                  id="explorer-name"
                  className={styles.nameInput}
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH + 8))}
                  maxLength={MAX_NAME_LENGTH + 8}
                  placeholder="Nickname"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  autoFocus
                  data-testid="name-input"
                />
                <p className={styles.note}>🔒 A first name or fun nickname is perfect. It never leaves this device.</p>
                <div className={styles.row} style={{ justifyContent: 'center' }}>
                  <Button tone="paper" onClick={onCancel}>
                    Back
                  </Button>
                  <Button tone="grape" size="l" type="submit" disabled={!clean} data-testid="name-next">
                    Next ▶
                  </Button>
                </div>
              </form>
            )}

            {step === 1 && (
              <>
                <h2 className={styles.h2} style={{ color: 'var(--paper-ink)' }}>
                  Pick your explorer, {clean}!
                </h2>
                <div className={styles.avatarGrid} role="group" aria-label="Avatars">
                  {AVATARS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={styles.avatarPick}
                      aria-pressed={avatar === a.id}
                      aria-label={a.name}
                      onClick={() => {
                        playSfx('pop');
                        setAvatar(a.id);
                      }}
                    >
                      <AvatarBadge avatar={a.id} size={64} />
                      <span aria-hidden="true">{a.name}</span>
                    </button>
                  ))}
                </div>
                <div className={styles.row} style={{ justifyContent: 'center' }}>
                  <Button tone="paper" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button tone="grape" size="l" onClick={() => setStep(2)} data-testid="avatar-next">
                    Next ▶
                  </Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className={styles.h2} style={{ color: 'var(--paper-ink)' }}>
                  How old are you?
                </h2>
                <div className={styles.ageGrid} role="group" aria-label="Your age">
                  {AGES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={styles.ageBtn}
                      aria-pressed={age === n}
                      aria-label={`${n} years old`}
                      onClick={() => {
                        playSfx('pop');
                        setAge(n);
                        speak(`${n}!`);
                      }}
                      data-testid={`age-${n}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {age !== null && (
                  <div className={styles.bandCard}>
                    <span className="emoji" style={{ fontSize: 40 }} aria-hidden="true">
                      {BANDS[bandForAge(age)].emoji}
                    </span>
                    <span>
                      You’re a <strong>{BANDS[bandForAge(age)].label}</strong>! Your worlds will be just right for you.
                    </span>
                  </div>
                )}
                <div className={styles.row} style={{ justifyContent: 'center' }}>
                  <Button tone="paper" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button tone="leaf" size="l" icon="🚀" disabled={age === null} onClick={finish} data-testid="finish-profile">
                    Let’s explore!
                  </Button>
                </div>
              </>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
