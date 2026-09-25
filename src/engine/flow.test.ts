import { describe, expect, it } from 'vitest';
import type { WorldContent } from '@/core/types';
import { flowReducer, initialFlow, nextStopId, unlockedStops, type FlowState } from './flow';

const content = {
  stops: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
} as unknown as WorldContent;

describe('flowReducer', () => {
  it('runs the full learning loop', () => {
    let s: FlowState = initialFlow;
    s = flowReducer(s, { type: 'START' });
    expect(s.phase).toBe('map');
    s = flowReducer(s, { type: 'SELECT_STOP', stopId: 'a' });
    expect(s).toMatchObject({ phase: 'travel', stopId: 'a', attempt: 1 });
    s = flowReducer(s, { type: 'ARRIVED' });
    expect(s.phase).toBe('explore');
    s = flowReducer(s, { type: 'BEGIN_TASK', hasTask: true });
    expect(s.phase).toBe('task');
    s = flowReducer(s, { type: 'TASK_DONE' });
    expect(s.phase).toBe('quiz');
    s = flowReducer(s, { type: 'QUIZ_DONE', stars: 2 });
    expect(s).toMatchObject({ phase: 'reward', lastStars: 2 });
    s = flowReducer(s, { type: 'CONTINUE', allDone: false, badgeAlreadyEarned: false });
    expect(s).toMatchObject({ phase: 'map', stopId: null });
  });

  it('skips the task when a stop has none and goes to the finale once', () => {
    let s = flowReducer({ ...initialFlow, phase: 'explore', stopId: 'a' }, { type: 'BEGIN_TASK', hasTask: false });
    expect(s.phase).toBe('quiz');
    s = flowReducer({ ...s, phase: 'reward' }, { type: 'CONTINUE', allDone: true, badgeAlreadyEarned: false });
    expect(s.phase).toBe('finale');
    const again = flowReducer({ ...s, phase: 'reward' }, { type: 'CONTINUE', allDone: true, badgeAlreadyEarned: true });
    expect(again.phase).toBe('map');
  });

  it('ignores out-of-order events', () => {
    expect(flowReducer(initialFlow, { type: 'ARRIVED' })).toBe(initialFlow);
    expect(flowReducer(initialFlow, { type: 'TASK_DONE' })).toBe(initialFlow);
    const task = { ...initialFlow, phase: 'task' as const, stopId: 'a' };
    expect(flowReducer(task, { type: 'SELECT_STOP', stopId: 'b' })).toBe(task);
  });
});

describe('shortcuts', () => {
  it('skips to the quiz from the tour or mission and replays tours from the reward', () => {
    const explore = { ...initialFlow, phase: 'explore' as const, stopId: 'a' };
    expect(flowReducer(explore, { type: 'SKIP_TO_QUIZ' }).phase).toBe('quiz');
    expect(flowReducer({ ...explore, phase: 'task' }, { type: 'SKIP_TO_QUIZ' }).phase).toBe('quiz');
    expect(flowReducer({ ...explore, phase: 'map' }, { type: 'SKIP_TO_QUIZ' }).phase).toBe('map');
    const replay = flowReducer({ ...explore, phase: 'reward' }, { type: 'REPLAY_TOUR' });
    expect(replay).toMatchObject({ phase: 'explore', stopId: 'a' });
  });
});

describe('unlocking', () => {
  it('opens stops in order and keeps finished ones open', () => {
    expect([...unlockedStops(content, new Set())]).toEqual(['a']);
    expect([...unlockedStops(content, new Set(['a']))].sort()).toEqual(['a', 'b']);
    expect(nextStopId(content, new Set(['a', 'b']))).toBe('c');
    expect(nextStopId(content, new Set(['a', 'b', 'c']))).toBeNull();
  });
});
