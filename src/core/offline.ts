/**
 * Registers the offline service worker in production. The page runs under Trusted Types, so the worker URL
 * goes through a tiny named policy that only ever allows our own ./sw.js.
 */
interface TrustedTypesLike {
  createPolicy(name: string, rules: { createScriptURL: (url: string) => string }): { createScriptURL(url: string): unknown };
}

export function registerOfflineSupport(): void {
  if (!import.meta.env.PROD || typeof window === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', () => {
    try {
      const tt = (window as unknown as { trustedTypes?: TrustedTypesLike }).trustedTypes;
      const policy = tt?.createPolicy('wonderverse', {
        createScriptURL: (url) => {
          if (url !== './sw.js') throw new TypeError('Blocked script URL');
          return url;
        },
      });
      const scriptURL = (policy ? policy.createScriptURL('./sw.js') : './sw.js') as string;
      navigator.serviceWorker.register(scriptURL, { scope: './' }).catch(() => undefined);
    } catch {
      /* offline support is a nice-to-have */
    }
  });
}
