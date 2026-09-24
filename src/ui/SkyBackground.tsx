import styles from './SkyBackground.module.css';

/** Pure-CSS animated night sky for the 2D screens (zero JS per frame, GPU-composited). */
export function SkyBackground({ planets = true }: { planets?: boolean }) {
  return (
    <div className={styles.sky} aria-hidden="true">
      <div className={`${styles.layer} ${styles.l1}`} />
      <div className={`${styles.layer} ${styles.l2}`} />
      {planets && (
        <>
          <div className={`${styles.planet} ${styles.p1}`} />
          <div className={`${styles.planet} ${styles.p2}`} />
        </>
      )}
    </div>
  );
}
