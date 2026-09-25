import { useEffect } from 'react';

interface Disposable {
  dispose(): void;
}

function isDisposable(v: unknown): v is Disposable {
  return typeof v === 'object' && v !== null && typeof (v as { dispose?: unknown }).dispose === 'function';
}

/** Dispose every GPU resource found in `value` (a resource, or an array / plain object of them, one level deep). */
export function disposeAll(value: unknown): void {
  if (isDisposable(value)) {
    value.dispose();
    return;
  }
  const items = Array.isArray(value) ? value : typeof value === 'object' && value !== null ? Object.values(value) : [];
  for (const item of items) {
    if (isDisposable(item)) item.dispose();
    else if (typeof item === 'object' && item !== null && isDisposable((item as { geometry?: unknown }).geometry)) (item as { geometry: Disposable }).geometry.dispose();
  }
}

/**
 * Geometries, materials and textures we create ourselves (useMemo) and hand to meshes as props are NOT
 * disposed by R3F on unmount — and three.js keeps uploaded geometries alive until disposed. Call this
 * with the memoised value so it is released when it changes or the component unmounts.
 * (Never use it on the shared, cached heart geometry.)
 */
export function useDisposable<T>(value: T): T {
  useEffect(() => () => disposeAll(value), [value]);
  return value;
}
