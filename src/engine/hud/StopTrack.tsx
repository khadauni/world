import { useEffect, useRef } from 'react';
import type { StopRecord } from '@/core/store';
import type { AgeBand, WorldStop } from '@/core/types';
import { Stars } from '@/ui/Stars';
import { playSfx } from '@/core/audio/sfx';
import { fmt } from '../text';
import styles from './Hud.module.css';

/** Horizontal "mission track" of stops — the world map in 2D, always reachable and fully keyboard/screen-reader friendly. */
export function StopTrack({
  stops,
  band,
  name,
  records,
  unlocked,
  nextId,
  onSelect,
}: {
  stops: readonly WorldStop[];
  band: AgeBand;
  name: string;
  records: Readonly<Record<string, StopRecord>>;
  unlocked: ReadonlySet<string>;
  nextId: string | null;
  onSelect: (id: string) => void;
}) {
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    nextRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [nextId]);

  return (
    <nav className={styles.track} aria-label="Stops in this world">
      {stops.map((s, i) => {
        const open = unlocked.has(s.id);
        const rec = records[s.id];
        const title = fmt(s.title, band, name);
        const isNext = s.id === nextId;
        return (
          <button
            key={s.id}
            ref={isNext ? nextRef : undefined}
            type="button"
            data-testid={`stop-${s.id}`}
            className={`${styles.chip} ${isNext ? styles.chipNext : ''} ${rec ? styles.chipDone : ''}`}
            style={{ ['--accent' as string]: s.color }}
            disabled={!open}
            aria-label={`${i + 1}. ${title}${rec ? `, ${rec.stars} stars` : open ? '' : ', locked'}${isNext ? ', next stop' : ''}`}
            onClick={() => {
              playSfx('pop');
              onSelect(s.id);
            }}
          >
            <span className={`${styles.chipOrb} emoji`} aria-hidden="true">
              {open ? s.emoji : '🔒'}
            </span>
            <span className={styles.chipName} aria-hidden="true">
              {title}
            </span>
            <span aria-hidden="true">
              <Stars value={rec?.stars ?? 0} size="0.85rem" />
            </span>
          </button>
        );
      })}
    </nav>
  );
}
