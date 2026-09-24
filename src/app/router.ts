import { useSyncExternalStore } from 'react';

/**
 * Minimal hash router. Hash URLs work on any static host (GitHub Pages sub-paths, CDNs, file previews)
 * with zero server rewrite rules, and the route set is tiny.
 */
export type Route =
  | { name: 'home' }
  | { name: 'hub' }
  | { name: 'world'; worldId: string }
  | { name: 'parents' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  if (path === '/hub') return { name: 'hub' };
  if (path === '/parents') return { name: 'parents' };
  const m = /^\/world\/([a-z0-9-]{1,48})$/.exec(path);
  if (m?.[1]) return { name: 'world', worldId: m[1] };
  return { name: 'home' };
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'hub':
      return '#/hub';
    case 'parents':
      return '#/parents';
    case 'world':
      return `#/world/${route.worldId}`;
  }
}

export function navigate(route: Route, opts: { replace?: boolean } = {}): void {
  const href = hrefFor(route);
  if (opts.replace) {
    history.replaceState(null, '', href);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (location.hash !== href) {
    location.hash = href;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash, () => '');
  return parseHash(hash);
}
