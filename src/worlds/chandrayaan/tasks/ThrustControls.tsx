import { useEffect, useRef } from 'react';
import type { AgeBand } from '@/core/types';
import { RULES } from '../logic/bands';
import styles from '../Overlay.module.css';
import { live, useMission } from '../store';
import { HoldButton } from './HoldButton';

/**
 * THRUST: hold to brake Vikram's descent (a quick tap gives a short burst). Seniors get altitude, speed and
 * fuel gauges with a red speed limit; juniors a simple happy/worried speed face; tiny explorers just the button.
 */
export function ThrustControls({ band }: { band: AgeBand }) {
  const rules = RULES[band].landing;
  const landing = useMission((s) => s.landing);
  const setThrust = useMission((s) => s.setThrust);
  const alt = useRef<HTMLDivElement>(null);
  const altText = useRef<HTMLSpanElement>(null);
  const speed = useRef<HTMLDivElement>(null);
  const speedText = useRef<HTMLSpanElement>(null);
  const fuel = useRef<HTMLDivElement>(null);
  const fuelText = useRef<HTMLSpanElement>(null);
  const face = useRef<HTMLSpanElement>(null);
  const maxSpeed = rules.safeSpeed * 4;

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const a = Math.max(0, live.alt);
      const v = Math.max(0, live.speed);
      if (alt.current) alt.current.style.height = `${Math.min(100, (a / live.startAlt) * 100)}%`;
      if (altText.current) altText.current.textContent = `${Math.round(a)} m`;
      if (speed.current) {
        speed.current.style.height = `${Math.min(100, (v / maxSpeed) * 100)}%`;
        speed.current.style.background = v > live.safeSpeed ? 'linear-gradient(to top, #ff6b6b, #ffb199)' : '';
      }
      if (speedText.current) speedText.current.textContent = `${v.toFixed(1)} m/s`;
      if (fuel.current) fuel.current.style.height = `${Math.round(live.fuel * 100)}%`;
      if (fuelText.current) fuelText.current.textContent = `${Math.round(live.fuel * 100)}%`;
      if (face.current) face.current.textContent = v > live.safeSpeed * 1.05 ? '😬' : '🙂';
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      setThrust(false);
    };
  }, [maxSpeed, setThrust]);

  const flying = landing.stage === 'descent' || landing.stage === 'gate';
  const limitPct = (rules.safeSpeed / maxSpeed) * 100;
  return (
    <div className={styles.dock}>
      {rules.gauges && (
        <div className={styles.gauges} aria-hidden="true">
          <div className={styles.gauge}>
            <span className={styles.gaugeLabel}>Altitude</span>
            <div className={styles.bar}>
              <div ref={alt} className={styles.barFill} />
            </div>
            <span ref={altText} className={styles.gaugeValue}>
              0 m
            </span>
          </div>
          <div className={styles.gauge}>
            <span className={styles.gaugeLabel}>Speed ↓</span>
            <div className={styles.bar}>
              <div ref={speed} className={styles.barFill} />
              <div className={styles.barLimit} style={{ bottom: `${limitPct}%` }} />
            </div>
            <span ref={speedText} className={styles.gaugeValue}>
              0 m/s
            </span>
          </div>
          <div className={styles.gauge}>
            <span className={styles.gaugeLabel}>Fuel</span>
            <div className={styles.bar}>
              <div ref={fuel} className={styles.barFill} style={{ background: 'linear-gradient(to top, #ff9933, #ffd27a)' }} />
            </div>
            <span ref={fuelText} className={styles.gaugeValue}>
              100%
            </span>
          </div>
        </div>
      )}
      {band === 'junior' && (
        <div className={styles.gauges} aria-hidden="true">
          <div className={styles.speedDial}>
            <span className={styles.gaugeLabel}>Speed</span>
            <span ref={face} className={`${styles.speedFace} emoji`}>
              🙂
            </span>
            <div className={styles.bar}>
              <div ref={speed} className={styles.barFill} />
              <div className={styles.barLimit} style={{ bottom: `${limitPct}%` }} />
            </div>
          </div>
        </div>
      )}
      <HoldButton
        testId="thrust-button"
        label="Hold to fire the engines"
        disabled={!flying}
        className={landing.holdNow ? styles.now : ''}
        onPress={() => setThrust(true)}
        onRelease={(ms) => {
          setThrust(false);
          // A quick tap still gives a short, useful burst (tap alternative to holding).
          if (ms < 400) live.pulseUntil = performance.now() + 650;
        }}
      >
        {landing.holdNow && <span className={styles.nowTag}>{band === 'tiny' ? 'NOW! Hold!' : 'Brake!'}</span>}
        <span className={`${styles.bigEmoji} emoji`} aria-hidden="true">
          🔥
        </span>
        <span>THRUST</span>
      </HoldButton>
    </div>
  );
}
