import { seededShuffle } from './random';
import { BANDS, tier } from './tier';
import type { AgeBand, QuizQuestion, WorldStop } from './types';

/**
 * Questions for a stop, filtered to the child's band, capped to the band's quiz length,
 * with choices shuffled deterministically per attempt so the answer is never "always the first one".
 */
export function selectQuestions(stop: WorldStop, band: AgeBand, attempt = 0): QuizQuestion[] {
  const pool = stop.quiz.filter((q) => q.bands.includes(band));
  return pool.slice(0, BANDS[band].quizLength).map((q) => ({
    ...q,
    choices: seededShuffle(q.choices, `${q.id}:${attempt}`),
  }));
}

/**
 * Stars for a finished stop: 1 for completing it, +1 if at least half the questions were right first try,
 * +1 for a perfect first-try run. A stop with no questions for the band earns 3 stars on completion.
 */
export function starsFor(firstTryCorrect: number, total: number): 1 | 2 | 3 {
  if (total <= 0) return 3;
  const ratio = firstTryCorrect / total;
  return (1 + (ratio >= 0.5 ? 1 : 0) + (ratio >= 1 ? 1 : 0)) as 1 | 2 | 3;
}

/** Plain text of a question for speech output (prompt + the choices as a list). */
export function questionSpeech(q: QuizQuestion, band: AgeBand): string {
  const choices = q.choices.map((c) => tier(c.label, band)).join(', or ');
  return `${tier(q.prompt, band)} ${choices}?`;
}
