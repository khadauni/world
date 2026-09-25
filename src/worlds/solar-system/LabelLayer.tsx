import type { CSSProperties } from 'react';
import { elements, useLabelStore, type LabelSpec } from './labels';
import styles from './LabelLayer.module.css';

const HIDDEN: CSSProperties = { visibility: 'hidden' };

/** DOM layer for 3D name tags. Positions are written straight to each element by the scene's LabelProjector. */
export function LabelLayer() {
  const labels = useLabelStore((s) => s.labels);
  return (
    <div className={styles.layer} aria-hidden="true">
      {Object.values(labels).map((spec) => (
        <LabelTag key={spec.id} spec={spec} />
      ))}
    </div>
  );
}

function LabelTag({ spec }: { spec: LabelSpec }) {
  const cls = [styles.tag, styles[spec.placement], styles[spec.variant], spec.small ? styles.small : ''].filter(Boolean).join(' ');
  return (
    <div
      className={styles.anchor}
      style={HIDDEN}
      data-label={spec.id}
      ref={(el) => {
        if (!el) return;
        elements.set(spec.id, el);
        return () => {
          if (elements.get(spec.id) === el) elements.delete(spec.id);
        };
      }}
    >
      <div className={cls} style={spec.accent ? ({ ['--accent' as string]: spec.accent } as CSSProperties) : undefined}>
        {spec.emoji && (
          <span className={`${styles.emoji} emoji`} aria-hidden="true">
            {spec.emoji}
          </span>
        )}
        {spec.text}
        {spec.trailing && (
          <span className={`${styles.emoji} emoji`} aria-hidden="true">
            {spec.trailing}
          </span>
        )}
      </div>
    </div>
  );
}
