import { create } from 'zustand';
import { BRAND } from '@/config/brand';
import { makeId } from './random';
import {
  MAX_PROFILES,
  clampInt,
  isAgeBand,
  isAvatarId,
  isSafeId,
  sanitizeName,
} from './sanitize';
import { safeStorage } from './storage';
import type { AgeBand, QualityTier } from './types';

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface Profile {
  readonly id: string;
  readonly name: string;
  readonly avatar: string;
  readonly band: AgeBand;
  readonly createdAt: number;
}

export interface StopRecord {
  readonly stars: 1 | 2 | 3;
  readonly at: number;
}

export interface WorldRecord {
  readonly stops: Readonly<Record<string, StopRecord>>;
  readonly badgeAt?: number;
  readonly lastPlayedAt?: number;
}

export interface ProfileProgress {
  readonly worlds: Readonly<Record<string, WorldRecord>>;
  /** Seconds of play per local day (YYYY-MM-DD), last 30 days — shown to parents. */
  readonly playLog: Readonly<Record<string, number>>;
}

export type BreakMinutes = 0 | 15 | 20 | 30 | 45 | 60;
export const BREAK_OPTIONS: readonly BreakMinutes[] = [0, 15, 20, 30, 45, 60];

export interface Settings {
  readonly sound: boolean;
  readonly narration: boolean;
  /** Multiplier on the band's default speech rate. */
  readonly speechRate: number;
  readonly quality: 'auto' | QualityTier;
  readonly reducedMotion: 'auto' | 'on' | 'off';
  /** Friendly "time for a break" reminder after this many minutes of continuous play (0 = off). */
  readonly breakMinutes: BreakMinutes;
}

export interface PersistedState {
  readonly v: 1;
  readonly profiles: readonly Profile[];
  readonly activeId: string | null;
  readonly progress: Readonly<Record<string, ProfileProgress>>;
  readonly settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  narration: true,
  speechRate: 1,
  quality: 'auto',
  reducedMotion: 'auto',
  breakMinutes: 30,
};

export const EMPTY_PROGRESS: ProfileProgress = { worlds: {}, playLog: {} };

export function defaultState(): PersistedState {
  return { v: 1, profiles: [], activeId: null, progress: {}, settings: DEFAULT_SETTINGS };
}

// ---------------------------------------------------------------------------
// Validation — persisted data is untrusted input (could be corrupted, old, or hand-edited).
// ---------------------------------------------------------------------------

const MAX_DAYS = 30;
const MAX_STOPS_PER_WORLD = 64;
const MAX_WORLDS = 64;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return DEFAULT_SETTINGS;
  const quality = raw.quality;
  const motion = raw.reducedMotion;
  const breakMinutes = BREAK_OPTIONS.includes(raw.breakMinutes as BreakMinutes)
    ? (raw.breakMinutes as BreakMinutes)
    : DEFAULT_SETTINGS.breakMinutes;
  return {
    sound: typeof raw.sound === 'boolean' ? raw.sound : DEFAULT_SETTINGS.sound,
    narration: typeof raw.narration === 'boolean' ? raw.narration : DEFAULT_SETTINGS.narration,
    speechRate:
      typeof raw.speechRate === 'number' && Number.isFinite(raw.speechRate)
        ? Math.min(1.4, Math.max(0.6, raw.speechRate))
        : DEFAULT_SETTINGS.speechRate,
    quality: quality === 'low' || quality === 'medium' || quality === 'high' || quality === 'auto' ? quality : 'auto',
    reducedMotion: motion === 'on' || motion === 'off' || motion === 'auto' ? motion : 'auto',
    breakMinutes,
  };
}

