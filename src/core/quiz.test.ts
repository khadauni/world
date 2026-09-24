import { describe, expect, it } from 'vitest';
import { questionSpeech, selectQuestions, starsFor } from './quiz';
import type { QuizQuestion, WorldStop } from './types';

const q = (id: string, bands: QuizQuestion['bands']): QuizQuestion => ({
  id,
  bands,
  prompt: { tiny: 'Tiny?', junior: 'Junior?', senior: 'Senior?' },
  choices: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
  ],
  answerId: 'a',
  explain: 'Because.',
});

const stop: WorldStop = {
  id: 's',
  title: 'S',
  emoji: '⭐',
  color: '#fff',
  narration: ['hi'],
  facts: ['fact'],
  quiz: [q('1', ['tiny', 'junior', 'senior']), q('2', ['junior', 'senior']), q('3', ['senior']), q('4', ['tiny', 'senior']), q('5', ['senior']), q('6', ['senior'])],
};

describe('selectQuestions', () => {
  it('filters by band and caps by band length', () => {
    expect(selectQuestions(stop, 'tiny').map((x) => x.id)).toEqual(['1', '4']);
    expect(selectQuestions(stop, 'junior').map((x) => x.id)).toEqual(['1', '2']);
    expect(selectQuestions(stop, 'senior')).toHaveLength(4);
  });
  it('shuffles choices deterministically per attempt without losing the answer', () => {
    const a1 = selectQuestions(stop, 'senior', 1).map((x) => x.choices.map((c) => c.id).join());
    const a1again = selectQuestions(stop, 'senior', 1).map((x) => x.choices.map((c) => c.id).join());
    expect(a1).toEqual(a1again);
    for (const question of selectQuestions(stop, 'senior', 3)) {
      expect(question.choices.map((c) => c.id).sort()).toEqual(['a', 'b', 'c']);
    }
  });
});

describe('starsFor', () => {
  it('rewards effort and accuracy', () => {
    expect(starsFor(0, 3)).toBe(1);
    expect(starsFor(2, 4)).toBe(2);
    expect(starsFor(3, 3)).toBe(3);
    expect(starsFor(0, 0)).toBe(3);
  });
});

describe('questionSpeech', () => {
  it('reads prompt and choices for pre-readers', () => {
    expect(questionSpeech(q('1', ['tiny']), 'tiny')).toBe('Tiny? A, or B, or C?');
  });
});
