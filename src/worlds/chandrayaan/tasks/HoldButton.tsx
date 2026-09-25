import { useRef, useState, type ReactNode, type RefObject } from 'react';
import styles from '../Overlay.module.css';

export const RING_R = 52;
export const RING_C = 2 * Math.PI * RING_R;

/**
 * Big round press-and-hold button (LAUNCH / THRUST / BOOST / HOP). Works with touch, mouse and keyboard
 * (Space/Enter). `onRelease` receives how long it was held, so callers can treat quick taps as an
 * alternative to holding. `ringRef` exposes the progress ring so a rAF loop can animate it without renders.
 */
export function HoldButton({
  testId,
  label,
  disabled = false,
  className = '',
  onPress,
  onRelease,
  ringRef,
  children,
  data,
}: {
  testId: string;
  label: string;
  disabled?: boolean;
  className?: string;
  onPress?: () => void;
  onRelease?: (heldMs: number) => void;
  ringRef?: RefObject<SVGCircleElement | null>;
  children: ReactNode;
  data?: Record<string, string>;
}) {
  const [pressed, setPressed] = useState(false);
  const since = useRef(0);
  const down = useRef(false);

  const press = () => {
    if (disabled || down.current) return;
    down.current = true;
    since.current = performance.now();
    setPressed(true);
    onPress?.();
  };
  const release = () => {
    if (!down.current) return;
    down.current = false;
    setPressed(false);
    onRelease?.(performance.now() - since.current);
  };

  return (
    <button
      type="button"
      aria-label={label}
      data-testid={testId}
      disabled={disabled}
      className={`${styles.big} ${pressed ? styles.bigPressed : ''} ${className}`}
      onPointerDown={(e) => {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic or already-released pointer */
        }
        press();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          press();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') release();
      }}
      onBlur={release}
      onContextMenu={(e) => e.preventDefault()}
      {...(data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [`data-${k}`, v])) : {})}
    >
      {ringRef && (
        <svg className={styles.ring} viewBox="0 0 120 120" aria-hidden="true">
          <circle className={styles.ringTrack} cx="60" cy="60" r={RING_R} />
          <circle ref={ringRef} className={styles.ringFill} cx="60" cy="60" r={RING_R} strokeDasharray={RING_C} strokeDashoffset={RING_C} />
        </svg>
      )}
      <span className={styles.bigInner}>{children}</span>
    </button>
  );
}