function parseProfile(raw: unknown): Profile | null {
  if (!isRecord(raw)) return null;
  const name = sanitizeName(raw.name);
  if (!isSafeId(raw.id) || !name || !isAgeBand(raw.band)) return null;
  return {
    id: raw.id,
    name,
    avatar: isAvatarId(raw.avatar) ? raw.avatar : 'fox',
    band: raw.band,
    createdAt: clampInt(raw.createdAt, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

function parseWorldRecord(raw: unknown): WorldRecord | null {
  if (!isRecord(raw)) return null;
  const stops: Record<string, StopRecord> = {};
  if (isRecord(raw.stops)) {
    for (const [stopId, rec] of Object.entries(raw.stops).slice(0, MAX_STOPS_PER_WORLD)) {
      if (!isSafeId(stopId) || !isRecord(rec)) continue;
      if (typeof rec.stars !== 'number' || !(rec.stars >= 1)) continue;
      const stars = clampInt(rec.stars, 1, 3, 1);
      stops[stopId] = { stars: stars as 1 | 2 | 3, at: clampInt(rec.at, 0, Number.MAX_SAFE_INTEGER, 0) };
    }
  }
  const out: { stops: Record<string, StopRecord>; badgeAt?: number; lastPlayedAt?: number } = { stops };
  if (typeof raw.badgeAt === 'number') out.badgeAt = clampInt(raw.badgeAt, 0, Number.MAX_SAFE_INTEGER, 0);
  if (typeof raw.lastPlayedAt === 'number') out.lastPlayedAt = clampInt(raw.lastPlayedAt, 0, Number.MAX_SAFE_INTEGER, 0);
  return out;
}

function parseProgress(raw: unknown): ProfileProgress {
  if (!isRecord(raw)) return EMPTY_PROGRESS;
  const worlds: Record<string, WorldRecord> = {};
  if (isRecord(raw.worlds)) {
    for (const [worldId, rec] of Object.entries(raw.worlds).slice(0, MAX_WORLDS)) {
      if (!isSafeId(worldId)) continue;
      const parsed = parseWorldRecord(rec);
      if (parsed) worlds[worldId] = parsed;
    }
  }
  const playLog: Record<string, number> = {};
  if (isRecord(raw.playLog)) {
    const days = Object.keys(raw.playLog).filter((d) => DAY_KEY.test(d)).sort().slice(-MAX_DAYS);
    for (const d of days) playLog[d] = clampInt(raw.playLog[d], 0, 86_400, 0);
  }
  return { worlds, playLog };
}

export function parsePersisted(json: string | null): PersistedState {
  if (!json) return defaultState();
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return defaultState();
  }
  if (!isRecord(raw) || raw.v !== 1) return defaultState();
  const profiles: Profile[] = [];
  if (Array.isArray(raw.profiles)) {
    for (const p of raw.profiles) {
      const parsed = parseProfile(p);
      if (parsed && !profiles.some((x) => x.id === parsed.id)) profiles.push(parsed);
      if (profiles.length >= MAX_PROFILES) break;
    }
  }
  const progress: Record<string, ProfileProgress> = {};
  if (isRecord(raw.progress)) {
    for (const p of profiles) progress[p.id] = parseProgress(raw.progress[p.id]);
  }
  const activeId = typeof raw.activeId === 'string' && profiles.some((p) => p.id === raw.activeId) ? raw.activeId : null;
  return { v: 1, profiles, activeId, progress, settings: parseSettings(raw.settings) };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export function localDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface AppStore extends PersistedState {
  createProfile(input: { name: string; avatar: string; band: AgeBand }): Profile | null;
  updateProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'avatar' | 'band'>>): void;
  deleteProfile(id: string): void;
  setActive(id: string | null): void;
  recordStop(worldId: string, stopId: string, stars: 1 | 2 | 3): void;
  awardBadge(worldId: string): void;
  touchWorld(worldId: string): void;
  addPlaySeconds(seconds: number): void;
  updateSettings(patch: Partial<Settings>): void;
  resetProgress(profileId: string): void;
  resetEverything(): void;
}

function withProgress(
  state: PersistedState,
  profileId: string | null,
  fn: (p: ProfileProgress) => ProfileProgress,
): Partial<PersistedState> {
  if (!profileId || !state.profiles.some((p) => p.id === profileId)) return {};
  const current = state.progress[profileId] ?? EMPTY_PROGRESS;
  return { progress: { ...state.progress, [profileId]: fn(current) } };
}

function withWorld(p: ProfileProgress, worldId: string, fn: (w: WorldRecord) => WorldRecord): ProfileProgress {
  const current = p.worlds[worldId] ?? { stops: {} };
  return { ...p, worlds: { ...p.worlds, [worldId]: fn(current) } };
}

export const useApp = create<AppStore>()((set, get) => ({
  ...parsePersisted(safeStorage.get(BRAND.storageKey)),

  createProfile({ name, avatar, band }) {
    const state = get();
    const clean = sanitizeName(name);
    if (!clean || state.profiles.length >= MAX_PROFILES || !isAgeBand(band)) return null;
    const profile: Profile = {
      id: makeId('p'),
      name: clean,
      avatar: isAvatarId(avatar) ? avatar : 'fox',
      band,
      createdAt: Date.now(),
    };
    set({
      profiles: [...state.profiles, profile],
      progress: { ...state.progress, [profile.id]: EMPTY_PROGRESS },
      activeId: profile.id,
    });
    return profile;
  },

  updateProfile(id, patch) {
    set((s) => ({
      profiles: s.profiles.map((p) => {
        if (p.id !== id) return p;
        const name = patch.name !== undefined ? sanitizeName(patch.name) || p.name : p.name;
        return {
          ...p,
          name,
          avatar: patch.avatar !== undefined && isAvatarId(patch.avatar) ? patch.avatar : p.avatar,
          band: patch.band !== undefined && isAgeBand(patch.band) ? patch.band : p.band,
        };
      }),
    }));
  },

  deleteProfile(id) {
    set((s) => {
      const progress = { ...s.progress };
      delete progress[id];
      return {
        profiles: s.profiles.filter((p) => p.id !== id),
        progress,
        activeId: s.activeId === id ? null : s.activeId,
      };
    });
  },

  setActive(id) {
    set((s) => ({ activeId: id && s.profiles.some((p) => p.id === id) ? id : null }));
  },

  recordStop(worldId, stopId, stars) {
    if (!isSafeId(worldId) || !isSafeId(stopId)) return;
    set((s) =>
      withProgress(s, s.activeId, (p) =>
        withWorld(p, worldId, (w) => {
          const prev = w.stops[stopId];
          const best = Math.max(prev?.stars ?? 0, stars) as 1 | 2 | 3;
          return { ...w, stops: { ...w.stops, [stopId]: { stars: best, at: Date.now() } } };
        }),
      ),
    );
  },

  awardBadge(worldId) {
    if (!isSafeId(worldId)) return;
    set((s) =>
      withProgress(s, s.activeId, (p) => withWorld(p, worldId, (w) => (w.badgeAt ? w : { ...w, badgeAt: Date.now() }))),
    );
  },

  touchWorld(worldId) {
    if (!isSafeId(worldId)) return;
    set((s) => withProgress(s, s.activeId, (p) => withWorld(p, worldId, (w) => ({ ...w, lastPlayedAt: Date.now() }))));
  },

  addPlaySeconds(seconds) {
    if (!(seconds > 0)) return;
    const day = localDayKey();
    set((s) =>
      withProgress(s, s.activeId, (p) => {
        const log: Record<string, number> = { ...p.playLog, [day]: Math.min(86_400, (p.playLog[day] ?? 0) + Math.round(seconds)) };
        const days = Object.keys(log).sort();
        for (const d of days.slice(0, Math.max(0, days.length - MAX_DAYS))) delete log[d];
        return { ...p, playLog: log };
      }),
    );
  },

  updateSettings(patch) {
    set((s) => ({ settings: parseSettings({ ...s.settings, ...patch }) }));
  },

  resetProgress(profileId) {
    set((s) => (s.profiles.some((p) => p.id === profileId) ? { progress: { ...s.progress, [profileId]: EMPTY_PROGRESS } } : {}));
  },

  resetEverything() {
    set(defaultState());
  },
}));

// Persist (debounced) — only the data fields, never functions.
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function snapshot(s: AppStore): PersistedState {
  return { v: 1, profiles: s.profiles, activeId: s.activeId, progress: s.progress, settings: s.settings };
}
export function flushSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = undefined;
  safeStorage.set(BRAND.storageKey, JSON.stringify(snapshot(useApp.getState())));
}
useApp.subscribe(() => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 250);
});
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSave);
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function useActiveProfile(): Profile | null {
  return useApp((s) => s.profiles.find((p) => p.id === s.activeId) ?? null);
}

const EMPTY_WORLD: WorldRecord = { stops: {} };
export function useWorldRecord(worldId: string): WorldRecord {
  return useApp((s) => (s.activeId ? s.progress[s.activeId]?.worlds[worldId] : undefined) ?? EMPTY_WORLD);
}

export function countStars(record: WorldRecord): number {
  return Object.values(record.stops).reduce((sum, r) => sum + r.stars, 0);
}
