import { useState } from 'react';
import { BRAND } from '@/config/brand';
import { autoQualityTier } from '@/core/prefs';
import { MAX_NAME_LENGTH } from '@/core/sanitize';
import { BREAK_OPTIONS, countStars, localDayKey, useApp, type BreakMinutes, type Profile, type Settings } from '@/core/store';
import { BANDS } from '@/core/tier';
import { AGE_BANDS, type AgeBand } from '@/core/types';
import { AvatarBadge } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { ParentalGate } from '@/ui/ParentalGate';
import { SkyBackground } from '@/ui/SkyBackground';
import { WORLDS } from '@/worlds/registry';
import { navigate } from '../router';
import styles from './Screens.module.css';

/** Grown-ups zone: progress, play time, settings and privacy controls — behind a parental gate. */
export function Parents() {
  const [unlocked, setUnlocked] = useState(false);
  const activeId = useApp((s) => s.activeId);
  const leave = () => navigate(activeId ? { name: 'hub' } : { name: 'home' });

  if (!unlocked) {
    return (
      <main className={styles.center}>
        <SkyBackground planets={false} />
        <ParentalGate open onPass={() => setUnlocked(true)} onCancel={leave} />
      </main>
    );
  }
  return <Dashboard onLeave={leave} />;
}

