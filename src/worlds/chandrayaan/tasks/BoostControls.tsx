import type { AgeBand } from '@/core/types';
import { RULES } from '../logic/bands';
import styles from '../Overlay.module.css';
import { useMission } from '../store';
import { HoldButton } from './HoldButton';

/** BOOST: fire the engine near perigee. Lights up green with "NOW!" inside the zone for little ones (and on assist). */
export function BoostControls({ band }: { band: AgeBand }) {
  const orbit = useMission((s) => s.orbit);
  const send = useMission((s) => s.send);
  const rules = RULES[band].orbit;
  const showNow = orbit.inZone && (rules.alwaysAssist || orbit.assist);
  return (
    <div className={styles.dock}>
      <div className={styles.column}>
        <HoldButton
          testId="boost-button"
          label="Boost the engine"
          className={showNow ? styles.now : ''}
          disabled={orbit.busy}
          onPress={() => send({ type: 'boost' })}
          data={{ zone: orbit.inZone ? 'in' : 'out' }}
        >
          {showNow && <span className={styles.nowTag}>NOW!</span>}
          <span className={`${styles.bigEmoji} emoji`} aria-hidden="true">
            🔥
          </span>
          <span>BOOST</span>
        </HoldButton>
      </div>
    </div>
  );
}
