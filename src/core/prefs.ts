import { useSyncExternalStore } from 'react';
import { QUALITY, detectTier } from './quality';
import { useApp } from './store';
import type { QualityProfile } from './types';

const motionQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      motionQuery?.addEventListener('change', cb);
      return () => motionQuery?.removeEventListener('change', cb);
    },
    () => motionQuery?.matches ?? false,
    () => false,
  );
}

/** Honour the parent's setting first, then the OS "reduce motion" preference. */
export function useReducedMotion(): boolean {
  const setting = useApp((s) => s.settings.reducedMotion);
  const system = useSystemReducedMotion();
  return setting === 'on' ? true : setting === 'off' ? false : system;
}

const autoTier = detectTier();
export function useQualityProfile(): QualityProfile {
  const q = useApp((s) => s.settings.quality);
  return QUALITY[q === 'auto' ? autoTier : q];
}
export function autoQualityTier() {
  return autoTier;
}
