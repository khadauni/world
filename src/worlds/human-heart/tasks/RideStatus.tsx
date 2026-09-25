import type { CSSProperties } from 'react';
import type { AgeBand } from '@/core/types';
import type { Place } from '../logic/ride';
import { useHeart } from '../store';
import styles from '../Overlay.module.css';

const PLACE: Record<Place, { tiny: string; other: string; poor: boolean }> = {
  muscle: { tiny: 'Muscle', other: 'Muscle (body)', poor: false },
  'vena-cava': { tiny: 'Big blue tube', other: 'Vena cava', poor: true },
  'right-atrium': { tiny: 'Blue top room', other: 'Right atrium', poor: true },
  tricuspid: { tiny: 'Blue door', other: 'Tricuspid valve', poor: true },
  'right-ventricle': { tiny: 'Blue bottom room', other: 'Right ventricle', poor: true },
  'pulmonary-valve': { tiny: 'Lung door', other: 'Pulmonary valve', poor: true },
  'pulmonary-artery': { tiny: 'Tube to the lungs', other: 'Pulmonary artery', poor: true },
  lungs: { tiny: 'Lungs', other: 'Lungs', poor: true },
  'pulmonary-vein': { tiny: 'Tube from the lungs', other: 'Pulmonary vein', poor: false },
  'left-atrium': { tiny: 'Red top room', other: 'Left atrium', poor: false },
  mitral: { tiny: 'Red door', other: 'Mitral valve', poor: false },
  'left-ventricle': { tiny: 'Red bottom room', other: 'Left ventricle', poor: false },
  'aortic-valve': { tiny: 'Big red door', other: 'Aortic valve', poor: false },
  aorta: { tiny: 'Big red tube', other: 'Aorta', poor: false },
  body: { tiny: 'Body', other: 'Body', poor: false },
};

/** "You are here" chip for the ride, plus the O₂ counter and a big deliver button at the muscle. */
export function RideStatus({ band }: { band: AgeBand }) {
  const ride = useHeart((s) => s.ride);
  const send = useHeart((s) => s.send);
  const p = PLACE[ride.place];
  const name = band === 'tiny' ? p.tiny : p.other;
  return (
    <div className={styles.dock}>
      {ride.stage === 'muscle' && (
        <button type="button" className={styles.chip} style={{ ['--accent' as string]: '#ffb020', minHeight: 64, fontSize: '1.15rem' } as CSSProperties} data-testid="ride-deliver" onClick={() => send({ type: 'ride-deliver' })}>
          <span className={`${styles.chipDot} emoji`} aria-hidden="true">
            💪
          </span>
          {band === 'tiny' ? 'Give air!' : 'Deliver the oxygen!'}
        </button>
      )}
      {ride.stage === 'lungs' && (
        <>
          <div className={styles.place} role="status">
            <span className="emoji" aria-hidden="true">
              🫧
            </span>
            {band === 'tiny' ? 'Pop the air bubbles!' : `O₂ loaded: ${ride.bubbles} / ${ride.goal}`}
          </div>
          <button type="button" className={styles.chip} style={{ ['--accent' as string]: '#4cc9f0' } as CSSProperties} data-testid="ride-bubble" onClick={() => send({ type: 'ride-bubble' })}>
            <span className={`${styles.chipDot} emoji`} aria-hidden="true">
              🫧
            </span>
            {band === 'tiny' ? 'Grab air!' : 'Grab an O₂'}
          </button>
        </>
      )}
      {ride.stage !== 'lungs' && ride.stage !== 'muscle' && ride.stage !== 'done' && (
        <div className={styles.place} role="status" style={{ ['--accent' as string]: p.poor ? '#6f7dff' : '#ff3450' } as CSSProperties}>
          <span className={styles.placeDot} aria-hidden="true" />
          {band === 'tiny' ? name : `You’re in: ${name}`}
        </div>
      )}
    </div>
  );
}
