import { motion } from 'motion/react';
import { useApp, countStars, type Profile } from '@/core/store';
import { BANDS, tier } from '@/core/tier';
import { useReducedMotion } from '@/core/prefs';
import { AvatarBadge } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { SkyBackground } from '@/ui/SkyBackground';
import { Stars } from '@/ui/Stars';
import { WorldArt } from '@/ui/WorldArt';
import { WORLDS, preloadWorld } from '@/worlds/registry';
import { navigate } from '../router';
import styles from './Screens.module.css';

/** The world picker — every world is a glowing portal card with the explorer's progress. */
export function Hub({ profile }: { profile: Profile }) {
  const progress = useApp((s) => s.progress[profile.id]);
  const setActive = useApp((s) => s.setActive);
  const reduced = useReducedMotion();
  const band = profile.band;
  const earned = WORLDS.filter((w) => progress?.worlds[w.id]?.badgeAt);

  return (
    <main className={styles.page} data-band={band}>
      <SkyBackground />
      <header className={styles.hubHead}>
        <AvatarBadge avatar={profile.avatar} size={72} />
        <div className={styles.hello}>
          <h1 className={styles.h1} style={{ fontSize: 'clamp(1.8rem,5vw,2.8rem)' }}>
            Hi, {profile.name}!
          </h1>
          <p className={styles.lead}>
            {BANDS[band].emoji} {BANDS[band].label} · Where shall we go today?
          </p>
        </div>
        <div className={styles.row}>
          <Button
            tone="ghost"
            size="s"
            icon="👥"
            onClick={() => {
              setActive(null);
              navigate({ name: 'home' });
            }}
            data-testid="switch-explorer"
          >
            Switch
          </Button>
          <Button tone="ghost" size="s" icon="🔐" onClick={() => navigate({ name: 'parents' })}>
            Grown-ups
          </Button>
        </div>
      </header>

      <section aria-labelledby="worlds-title" style={{ display: 'grid', gap: 16 }}>
        <h2 id="worlds-title" className={styles.h2}>
          Choose a world
        </h2>
        <div className={styles.worldGrid}>
          {WORLDS.map((w, i) => {
            const rec = progress?.worlds[w.id];
            const stars = rec ? countStars(rec) : 0;
            const max = w.stopCount * 3;
            const live = w.status === 'live';
            return (
              <motion.button
                key={w.id}
                type="button"
                className={`${styles.worldCard} ${live ? '' : styles.soon}`}
                style={{ ['--from' as string]: w.palette.from, ['--to' as string]: w.palette.to, ['--accent' as string]: w.palette.accent }}
                disabled={!live}
                initial={reduced ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : i * 0.07, type: 'spring', stiffness: 260, damping: 24 }}
                onPointerEnter={() => live && preloadWorld(w.id)}
                onFocus={() => live && preloadWorld(w.id)}
                onClick={() => live && navigate({ name: 'world', worldId: w.id })}
                aria-label={live ? `${w.title}. ${tier(w.tagline, band)}${stars ? ` ${stars} of ${max} stars.` : ''}` : `${w.title}, coming soon`}
                data-testid={`world-${w.id}`}
              >
                <div className={styles.worldArt}>
                  <WorldArt id={w.id} emoji={w.emoji} />
                  {rec?.badgeAt && (
                    <span className={`${styles.badgeMark} emoji`} aria-hidden="true">
                      🏅
                    </span>
                  )}
                  {!live && <span className={styles.soonTag}>COMING SOON</span>}
                </div>
                <div className={styles.worldBody}>
                  <span className={styles.subject}>{w.subject}</span>
                  <h3 className={styles.worldTitle}>{w.title}</h3>
                  <p className={styles.tagline}>{tier(w.tagline, band)}</p>
                  {live && (
                    <div className={styles.worldMeta}>
                      <div className={styles.meter} aria-hidden="true">
                        <div className={styles.meterFill} style={{ width: `${max ? Math.round((stars / max) * 100) : 0}%` }} />
                      </div>
                      <Stars value={Math.round((stars / Math.max(1, max)) * 3)} size="1.1rem" label={`${stars} of ${max} stars`} />
                      <span className={styles.playBadge} aria-hidden="true">
                        ▶
                      </span>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="badges-title" style={{ display: 'grid', gap: 12 }}>
        <h2 id="badges-title" className={styles.h2}>
          My badges
        </h2>
        <div className={`${styles.glass} ${styles.shelf}`}>
          {WORLDS.filter((w) => w.status === 'live').map((w) => {
            const has = earned.includes(w);
            return (
              <div key={w.id} className={styles.shelfItem}>
                <span className={`${styles.shelfMedal} ${has ? '' : styles.shelfEmpty} emoji`} aria-hidden="true">
                  {w.emoji}
                </span>
                <span>{has ? w.title : '???'}</span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
