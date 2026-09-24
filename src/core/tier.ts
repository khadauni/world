import type { AgeBand, Tiered } from './types';

function isTieredRecord<T>(value: Tiered<T>): value is { tiny: T; junior: T; senior: T } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'tiny' in value &&
    'junior' in value &&
    'senior' in value
  );
}

/** Pick the right variant of a tiered value for the child's age band. */
export function tier<T>(value: Tiered<T>, band: AgeBand): T {
  return isTieredRecord(value) ? value[band] : (value as T);
}

export interface BandInfo {
  readonly id: AgeBand;
  readonly label: string;
  readonly ages: string;
  readonly emoji: string;
  readonly blurb: string;
  /** Max quiz questions per stop. */
  readonly quizLength: number;
  /** Default speech rate for narration. */
  readonly speechRate: number;
  /** Narration auto-plays for pre-readers. */
  readonly autoSpeak: boolean;
}

export const BANDS: Readonly<Record<AgeBand, BandInfo>> = {
  tiny: {
    id: 'tiny',
    label: 'Little Explorer',
    ages: '3–5',
    emoji: '🐣',
    blurb: 'Nursery & KG · voice-led, picture choices',
    quizLength: 2,
    speechRate: 0.9,
    autoSpeak: true,
  },
  junior: {
    id: 'junior',
    label: 'Junior Explorer',
    ages: '6–8',
    emoji: '🚀',
    blurb: 'Early readers · short facts, fun tasks',
    quizLength: 3,
    speechRate: 0.95,
    autoSpeak: true,
  },
  senior: {
    id: 'senior',
    label: 'Senior Explorer',
    ages: '9–12',
    emoji: '🔭',
    blurb: 'Big thinkers · real science, challenges',
    quizLength: 4,
    speechRate: 1,
    autoSpeak: false,
  },
};
