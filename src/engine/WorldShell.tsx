import { AnimatePresence, m } from 'motion/react';
import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { navigate } from '@/app/router';
import { playSfx } from '@/core/audio/sfx';
import { speak, stopSpeaking } from '@/core/audio/speech';
import { useQualityProfile, useReducedMotion } from '@/core/prefs';
import { hasWebGL } from '@/core/quality';
import { selectQuestions } from '@/core/quiz';
import { countStars, useApp, useWorldRecord, type Profile } from '@/core/store';
import { BANDS } from '@/core/tier';
import type { Tiered, WorldActions, WorldModule, WorldRuntimeProps } from '@/core/types';
import { Confetti } from '@/ui/Confetti';
import type { WorldMeta } from '@/worlds/registry';
import { flowReducer, initialFlow, nextStopId, unlockedStops } from './flow';
import { TaskBanner, TravelBanner } from './hud/Banners';
import { BreakReminder } from './hud/BreakReminder';
import { Finale } from './hud/Finale';
import { GuideBubble, type BubbleSlide } from './hud/GuideBubble';
import hud from './hud/Hud.module.css';
import { QuizModal } from './hud/QuizModal';
import { RewardCard } from './hud/RewardCard';
import { StopTrack } from './hud/StopTrack';
import { TopBar } from './hud/TopBar';
import { fmt, fmtList } from './text';
import { WorldCanvas } from './WorldCanvas';
import { WorldErrorBoundary } from './WorldErrorBoundary';
import styles from './WorldShell.module.css';

const TRAVEL_TIMEOUT_MS = 9000;

/**
 * Hosts one world: runs the shared learning loop, renders the world's 3D scene into the shared canvas,
 * and layers the HUD (guide, tasks, quizzes, rewards) on top. Worlds only supply content + scene.
 */
