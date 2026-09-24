import type { Tiered, WorldModule } from '@/core/types';

export type WorldStatus = 'live' | 'soon';

export interface WorldMeta {
  readonly id: string;
  readonly title: string;
  readonly subject: string;
  readonly tagline: Tiered<string>;
  readonly emoji: string;
  /** Card gradient + accent. */
  readonly palette: { readonly from: string; readonly to: string; readonly accent: string };
  readonly stopCount: number;
  readonly status: WorldStatus;
  /** Code-split loader — the 3D world is only downloaded when a child opens it (or hovers its card). */
  readonly load?: () => Promise<WorldModule>;
}

export const WORLDS: readonly WorldMeta[] = [
  {
    id: 'solar-system',
    title: 'Solar System Voyage',
    subject: 'Space',
    tagline: {
      tiny: 'Zoom past the Sun and the planets!',
      junior: 'Become an astronaut and visit every planet.',
      senior: 'Pilot your ship across the Solar System and master every world.',
    },
    emoji: '🪐',
    palette: { from: '#2B1B6B', to: '#0B0F2E', accent: '#FFC93C' },
    stopCount: 9,
    status: 'live',
    load: () => import('./solar-system').then((m) => m.default),
  },
  {
    id: 'chandrayaan',
    title: 'Chandrayaan Moon Mission',
    subject: 'Space · India',
    tagline: {
      tiny: 'Fly a rocket to the Moon with India!',
      junior: 'Launch Chandrayaan-3 and land on the Moon.',
      senior: 'Fly ISRO’s Chandrayaan-3 from launch to a soft landing near the lunar south pole.',
    },
    emoji: '🌙',
    palette: { from: '#3A2A10', to: '#0D0B1E', accent: '#FF9933' },
    stopCount: 7,
    status: 'live',
    load: () => import('./chandrayaan').then((m) => m.default),
  },
  {
    id: 'human-heart',
    title: 'Inside the Human Heart',
    subject: 'Human Body',
    tagline: {
      tiny: 'Say hello to your thump-thump heart!',
      junior: 'Shrink down, go inside the heart and take it apart.',
      senior: 'Explore chambers, valves and circulation — then rebuild a working heart.',
    },
    emoji: '❤️',
    palette: { from: '#5A0F2E', to: '#1A0610', accent: '#FF5A7A' },
    stopCount: 7,
    status: 'live',
    load: () => import('./human-heart').then((m) => m.default),
  },
  {
    id: 'dino-valley',
    title: 'Dinosaur Valley',
    subject: 'Earth History',
    tagline: 'Walk with giants from 66 million years ago.',
    emoji: '🦕',
    palette: { from: '#1F4D2B', to: '#0B1E12', accent: '#58CC02' },
    stopCount: 0,
    status: 'soon',
  },
  {
    id: 'ocean-deep',
    title: 'Deep Ocean Dive',
    subject: 'Nature',
    tagline: 'Dive to the glowing creatures of the deep sea.',
    emoji: '🐙',
    palette: { from: '#0B3A5C', to: '#04121F', accent: '#4CC9F0' },
    stopCount: 0,
    status: 'soon',
  },
  {
    id: 'brain-lab',
    title: 'Brain Lab',
    subject: 'Human Body',
    tagline: 'Race along neurons and see how you think.',
    emoji: '🧠',
    palette: { from: '#4A1F6B', to: '#140A22', accent: '#FF8FAB' },
    stopCount: 0,
    status: 'soon',
  },
];

export function worldById(id: string): WorldMeta | undefined {
  return WORLDS.find((w) => w.id === id);
}

const preloaded = new Set<string>();
/** Warm the world's chunk (e.g. on card hover/focus) so entering feels instant. */
export function preloadWorld(id: string): void {
  const w = worldById(id);
  if (!w?.load || preloaded.has(id)) return;
  preloaded.add(id);
  Promise.all([import('@/engine/WorldShell'), w.load()]).catch(() => preloaded.delete(id));
}
