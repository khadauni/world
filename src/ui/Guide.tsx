import type { GuideLook } from '@/core/types';
import styles from './Guide.module.css';

const LOOKS: Record<GuideLook, { shell: string; shellDeep: string; visor: string; accent: string; antenna: string }> = {
  astro: { shell: '#F4F6FF', shellDeep: '#C5CCF5', visor: '#1B2466', accent: '#7B61FF', antenna: '#FFC93C' },
  isro: { shell: '#FFFFFF', shellDeep: '#D2D8EE', visor: '#10235A', accent: '#FF9933', antenna: '#FF9933' },
  doc: { shell: '#F2FBFF', shellDeep: '#BFE3F2', visor: '#16345C', accent: '#FF5A7A', antenna: '#FF5A7A' },
};

/**
 * The friendly guide who talks to the child. Pure SVG + CSS animation: crisp at any size,
 * a few hundred bytes, and no image downloads.
 */
export function Guide({ look, size = 96, talking = false }: { look: GuideLook; size?: number; talking?: boolean }) {
  const c = LOOKS[look];
  const id = `g-${look}`;
  return (
    <svg
      viewBox="0 0 120 130"
      width={size}
      height={size * (130 / 120)}
      className={`${styles.guide} ${talking ? styles.talking : ''}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-shell`} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor={c.shell} />
          <stop offset="100%" stopColor={c.shellDeep} />
        </radialGradient>
        <radialGradient id={`${id}-visor`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#3A4AA8" />
          <stop offset="100%" stopColor={c.visor} />
        </radialGradient>
      </defs>

      {/* antenna */}
      <line x1="60" y1="18" x2="60" y2="6" stroke={c.shellDeep} strokeWidth="4" strokeLinecap="round" />
      <circle className={styles.antenna} cx="60" cy="6" r="6" fill={c.antenna} />

      {/* body */}
      <ellipse cx="60" cy="112" rx="26" ry="16" fill={`url(#${id}-shell)`} />
      <ellipse cx="60" cy="110" rx="9" ry="6" fill={c.accent} opacity="0.9" />
      {look === 'doc' && (
        <path d="M60 116c-5-4-9-6-9-10a4 4 0 0 1 9-2 4 4 0 0 1 9 2c0 4-4 6-9 10z" fill="#FF5A7A" stroke="#fff" strokeWidth="1.5" />
      )}

      {/* waving arm */}
      <g className={styles.wave}>
        <path d="M86 106 q14 -6 16 -22" stroke={c.shellDeep} strokeWidth="8" strokeLinecap="round" fill="none" />
        <circle cx="102" cy="82" r="7" fill={`url(#${id}-shell)`} />
      </g>
      <path d="M34 106 q-10 4 -12 14" stroke={c.shellDeep} strokeWidth="8" strokeLinecap="round" fill="none" />

      {/* head */}
      <circle cx="60" cy="58" r="42" fill={`url(#${id}-shell)`} />
      {look === 'isro' && (
        <g>
          <path d="M24 44 a42 42 0 0 1 72 0" stroke="#FF9933" strokeWidth="5" fill="none" />
          <path d="M20 52 a42 42 0 0 1 80 0" stroke="#FFFFFF" strokeWidth="4" fill="none" />
          <path d="M19 60 a42 42 0 0 1 82 0" stroke="#138808" strokeWidth="4" fill="none" opacity="0.9" />
        </g>
      )}
      {look === 'doc' && (
        <g>
          <circle cx="60" cy="20" r="8" fill="#DCEFF7" stroke="#9CC9DC" strokeWidth="2" />
          <circle cx="60" cy="20" r="3.5" fill="#fff" />
        </g>
      )}
      {/* ear pods */}
      <rect x="12" y="50" width="10" height="20" rx="5" fill={c.accent} />
      <rect x="98" y="50" width="10" height="20" rx="5" fill={c.accent} />

      {/* visor */}
      <rect x="26" y="36" width="68" height="48" rx="24" fill={`url(#${id}-visor)`} />
      <path d="M34 46 q10 -8 26 -6" stroke="rgba(255,255,255,0.55)" strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* face */}
      <g className={styles.eyes}>
        <ellipse cx="46" cy="58" rx="6.5" ry="8" fill="#7DF9FF" />
        <ellipse cx="74" cy="58" rx="6.5" ry="8" fill="#7DF9FF" />
        <circle cx="48" cy="55" r="2.2" fill="#fff" />
        <circle cx="76" cy="55" r="2.2" fill="#fff" />
      </g>
      <ellipse cx="37" cy="70" rx="5" ry="3" fill="#FF8FAB" opacity="0.7" />
      <ellipse cx="83" cy="70" rx="5" ry="3" fill="#FF8FAB" opacity="0.7" />
      <path className={styles.mouth} d="M52 70 q8 8 16 0 q-8 3 -16 0z" fill="#7DF9FF" />
    </svg>
  );
}
