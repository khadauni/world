/** Build a per-band value: tiny (3–5), junior (6–8), senior (9–12). */
export function t<T>(tiny: T, junior: T, senior: T): { readonly tiny: T; readonly junior: T; readonly senior: T } {
  return { tiny, junior, senior };
}

/** Everyone sees the question. */
export const ALL = ['tiny', 'junior', 'senior'] as const;
export const TINY = ['tiny'] as const;
export const JUNIOR = ['junior'] as const;
export const SENIOR = ['senior'] as const;
export const JUNIOR_SENIOR = ['junior', 'senior'] as const;
export const TINY_JUNIOR = ['tiny', 'junior'] as const;
