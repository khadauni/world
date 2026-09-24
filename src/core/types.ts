import type { ComponentType } from 'react';

/**
 * Age bands drive every piece of content in the platform.
 * - tiny:   Nursery / Pre-K / KG (ages 3–5) — pre-readers: voice first, picture choices, 2–3 options.
 * - junior: Ages 6–8 — short sentences, simple facts, 3 options.
 * - senior: Ages 9–12 — real science vocabulary, numbers, 4 options, harder tasks.
 */
export type AgeBand = 'tiny' | 'junior' | 'senior';

export const AGE_BANDS: readonly AgeBand[] = ['tiny', 'junior', 'senior'];

/**
 * A value that can differ per age band. A plain value applies to every band.
 * Example: `{ tiny: 'The Sun is hot!', junior: 'The Sun is a giant star.', senior: 'The Sun is a G-type star…' }`
 */
export type Tiered<T> = T | { readonly tiny: T; readonly junior: T; readonly senior: T };

export interface QuizChoice {
  readonly id: string;
  readonly label: Tiered<string>;
  /** Big picture shown on the choice card — essential for pre-readers. */
  readonly emoji?: string;
  /** Optional swatch colour (e.g. "tap the RED planet"). */
  readonly color?: string;
}

export interface QuizQuestion {
  readonly id: string;
  /** Which age bands see this question. */
  readonly bands: readonly AgeBand[];
  readonly prompt: Tiered<string>;
  readonly choices: readonly QuizChoice[];
  readonly answerId: string;
  /** Shown (and spoken) after answering — always kind, always teaches. */
  readonly explain: Tiered<string>;
}

/**
 * An interactive task that happens inside the 3D scene (or the world's overlay).
 * `kind` is world-specific (e.g. 'tap-craters', 'land-vikram', 'rebuild-heart');
 * the world's Scene/Overlay interpret it and report progress back through WorldActions.
 */
export interface StopTask {
  readonly kind: string;
  readonly instruction: Tiered<string>;
  readonly hint?: Tiered<string>;
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface WorldStop {
  readonly id: string;
  readonly title: Tiered<string>;
  readonly emoji: string;
  /** Accent colour for chips, rings and highlights (hex). */
  readonly color: string;
  /** Lines the guide says on arrival — one bubble per line. */
  readonly narration: Tiered<readonly string[]>;
  /** "Did you know?" fact cards shown after the narration. */
  readonly facts: Tiered<readonly string[]>;
  readonly task?: StopTask;
  readonly quiz: readonly QuizQuestion[];
}

export interface WorldBadge {
  readonly id: string;
  readonly name: Tiered<string>;
  readonly emoji: string;
  readonly description: Tiered<string>;
}

/** Visual variant of the SVG guide character that talks to the child. */
export type GuideLook = 'astro' | 'isro' | 'doc';

export interface GuideCharacter {
  readonly name: string;
  readonly look: GuideLook;
}

export interface WorldContent {
  readonly id: string;
  readonly guide: GuideCharacter;
  readonly intro: Tiered<readonly string[]>;
  readonly stops: readonly WorldStop[];
  readonly outro: Tiered<readonly string[]>;
  readonly badge: WorldBadge;
}

// ---------------------------------------------------------------------------
// Runtime contract between the platform shell and a world
// ---------------------------------------------------------------------------

export type FlowPhase = 'intro' | 'map' | 'travel' | 'explore' | 'task' | 'quiz' | 'reward' | 'finale';

export type QualityTier = 'low' | 'medium' | 'high';

export interface QualityProfile {
  readonly tier: QualityTier;
  /** Device-pixel-ratio range for the canvas. */
  readonly dpr: readonly [number, number];
  readonly antialias: boolean;
  readonly shadows: boolean;
  readonly bloom: boolean;
  /** Multiply particle / instance counts by this (0.3 low … 1 high). */
  readonly particleScale: number;
  /** Segment multiplier for procedural geometry (0.5 low … 1 high). */
  readonly detail: number;
}

export type SfxName =
  | 'tap'
  | 'pop'
  | 'correct'
  | 'wrong'
  | 'star'
  | 'whoosh'
  | 'celebrate'
  | 'unlock'
  | 'launch'
  | 'beat'
  | 'collect'
  | 'thud';

export interface WorldActions {
  /** Call when the travel animation for the current stop has finished. */
  arrive(): void;
  /** The child tapped a stop in 3D (honoured on the map/intro phases). */
  selectStop(stopId: string): void;
  /** Report task progress, e.g. (2, 3) → "2 of 3 found". */
  taskProgress(done: number, total: number): void;
  /** The task is finished — the shell moves on to the quiz. */
  completeTask(): void;
  /** Play a UI sound (respects the user's sound setting). */
  sfx(name: SfxName): void;
  /** Show (and speak, if narration is on) a short transient line from the guide. */
  say(text: Tiered<string>): void;
}

export interface WorldRuntimeProps {
  readonly band: AgeBand;
  readonly quality: QualityProfile;
  readonly reducedMotion: boolean;
  readonly phase: FlowPhase;
  /** Current stop during travel/explore/task/quiz/reward; null on intro/map/finale. */
  readonly stopId: string | null;
  /** The active task while phase === 'task'. */
  readonly task: StopTask | null;
  /** Stop ids the child has completed (≥1 star). */
  readonly completedStops: readonly string[];
  readonly explorer: { readonly name: string; readonly avatar: string };
  readonly actions: WorldActions;
}

export interface WorldCanvasConfig {
  readonly camera: { readonly position: readonly [number, number, number]; readonly fov?: number; readonly far?: number };
  /** Background colour of the 3D canvas (also shown while loading). */
  readonly background: string;
  /** Bloom settings when the device is on the high tier. `false` disables bloom. */
  readonly bloom?: false | { readonly intensity: number; readonly luminanceThreshold: number };
}

export interface WorldModule {
  readonly content: WorldContent;
  readonly canvas: WorldCanvasConfig;
  /** Rendered inside the shared <Canvas>. */
  readonly Scene: ComponentType<WorldRuntimeProps>;
  /** Optional DOM layer for task controls (sliders, thrust buttons, sorting…). Rendered above the canvas. */
  readonly Overlay?: ComponentType<WorldRuntimeProps>;
}