function Dashboard({ onLeave }: { onLeave: () => void }) {
  const profiles = useApp((s) => s.profiles);
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const resetEverything = useApp((s) => s.resetEverything);
  const [confirmWipe, setConfirmWipe] = useState(false);

  return (
    <main className={styles.page}>
      <SkyBackground planets={false} />
      <header className={styles.spread}>
        <div>
          <h1 className={styles.h1} style={{ fontSize: 'clamp(1.8rem,5vw,2.6rem)' }}>
            Grown-ups zone
          </h1>
          <p className={styles.lead}>Progress, play time and settings for {BRAND.name}.</p>
        </div>
        <Button tone="sun" icon="⬅️" onClick={onLeave} data-testid="parents-exit">
          Back to exploring
        </Button>
      </header>

      <section className={`${styles.glass} ${styles.panel}`} aria-labelledby="kids-title">
        <h2 id="kids-title" className={styles.h2}>
          Explorers
        </h2>
        {profiles.length === 0 && <p className={styles.lead}>No explorers yet — create one from the start screen.</p>}
        {profiles.map((p) => (
          <KidCard key={p.id} profile={p} />
        ))}
      </section>

      <section className={`${styles.glass} ${styles.panel}`} aria-labelledby="settings-title">
        <h2 id="settings-title" className={styles.h2}>
          Settings
        </h2>
        <ToggleField label="Sound effects" help="Gentle clicks, chimes and celebrations." value={settings.sound} onChange={(v) => update({ sound: v })} />
        <ToggleField
          label="Voice narration"
          help="The guide reads everything aloud (uses your device’s built-in voice). Always on for ages 3–8 when enabled."
          value={settings.narration}
          onChange={(v) => update({ narration: v })}
        />
        <SelectField
          label="Voice speed"
          value={String(settings.speechRate)}
          options={[
            ['0.8', 'Slow'],
            ['1', 'Normal'],
            ['1.15', 'Quick'],
          ]}
          onChange={(v) => update({ speechRate: Number(v) })}
        />
        <SelectField
          label="Graphics quality"
          help={`Auto picked “${autoQualityTier()}” for this device. Lower it if the device gets warm or slow.`}
          value={settings.quality}
          options={[
            ['auto', 'Auto'],
            ['low', 'Battery saver'],
            ['medium', 'Balanced'],
            ['high', 'Best'],
          ]}
          onChange={(v) => update({ quality: v as Settings['quality'] })}
        />
        <SelectField
          label="Reduce motion"
          help="Calmer camera moves and fewer animations. Auto follows the device setting."
          value={settings.reducedMotion}
          options={[
            ['auto', 'Auto'],
            ['on', 'On'],
            ['off', 'Off'],
          ]}
          onChange={(v) => update({ reducedMotion: v as Settings['reducedMotion'] })}
        />
        <SelectField
          label="Break reminder"
          help="A friendly stretch break after continuous play."
          value={String(settings.breakMinutes)}
          options={BREAK_OPTIONS.map((m) => [String(m), m === 0 ? 'Off' : `Every ${m} min`] as [string, string])}
          onChange={(v) => update({ breakMinutes: Number(v) as BreakMinutes })}
        />
      </section>

      <section className={`${styles.glass} ${styles.panel}`} aria-labelledby="privacy-title">
        <h2 id="privacy-title" className={styles.h2}>
          Privacy & safety
        </h2>
        <ul className={styles.privacyList}>
          <li>
            <span className="emoji" aria-hidden="true">🔒</span>No accounts, emails or passwords. Nicknames and progress are stored only in this browser.
          </li>
          <li>
            <span className="emoji" aria-hidden="true">🚫</span>No ads, no analytics, no trackers, no cookies, no third-party requests.
          </li>
          <li>
            <span className="emoji" aria-hidden="true">🗣️</span>Narration uses your device’s own speech engine; the microphone and camera are never used.
          </li>
          <li>
            <span className="emoji" aria-hidden="true">🛡️</span>A strict Content-Security-Policy blocks any code or content from outside {BRAND.name}.
          </li>
          <li>
            <span className="emoji" aria-hidden="true">🧒</span>No chat, no links out, no purchases. Settings like these sit behind a grown-ups check.
          </li>
        </ul>
        <div className={`${styles.glass} ${styles.panel} ${styles.dangerZone}`}>
          <div className={styles.spread}>
            <div>
              <p className={styles.fieldLabel}>Delete all data on this device</p>
              <p className={styles.fieldHelp}>Removes every explorer, all progress and settings.</p>
            </div>
            <Button tone="coral" onClick={() => setConfirmWipe(true)}>
              Delete everything
            </Button>
          </div>
        </div>
      </section>

      <Modal open={confirmWipe} onClose={() => setConfirmWipe(false)} label="Delete everything?" width={460}>
        <div style={{ display: 'grid', gap: 16, textAlign: 'center' }}>
          <h2 style={{ color: 'var(--paper-ink)' }}>Delete everything?</h2>
          <p style={{ color: 'var(--paper-ink-soft)', fontWeight: 700 }}>This can’t be undone.</p>
          <div className={styles.row} style={{ justifyContent: 'center' }}>
            <Button tone="paper" onClick={() => setConfirmWipe(false)} data-autofocus>
              Keep
            </Button>
            <Button
              tone="coral"
              onClick={() => {
                resetEverything();
                setConfirmWipe(false);
                navigate({ name: 'home' });
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

function lastDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
    out.push(localDayKey(x));
  }
  return out;
}

function KidCard({ profile }: { profile: Profile }) {
  const progress = useApp((s) => s.progress[profile.id]);
  const updateProfile = useApp((s) => s.updateProfile);
  const resetProgress = useApp((s) => s.resetProgress);
  const deleteProfile = useApp((s) => s.deleteProfile);
  const [confirm, setConfirm] = useState<null | 'reset' | 'delete'>(null);
  const [name, setName] = useState(profile.name);

  const days = lastDays(7);
  const secs = days.map((d) => progress?.playLog[d] ?? 0);
  const maxSecs = Math.max(600, ...secs);
  const weekMinutes = Math.round(secs.reduce((a, b) => a + b, 0) / 60);
  const live = WORLDS.filter((w) => w.status === 'live');

  return (
    <article className={styles.kidRow}>
      <AvatarBadge avatar={profile.avatar} size={72} />
      <div className={styles.kidStats}>
        <div className={styles.spread}>
          <h3 style={{ fontSize: '1.5rem' }}>{profile.name}</h3>
          <div className={styles.row}>
            <label className="sr-only" htmlFor={`band-${profile.id}`}>
              Age group
            </label>
            <select
              id={`band-${profile.id}`}
              className={styles.select}
              value={profile.band}
              onChange={(e) => updateProfile(profile.id, { band: e.target.value as AgeBand })}
            >
              {AGE_BANDS.map((b) => (
                <option key={b} value={b}>
                  {BANDS[b].label} ({BANDS[b].ages})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.statGrid}>
          {live.map((w) => {
            const rec = progress?.worlds[w.id];
            const done = rec ? Object.keys(rec.stops).length : 0;
            return (
              <div key={w.id} className={styles.stat}>
                <span className={styles.statLabel}>
                  <span className="emoji" aria-hidden="true">{w.emoji}</span> {w.title}
                </span>
                <span>
                  {done}/{w.stopCount} stops · {rec ? countStars(rec) : 0}⭐{rec?.badgeAt ? ' · 🏅' : ''}
                </span>
              </div>
            );
          })}
        </div>

        <div className={styles.stat}>
          <span className={styles.statLabel}>Play time, last 7 days — {weekMinutes} min</span>
          <div className={styles.bars} aria-hidden="true">
            {secs.map((s, i) => (
              <div key={days[i]} className={styles.bar} style={{ height: `${Math.max(4, (s / maxSecs) * 100)}%`, opacity: s ? 1 : 0.25 }} />
            ))}
          </div>
          <div className={styles.barLabels} aria-hidden="true">
            {days.map((d) => (
              <span key={d}>{new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
            ))}
          </div>
          <span className="sr-only">
            {days.map((d, i) => `${d}: ${Math.round((secs[i] ?? 0) / 60)} minutes`).join(', ')}
          </span>
        </div>

        <div className={styles.row}>
          <label className="sr-only" htmlFor={`name-${profile.id}`}>
            Nickname
          </label>
          <input
            id={`name-${profile.id}`}
            className={styles.textInput}
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              updateProfile(profile.id, { name });
              setName(useApp.getState().profiles.find((p) => p.id === profile.id)?.name ?? name);
            }}
            autoComplete="off"
          />
          <Button tone="ghost" size="s" onClick={() => setConfirm('reset')}>
            Reset progress
          </Button>
          <Button tone="coral" size="s" onClick={() => setConfirm('delete')}>
            Remove
          </Button>
        </div>
      </div>

      <Modal open={confirm !== null} onClose={() => setConfirm(null)} label="Please confirm" width={440}>
        <div style={{ display: 'grid', gap: 16, textAlign: 'center' }}>
          <h2 style={{ color: 'var(--paper-ink)' }}>
            {confirm === 'delete' ? `Remove ${profile.name}?` : `Reset ${profile.name}’s progress?`}
          </h2>
          <p style={{ color: 'var(--paper-ink-soft)', fontWeight: 700 }}>This can’t be undone.</p>
          <div className={styles.row} style={{ justifyContent: 'center' }}>
            <Button tone="paper" onClick={() => setConfirm(null)} data-autofocus>
              Cancel
            </Button>
            <Button
              tone="coral"
              onClick={() => {
                if (confirm === 'delete') deleteProfile(profile.id);
                else resetProgress(profile.id);
                setConfirm(null);
              }}
            >
              {confirm === 'delete' ? 'Remove' : 'Reset'}
            </Button>
          </div>
        </div>
      </Modal>
    </article>
  );
}

function ToggleField({ label, help, value, onChange }: { label: string; help?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={styles.field}>
      <div>
        <p className={styles.fieldLabel}>{label}</p>
        {help && <p className={styles.fieldHelp}>{help}</p>}
      </div>
      <button type="button" role="switch" aria-checked={value} aria-label={label} className={styles.toggle} onClick={() => onChange(!value)} />
    </div>
  );
}

function SelectField({
  label,
  help,
  value,
  options,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (v: string) => void;
}) {
  const id = `f-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className={styles.field}>
      <div>
        <label className={styles.fieldLabel} htmlFor={id}>
          {label}
        </label>
        {help && <p className={styles.fieldHelp}>{help}</p>}
      </div>
      <select id={id} className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
