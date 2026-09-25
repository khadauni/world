import type { CSSProperties } from 'react';
import { tier } from '@/core/tier';
import type { AgeBand } from '@/core/types';
import { PART_INFO } from '../content/parts';
import { PARTS, PART_SIDE, isValve, type PartId } from '../logic/ids';
import { useHeart } from '../store';
import styles from '../Overlay.module.css';

const SUGGEST: Record<AgeBand, number> = { tiny: 3, junior: 4, senior: 5 };

function accent(id: PartId): string {
  return PART_SIDE[id] === 'right' ? '#5b72ff' : isValve(id) ? '#ffb020' : '#ff3450';
}

/**
 * Heart Lab controls. Pulling: a few friendly "try this part" chips (a tap alternative to hunting in 3D,
 * and a gentle suggestion). Rebuilding: the tray of parts that are out — tap one to snap it back.
 * Seniors rebuild from function clues ("the chamber that pumps blood to the lungs").
 */
export function LabTray({ band }: { band: AgeBand }) {
  const lab = useHeart((s) => s.lab);
  const send = useHeart((s) => s.send);
  if (lab.stage === 'done') return null;

  if (lab.stage === 'pull') {
    const options = PARTS.filter((p) => !lab.out.includes(p)).slice(0, SUGGEST[band]);
    const last = lab.last ? PART_INFO[lab.last] : null;
    return (
      <div className={styles.dock}>
        {last && lab.last && (
          <div key={lab.last} className={styles.promptCard} style={{ ['--accent' as string]: accent(lab.last) } as CSSProperties}>
            <span className={`${styles.promptIcon} emoji`} aria-hidden="true">
              {last.emoji}
            </span>
            <span>
              {tier(last.name, band)}
              <span className={styles.promptMeta}>{tier(last.without, band)}</span>
            </span>
          </div>
        )}
        <div className={styles.tray} aria-label="Parts you can pull out">
          <span className={styles.trayTitle}>{band === 'tiny' ? 'Tap the heart — or a button!' : 'Tap a part on the heart, or pick one:'}</span>
          {options.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.chip}
              style={{ ['--accent' as string]: accent(id) } as CSSProperties}
              data-testid={`lab-pull-${id}`}
              onClick={() => send({ type: 'lab-pull', id })}
            >
              <span className={`${styles.chipDot} emoji`} aria-hidden="true">
                {PART_INFO[id].emoji}
              </span>
              {tier(PART_INFO[id].short, band)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const clue = lab.mode === 'clues' && lab.clue ? PART_INFO[lab.clue].clue : null;
  return (
    <div className={styles.dock}>
      {clue && (
        <div key={lab.clue} className={styles.promptCard} role="status" data-testid="lab-clue">
          <span className={`${styles.promptIcon} emoji`} aria-hidden="true">
            🧩
          </span>
          <span>
            Snap back {clue}.<span className={styles.promptMeta}>Pick the matching part</span>
          </span>
        </div>
      )}
      <div className={`${styles.tray} ${lab.out.length > 5 ? styles.trayCompact : ''}`} aria-label="Parts to put back">
        <span className={styles.trayTitle}>{band === 'tiny' ? 'Put them back! Click!' : 'Tap a part to snap it back in'}</span>
        {lab.out.map((id) => {
          const glow = (lab.mode !== 'clues' && band === 'tiny' && id === lab.out[0]) || (lab.mode === 'clues' && lab.assist && id === lab.clue);
          const wiggle = lab.wiggle.id === id;
          return (
            <button
              key={wiggle ? `${id}-${lab.wiggle.n}` : id}
              type="button"
              className={`${styles.chip} ${glow ? styles.chipGlow : ''} ${wiggle ? styles.chipWiggle : ''}`}
              style={{ ['--accent' as string]: accent(id) } as CSSProperties}
              data-testid={`lab-place-${id}`}
              onClick={() => send({ type: 'lab-place', id })}
            >
              <span className={`${styles.chipDot} emoji`} aria-hidden="true">
                {PART_INFO[id].emoji}
              </span>
              {tier(PART_INFO[id].short, band)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
