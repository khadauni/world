import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_PROFILES } from './sanitize';
import { DEFAULT_SETTINGS, countStars, defaultState, parsePersisted, useApp } from './store';

beforeEach(() => {
  useApp.getState().resetEverything();
});

describe('parsePersisted (untrusted input)', () => {
  it('falls back to defaults on garbage', () => {
    expect(parsePersisted(null)).toEqual(defaultState());
    expect(parsePersisted('not json')).toEqual(defaultState());
    expect(parsePersisted('{"v":2}')).toEqual(defaultState());
    expect(parsePersisted('[]')).toEqual(defaultState());
  });

  it('drops invalid profiles, progress and settings values', () => {
    const raw = JSON.stringify({
      v: 1,
      activeId: 'ghost',
      profiles: [
        { id: 'p_1', name: 'Mia', avatar: 'fox', band: 'junior', createdAt: 1 },
        { id: 'bad id!', name: 'X', avatar: 'fox', band: 'junior' },
        { id: 'p_2', name: '', avatar: 'fox', band: 'junior' },
        { id: 'p_3', name: 'Leo', avatar: 'dragon', band: 'teen' },
        { id: 'p_1', name: 'Dupe', avatar: 'fox', band: 'tiny' },
      ],
      progress: {
        p_1: {
          worlds: {
            'solar-system': { stops: { sun: { stars: 3, at: 5 }, mars: { stars: 9 }, venus: { stars: 0 }, 'bad key!': { stars: 2 } }, badgeAt: 7 },
            '../evil': { stops: {} },
          },
          playLog: { '2026-09-01': 120, nope: 5, '2026-09-02': -4 },
        },
      },
      settings: { sound: 'yes', narration: false, speechRate: 99, quality: 'ultra', reducedMotion: 'on', breakMinutes: 7 },
    });
    const s = parsePersisted(raw);
    expect(s.profiles.map((p) => p.id)).toEqual(['p_1']);
    expect(s.activeId).toBeNull();
    const w = s.progress.p_1?.worlds['solar-system'];
    expect(w?.stops).toEqual({ sun: { stars: 3, at: 5 }, mars: { stars: 3, at: 0 } });
    expect(w?.badgeAt).toBe(7);
    expect(s.progress.p_1?.worlds['../evil']).toBeUndefined();
    expect(s.progress.p_1?.playLog).toEqual({ '2026-09-01': 120, '2026-09-02': 0 });
    expect(s.settings).toEqual({ ...DEFAULT_SETTINGS, narration: false, speechRate: 1.4, reducedMotion: 'on' });
  });
});

describe('store actions', () => {
  it('creates profiles, sanitises names and caps the count', () => {
    const p = useApp.getState().createProfile({ name: ' <Mia> ', avatar: 'panda', band: 'tiny' });
    expect(p?.name).toBe('Mia');
    expect(useApp.getState().activeId).toBe(p?.id);
    for (let i = 0; i < MAX_PROFILES + 3; i++) useApp.getState().createProfile({ name: `Kid ${i}`, avatar: 'fox', band: 'junior' });
    expect(useApp.getState().profiles).toHaveLength(MAX_PROFILES);
    expect(useApp.getState().createProfile({ name: '   ', avatar: 'fox', band: 'junior' })).toBeNull();
  });

  it('keeps the best star count per stop and awards badges once', () => {
    useApp.getState().createProfile({ name: 'Leo', avatar: 'fox', band: 'senior' });
    const { recordStop, awardBadge } = useApp.getState();
    recordStop('solar-system', 'mars', 3);
    recordStop('solar-system', 'mars', 1);
    recordStop('solar-system', 'venus', 2);
    const id = useApp.getState().activeId as string;
    const rec = useApp.getState().progress[id]?.worlds['solar-system'];
    expect(rec?.stops.mars?.stars).toBe(3);
    expect(rec && countStars(rec)).toBe(5);
    awardBadge('solar-system');
    const first = useApp.getState().progress[id]?.worlds['solar-system']?.badgeAt;
    awardBadge('solar-system');
    expect(useApp.getState().progress[id]?.worlds['solar-system']?.badgeAt).toBe(first);
  });

  it('ignores writes with no active explorer or unsafe ids', () => {
    useApp.getState().recordStop('solar-system', 'mars', 3);
    expect(useApp.getState().progress).toEqual({});
    useApp.getState().createProfile({ name: 'Ada', avatar: 'owl', band: 'junior' });
    useApp.getState().recordStop('__proto__/x', 'mars', 3);
    const id = useApp.getState().activeId as string;
    expect(Object.keys(useApp.getState().progress[id]?.worlds ?? {})).toEqual([]);
  });

  it('deleting a profile removes its data', () => {
    const p = useApp.getState().createProfile({ name: 'Ada', avatar: 'owl', band: 'junior' });
    useApp.getState().recordStop('solar-system', 'sun', 2);
    useApp.getState().deleteProfile(p?.id as string);
    expect(useApp.getState().profiles).toHaveLength(0);
    expect(useApp.getState().progress).toEqual({});
    expect(useApp.getState().activeId).toBeNull();
  });

  it('validates settings patches', () => {
    useApp.getState().updateSettings({ speechRate: 0.1, quality: 'low' });
    expect(useApp.getState().settings.speechRate).toBe(0.6);
    expect(useApp.getState().settings.quality).toBe('low');
  });
});