export function WorldShell({ meta, module, profile }: { meta: WorldMeta; module: WorldModule; profile: Profile }) {
  const { content, canvas } = module;
  // Memoised so HUD-only updates (slides, toasts, task progress) never re-reconcile the 3D scene.
  const Scene = useMemo(() => memo(module.Scene), [module.Scene]);
  const Overlay = useMemo(() => (module.Overlay ? memo(module.Overlay) : null), [module.Overlay]);
  const band = profile.band;
  const name = profile.name;
  const quality = useQualityProfile();
  const reducedMotion = useReducedMotion();
  const settings = useApp((s) => s.settings);
  const record = useWorldRecord(meta.id);
  const recordStop = useApp((s) => s.recordStop);
  const awardBadge = useApp((s) => s.awardBadge);
  const touchWorld = useApp((s) => s.touchWorld);
  const addPlaySeconds = useApp((s) => s.addPlaySeconds);

  const [flow, dispatch] = useReducer(flowReducer, initialFlow);
  const [slide, setSlide] = useState(0);
  const [task, setTask] = useState({ done: 0, total: 0 });
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [sceneFailed, setSceneFailed] = useState(() => !hasWebGL());
  const [confetti, setConfetti] = useState(0);
  const [breakOpen, setBreakOpen] = useState(false);

  const completed = useMemo(() => new Set(Object.keys(record.stops)), [record.stops]);
  const completedList = useMemo(() => content.stops.filter((s) => completed.has(s.id)).map((s) => s.id), [content.stops, completed]);
  const unlocked = useMemo(() => unlockedStops(content, completed), [content, completed]);
  const nextId = nextStopId(content, completed);
  const stop = flow.stopId ? (content.stops.find((s) => s.id === flow.stopId) ?? null) : null;
  const allDone = content.stops.every((s) => completed.has(s.id));
  const rate = BANDS[band].speechRate * settings.speechRate;
  const autoSpeak = settings.narration && BANDS[band].autoSpeak;
  const starTotal = countStars(record);

  // Refs so the actions object handed to the world stays referentially stable.
  const live = useRef({ phase: flow.phase, unlocked, band, name, narration: settings.narration, rate });
  live.current = { phase: flow.phase, unlocked, band, name, narration: settings.narration, rate };

  const actions = useMemo<WorldActions>(
    () => ({
      arrive: () => dispatch({ type: 'ARRIVED' }),
      selectStop: (id) => {
        const { phase, unlocked: open } = live.current;
        if ((phase === 'map' || phase === 'intro') && open.has(id)) {
          if (phase === 'intro') dispatch({ type: 'START' });
          dispatch({ type: 'SELECT_STOP', stopId: id });
        }
      },
      taskProgress: (done, total) => setTask({ done: Math.max(0, done), total: Math.max(0, total) }),
      completeTask: () => {
        if (live.current.phase !== 'task') return;
        playSfx('correct');
        dispatch({ type: 'TASK_DONE' });
      },
      sfx: (n) => playSfx(n),
      say: (t: Tiered<string>) => {
        const { band: b, name: nm, narration, rate: r } = live.current;
        const text = fmt(t, b, nm);
        setToast({ text, id: performance.now() });
        if (narration) speak(text, { rate: r });
      },
    }),
    [],
  );

  // --- lifecycle -----------------------------------------------------------
  useEffect(() => {
    touchWorld(meta.id);
    return () => stopSpeaking();
  }, [meta.id, touchWorld]);

  useEffect(() => {
    setSlide(0);
    setTask({ done: 0, total: 0 });
    if (flow.phase === 'travel') playSfx('whoosh');
  }, [flow.phase, flow.stopId]);

  useEffect(() => {
    if (flow.phase !== 'travel') return;
    const t = setTimeout(() => dispatch({ type: 'ARRIVED' }), sceneFailed || reducedMotion ? 700 : TRAVEL_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [flow.phase, flow.stopId, sceneFailed, reducedMotion]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Play-time log for parents + optional break reminder.
  useEffect(() => {
    let continuous = 0;
    const t = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      addPlaySeconds(15);
      continuous += 15;
      const limit = useApp.getState().settings.breakMinutes * 60;
      if (limit > 0 && continuous >= limit) {
        continuous = 0;
        stopSpeaking();
        setBreakOpen(true);
      }
    }, 15_000);
    return () => clearInterval(t);
  }, [addPlaySeconds]);

  useEffect(() => {
    if (flow.phase === 'finale') {
      awardBadge(meta.id);
      setConfetti((c) => c + 1);
    }
  }, [flow.phase, awardBadge, meta.id]);

  // --- derived UI content -------------------------------------------------------
  const introSlides = useMemo<BubbleSlide[]>(() => fmtList(content.intro, band, name).map((text) => ({ kind: 'say', text })), [content.intro, band, name]);
  const exploreSlides = useMemo<BubbleSlide[]>(
    () =>
      stop
        ? [
            ...fmtList(stop.narration, band, name).map((text) => ({ kind: 'say' as const, text })),
            ...fmtList(stop.facts, band, name).map((text) => ({ kind: 'fact' as const, text })),
          ]
        : [],
    [stop, band, name],
  );
  const questions = useMemo(() => (stop ? selectQuestions(stop, band, flow.attempt) : []), [stop, band, flow.attempt]);

  const onQuizDone = useCallback(
    (stars: 1 | 2 | 3) => {
      if (!stop) return;
      recordStop(meta.id, stop.id, stars);
      dispatch({ type: 'QUIZ_DONE', stars });
      if (stars === 3) setConfetti((c) => c + 1);
    },
    [stop, recordStop, meta.id],
  );

  const goHome = useCallback(() => {
    stopSpeaking();
    navigate({ name: 'hub' });
  }, []);

  const runtime: WorldRuntimeProps = useMemo(
    () => ({
      band,
      quality,
      reducedMotion,
      phase: flow.phase,
      stopId: flow.stopId,
      task: flow.phase === 'task' ? (stop?.task ?? null) : null,
      completedStops: completedList,
      explorer: { name, avatar: profile.avatar },
      actions,
    }),
    [band, quality, reducedMotion, flow.phase, flow.stopId, stop, completedList, name, profile.avatar, actions],
  );

  const stopTitle = stop ? fmt(stop.title, band, name) : '';
  const worldPaused = flow.phase === 'quiz' || flow.phase === 'finale' || breakOpen;
  const maxStars = content.stops.length * 3;

  // --- render -----------------------------------------------------------------
  return (
    <div
      className={styles.shell}
      data-band={band}
      data-phase={flow.phase}
      data-testid="world-shell"
      style={{ ['--from' as string]: meta.palette.from, ['--to' as string]: meta.palette.to }}
    >
      <div className={styles.stage}>
        {sceneFailed ? (
          <StoryBackdrop emoji={stop?.emoji ?? meta.emoji} accent={stop?.color ?? meta.palette.accent} />
        ) : (
          <WorldErrorBoundary
            fallback={<StoryBackdrop emoji={stop?.emoji ?? meta.emoji} accent={stop?.color ?? meta.palette.accent} />}
            onError={() => setSceneFailed(true)}
          >
            <WorldCanvas config={canvas} quality={quality} paused={worldPaused} onContextLost={() => setSceneFailed(true)}>
              <Scene {...runtime} />
            </WorldCanvas>
          </WorldErrorBoundary>
        )}
      </div>

      {Overlay && !sceneFailed && (
        <div className={styles.overlay}>
          <Overlay {...runtime} />
        </div>
      )}

      <div className={hud.layer}>
        <TopBar emoji={meta.emoji} title={meta.title} stars={starTotal} maxStars={maxStars} avatar={profile.avatar} onHome={goHome} />

        <div className={hud.spacer} style={{ display: 'contents' }}>
          {flow.phase === 'travel' && stop && (
            <TravelBanner label={`${band === 'tiny' ? 'Whoosh! Off to' : 'Travelling to'} ${stopTitle}…`} onSkip={() => dispatch({ type: 'ARRIVED' })} />
          )}
          {flow.phase === 'task' && stop?.task && (
            <TaskBanner
              instruction={fmt(stop.task.instruction, band, name)}
              hint={stop.task.hint ? fmt(stop.task.hint, band, name) : undefined}
              done={task.done}
              total={task.total}
              autoSpeak={settings.narration}
              rate={rate}
              storyMode={sceneFailed}
              onSkip={() => {
                playSfx('pop');
                dispatch({ type: 'TASK_DONE' });
              }}
            />
          )}
          {flow.phase !== 'travel' && flow.phase !== 'task' && <div />}
        </div>

        <div className={hud.spacer}>
          {flow.phase === 'reward' && stop && (
            <RewardCard
              stars={flow.lastStars || 1}
              stopTitle={stopTitle}
              name={name}
              nextTitle={nextId && !allDone ? fmt(content.stops.find((s) => s.id === nextId)?.title ?? '', band, name) : null}
              autoSpeak={settings.narration}
              rate={rate}
              seed={flow.attempt}
              onMap={() => dispatch({ type: 'TO_MAP' })}
              onNext={() => {
                if (allDone && !record.badgeAt) dispatch({ type: 'CONTINUE', allDone, badgeAlreadyEarned: false });
                else if (nextId) dispatch({ type: 'SELECT_STOP', stopId: nextId });
                else dispatch({ type: 'CONTINUE', allDone, badgeAlreadyEarned: !!record.badgeAt });
              }}
            />
          )}
        </div>

        <div className={hud.dock}>
          {flow.phase === 'intro' && introSlides.length > 0 && (
            <GuideBubble
              guide={content.guide}
              slide={introSlides[Math.min(slide, introSlides.length - 1)] as BubbleSlide}
              step={slide}
              total={introSlides.length}
              autoSpeak={autoSpeak}
              rate={rate}
              nextLabel={slide + 1 >= introSlides.length ? "Let's go!" : 'Next'}
              nextIcon={slide + 1 >= introSlides.length ? '🚀' : '▶'}
              onNext={() => (slide + 1 >= introSlides.length ? dispatch({ type: 'START' }) : setSlide((s) => s + 1))}
              extraActions={
                completed.size > 0 && slide + 1 < introSlides.length ? (
                  <button type="button" className={hud.iconBtn} style={{ width: 'auto', padding: '0 14px', borderRadius: 999 }} onClick={() => dispatch({ type: 'START' })}>
                    Skip
                  </button>
                ) : undefined
              }
            />
          )}

          {flow.phase === 'map' && (
            <>
              <GuideBubble
                compact
                guide={content.guide}
                slide={{
                  kind: 'say',
                  text: allDone
                    ? `You mastered this world, ${name}! Replay any stop to collect more stars.`
                    : band === 'tiny'
                      ? `Tap the bouncing picture, ${name}!`
                      : `Where to next, ${name}? Tap a glowing stop!`,
                }}
                step={0}
                total={1}
                autoSpeak={autoSpeak}
                rate={rate}
              />
              <StopTrack
                stops={content.stops}
                band={band}
                name={name}
                records={record.stops}
                unlocked={unlocked}
                nextId={nextId}
                onSelect={(id) => dispatch({ type: 'SELECT_STOP', stopId: id })}
              />
            </>
          )}

          {flow.phase === 'explore' && stop && exploreSlides.length > 0 && (
            <GuideBubble
              guide={content.guide}
              slide={exploreSlides[Math.min(slide, exploreSlides.length - 1)] as BubbleSlide}
              step={slide}
              total={exploreSlides.length}
              autoSpeak={autoSpeak}
              rate={rate}
              nextLabel={slide + 1 >= exploreSlides.length ? (stop.task ? 'Start mission' : 'Quiz time') : 'Next'}
              nextIcon={slide + 1 >= exploreSlides.length ? (stop.task ? '🎯' : '❓') : '▶'}
              onNext={() => {
                if (slide + 1 >= exploreSlides.length) {
                  playSfx('unlock');
                  dispatch({ type: 'BEGIN_TASK', hasTask: !!stop.task && !sceneFailed });
                } else setSlide((s) => s + 1);
              }}
              extraActions={
                <button type="button" className={hud.iconBtn} aria-label="Back to the map" onClick={() => dispatch({ type: 'TO_MAP' })}>
                  <span className="emoji" aria-hidden="true">
                    🗺️
                  </span>
                </button>
              }
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <m.div
            key={toast.id}
            className={hud.toast}
            role="status"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {toast.text}
          </m.div>
        )}
      </AnimatePresence>

      <QuizModal
        open={flow.phase === 'quiz'}
        questions={questions}
        band={band}
        name={name}
        guide={content.guide}
        autoSpeak={autoSpeak}
        rate={rate}
        title={stopTitle}
        onDone={onQuizDone}
      />

      <Finale
        open={flow.phase === 'finale'}
        badgeName={fmt(content.badge.name, band, name)}
        badgeEmoji={content.badge.emoji}
        badgeDescription={fmt(content.badge.description, band, name)}
        worldTitle={meta.title}
        name={name}
        outro={fmtList(content.outro, band, name)}
        guide={content.guide}
        autoSpeak={autoSpeak}
        rate={rate}
        onHub={goHome}
        onStay={() => dispatch({ type: 'FINALE_DONE' })}
      />

      <BreakReminder open={breakOpen} autoSpeak={settings.narration} seed={flow.attempt} onResume={() => setBreakOpen(false)} />
      <Confetti fire={confetti} reducedMotion={reducedMotion} />
    </div>
  );
}

function StoryBackdrop({ emoji, accent }: { emoji: string; accent: string }) {
  return (
    <div className={styles.story} style={{ ['--accent' as string]: accent }}>
      <div className={`${styles.storyOrb} emoji`} aria-hidden="true">
        {emoji}
      </div>
      <p className={styles.storyNote}>Story mode — 3D isn’t available on this device</p>
    </div>
  );
}
