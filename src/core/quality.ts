import type { QualityProfile, QualityTier } from './types';

export const QUALITY: Readonly<Record<QualityTier, QualityProfile>> = {
  low: { tier: 'low', dpr: [0.75, 1], antialias: false, shadows: false, bloom: false, particleScale: 0.3, detail: 0.5 },
  medium: { tier: 'medium', dpr: [1, 1.5], antialias: true, shadows: false, bloom: false, particleScale: 0.6, detail: 0.75 },
  high: { tier: 'high', dpr: [1, 2], antialias: true, shadows: true, bloom: true, particleScale: 1, detail: 1 },
};

interface NavigatorHints {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  userAgent?: string;
  maxTouchPoints?: number;
}

/**
 * Best-guess starting tier from cheap device hints. The canvas then adapts at runtime
 * (PerformanceMonitor lowers the resolution if frames drop), so this only needs to be roughly right.
 */
export function detectTier(nav: NavigatorHints | undefined = typeof navigator !== 'undefined' ? navigator : undefined): QualityTier {
  if (!nav) return 'medium';
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const ua = nav.userAgent ?? '';
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (nav.maxTouchPoints ?? 0) > 1;
  if (cores <= 2 || memory <= 2) return 'low';
  if (mobile || cores <= 4 || memory <= 4) return 'medium';
  return 'high';
}

let webgl: boolean | undefined;
export function hasWebGL(): boolean {
  if (webgl !== undefined) return webgl;
  try {
    const c = document.createElement('canvas');
    webgl = !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    webgl = false;
  }
  return webgl;
}
