import { useEffect, useRef } from 'react';
import type { AgeBand } from '@/core/types';
import { RULES } from '../logic/bands';
import styles from '../Overlay.module.css';
import { live, useMission } from '../store';
import { HoldButton } from './HoldButton';

/**
 * Night stop controls. Step 0: tuck Pragyan in · step 1: HOP (seniors stop a height gauge near 40 cm) ·
 * step 2: tuck Vikram in. The robots can also be tapped directly in 3D.
 */
export function HopControls({ band }: { band: AgeBand }) {
  const night = useMission((s) => s.night);
  const send = useMission((s) => s.send);
  const rules = RULES[band].night;
  const needle = useRef<HTMLDivElement>(null);
  const gauge = rules.hopGauge && night.step === 1;

  useEffect(() => {
    if (!gauge) return;
    let raf = 0;
    const loop = () => {
      if (needle.current) needle.current.style.left = `${(live.gauge / live.gaugeMax) * 100}%`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gauge]);

  const [lo, hi] = live.gaugeWindow;
  return (
    <div className={styles.dock}>
      <div className={styles.column}>
        {gauge && (
          <div className={styles.hopGauge} aria-hidden="true">
            <div className={styles.hopWindow} style={{ left: `${(lo / live.gaugeMax) * 100}%`, width: `${((hi - lo) / live.gaugeMax) * 100}%` }} />
            <div className={styles.hopTicks}>
              <span>0 cm</span>
              <span>20</span>
              <span>40</span>
              <span>60 cm</span>
            </div>
            <div ref={needle} className={styles.hopNeedle} />
          </div>
        )}
        {night.step === 0 && (
          <HoldButton testId="tuck-rover" label="Put Pragyan to sleep" className={`${styles.small} ${styles.ready}`} onPress={() => send({ type: 'tuck', who: 'rover' })}>
            <span className={`${styles.bigEmoji} emoji`} aria-hidden="true">
              😴
            </span>
            <span>Pragyan</span>
          </HoldButton>
        )}
        {night.step === 1 && (
          <HoldButton testId="hop-button" label="Hop" disabled={night.busy} className={night.busy ? '' : styles.ready} onPress={() => send({ type: 'hop' })}>
            <span className={`${styles.bigEmoji} emoji`} aria-hidden="true">
              🦘
            </span>
            <span>HOP!</span>
          </HoldButton>
        )}
        {night.step === 2 && (
          <HoldButton testId="tuck-lander" label="Put Vikram to sleep" disabled={night.busy} className={`${styles.small} ${styles.ready}`} onPress={() => send({ type: 'tuck', who: 'lander' })}>
            <span className={`${styles.bigEmoji} emoji`} aria-hidden="true">
              😴
            </span>
            <span>Vikram</span>
          </HoldButton>
        )}
      </div>
    </div>
  );
}
