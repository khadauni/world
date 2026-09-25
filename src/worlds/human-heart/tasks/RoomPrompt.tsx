import type { AgeBand } from '@/core/types';
import { useHeart } from '../store';
import styles from '../Overlay.module.css';

/** The current "find this chamber" call-out, big and friendly at the bottom of the screen. */
export function RoomPrompt({ band }: { band: AgeBand }) {
  const rooms = useHeart((s) => s.rooms);
  if (!rooms.prompt || rooms.done) return null;
  return (
    <div className={`${styles.dock} ${styles.dockPassive}`}>
      <div key={rooms.round} className={styles.promptCard} role="status" data-testid="room-prompt">
        <span className={`${styles.promptIcon} emoji`} aria-hidden="true">
          {band === 'tiny' ? '👆' : '🔎'}
        </span>
        <span>
          {rooms.prompt}
          <span className={styles.promptMeta}>
            Room {Math.min(rooms.round + 1, rooms.total)} of {rooms.total}
          </span>
        </span>
      </div>
    </div>
  );
}
