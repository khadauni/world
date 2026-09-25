import type { CSSProperties } from 'react';
import { elements, useLabels, type LabelSpec } from './labels';
import styles from './Overlay.module.css';

const HIDDEN: CSSProperties = { visibility: 'hidden' };

/** DOM layer for the world's 3D name tags. Positions are written straight to each node by LabelProjector. */
export function LabelLayer() {
  const labels = useLabels((s) => s.labels);
  return (
    <div className={styles.labelLayer} aria-hidden="true">
      {Object.values(labels).map((spec) => (
        <LabelTag key={spec.id} spec={spec} />
      ))}
    </div>
  );
}

function LabelTag({ spec }: { spec: LabelSpec }) {
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
      <div
        className={`${styles.tag} ${spec.placement && spec.placement !== 'above' ? (styles[spec.placement] ?? '') : ''} ${spec.visible ? styles.tagOn : ''}`}
        style={spec.accent ? ({ ['--accent' as string]: spec.accent } as CSSProperties) : undefined}
      >
        {spec.emoji && (
          <span className={`${styles.tagEmoji} emoji`} aria-hidden="true">
            {spec.emoji}
          </span>
        )}
        {spec.text}
      </div>
    </div>
  );
}
