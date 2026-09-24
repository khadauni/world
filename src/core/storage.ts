/**
 * The only place the app touches Web Storage. Every access is wrapped: storage can be missing,
 * full, blocked (private mode / sandboxed iframes) or hold tampered data — the app must keep working.
 * Nothing here ever leaves the device: no cookies, no network, no analytics.
 */
function getStore(): Storage | null {
  try {
    const s = globalThis.localStorage;
    const probe = '__wv_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

let cached: Storage | null | undefined;
function store(): Storage | null {
  if (cached === undefined) cached = getStore();
  return cached;
}

/** Hard cap on what we persist, as a guard against runaway writes. */
const MAX_BYTES = 256 * 1024;

export const safeStorage = {
  get(key: string): string | null {
    try {
      return store()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): boolean {
    if (value.length > MAX_BYTES) return false;
    try {
      store()?.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string): void {
    try {
      store()?.removeItem(key);
    } catch {
      /* ignore */
    }
  },
  available(): boolean {
    return store() !== null;
  },
  /** Test helper. */
  _reset(): void {
    cached = undefined;
  },
};
