import styles from './Stars.module.css';

export function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z"
        fill={filled ? '#FFC93C' : 'rgba(255,255,255,0.18)'}
        stroke={filled ? '#E8A200' : 'rgba(255,255,255,0.35)'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {filled && <path d="M9 8.8l1.6-.3.9-1.9" stroke="#fff6cf" strokeWidth="1.4" strokeLinecap="round" fill="none" />}
    </svg>
  );
}

export function Stars({
  value,
  max = 3,
  size = '1.4rem',
  animate = false,
  label,
}: {
  value: number;
  max?: number;
  size?: string;
  animate?: boolean;
  label?: string;
}) {
  return (
    <span className={styles.row} style={{ fontSize: size }} role="img" aria-label={label ?? `${value} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={animate && i < value ? styles.pop : undefined} style={animate ? { animationDelay: `${0.25 + i * 0.28}s` } : undefined}>
          <StarIcon filled={i < value} className={styles.star} />
        </span>
      ))}
    </span>
  );
}
