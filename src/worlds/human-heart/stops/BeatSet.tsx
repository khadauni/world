import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import { Tappable } from '@/engine/kit';
import { BEAT_LINES, pick } from '../content/lines';
import { assistedBpm, assistedWindow, tuning } from '../logic/bands';
import { CYCLE, periodFor, wrap01 } from '../logic/beat';
import type { Shot } from '../logic/camera';
import { RHYTHM_START, reduceTap, type RhythmState } from '../logic/rhythm';
import { BeatDriver } from '../parts/BeatDriver';
import { Burst, PopWords, type BurstHandle, type PopWordHandle } from '../parts/Burst';
import { EcgMonitor } from '../parts/EcgMonitor';
import { Heart, makeHeartControl } from '../parts/Heart';
import { Ripples } from '../parts/Ripples';
import { ShotCamera } from '../parts/ShotCamera';
import { Stethoscope } from '../parts/Stethoscope';
import { Tag } from '../parts/Tag';
import { useSpin } from '../parts/useSpin';
import { beat, useHeart } from '../store';
import { useCommands, useOnTaskEnd, useOnTaskStart, useSayThrottle, useTimers, type StopProps } from './common';

const LEAD = 0.95;
const R_START = 2.9;
const R_END = 1.5;

/**
 * Stop 2 — Lub-dub. The heart beats in the right order (atria, then ventricles) with comic "LUB!"/"DUB!"
 * pops as the valves shut and puffs of blood leaving the arteries. Task: tap on each big squeeze — a golden
 * ring shrinks onto the heart to show when (seniors also get a live ECG whose spike matches the squeeze).
 */
export function BeatSet({ phase, band, task, reducedMotion, quality, actions, arriving, onArrive }: StopProps) {
  const cfg = tuning(band).beat;
  const control = useMemo(() => makeHeartControl({ face: { mood: 0.4, squint: 0, lookX: 0, lookY: 0 }, beat: 1.25 }), []);
  const bpm = useRef(band === 'tiny' ? 54 : 62);
  const spinner = useRef<Group>(null);
  const burst = useRef<BurstHandle>(null);
  const puffs = useRef<BurstHandle>(null);
  const words = useRef<PopWordHandle>(null);
  const rhythm = useRef<RhythmState>(RHYTHM_START);
  const done = useRef(false);
  const timers = useTimers();
  const say = useSayThrottle(actions, 1400);
  const active = phase === 'task' && task?.kind === 'beat-rhythm';
  const activeRef = useRef(active);
  activeRef.current = active;
  const ecg = cfg.ecg;

  useSpin(spinner, phase === 'explore', 0.7);

  useOnTaskStart(phase, () => {
    rhythm.current = RHYTHM_START;
    done.current = false;
    bpm.current = cfg.bpm;
    control.face.mood = 0.4;
    actions.taskProgress(0, cfg.goal);
    useHeart.getState().patch('beat', { good: 0, goal: cfg.goal, assist: false, feedback: { kind: null, n: 0 } });
  });
  useOnTaskEnd(phase, () => {
    done.current = true;
    control.face.mood = 1;
  });

  const tap = () => {
    if (!activeRef.current || done.current) return;
    const r = reduceTap(rhythm.current, {
      phase: beat.phase,
      beats: beat.beats,
      bpm: beat.bpm,
      window: cfg.window,
      assistWindow: assistedWindow(band),
      assistAfter: tuning(band).assistAfter,
    });
    const wasAssist = rhythm.current.assist;
    rhythm.current = r.state;
    const fb = useHeart.getState().beat.feedback;
    useHeart.getState().patch('beat', { good: r.state.good, assist: r.state.assist, feedback: { kind: r.judgement, n: fb.n + 1 } });
    if (r.judgement === 'again') return;
    if (r.judgement === 'good') {
      actions.sfx('collect');
      actions.taskProgress(r.state.good, cfg.goal);
      burst.current?.fire([0, 0.2, 1], '#ffd1e0', 22, 3);
      words.current?.pop(band === 'tiny' ? 'BOOM!' : pick(['YES!', 'LUB!', 'BOOM!'], r.state.good), [0.9, 1.2, 1.2], '#fff4b0');
      control.face.mood = 1;
      if (r.state.good >= cfg.goal) {
        done.current = true;
        actions.sfx('celebrate');
        actions.say(BEAT_LINES.done);
        burst.current?.fire([0, 0.3, 0.8], '#ff9fc0', 50, 4);
        timers(() => actions.completeTask(), 1500);
      } else say(pick(BEAT_LINES.good, r.state.good));
      return;
    }
    control.face.mood = 0.1;
    if (r.state.assist && !wasAssist) {
      bpm.current = assistedBpm(band);
      actions.say(BEAT_LINES.assist);
    } else say(r.judgement === 'early' ? BEAT_LINES.early : BEAT_LINES.late);
  };

  useCommands((cmd) => {
    if (cmd.type === 'beat-tap') tap();
  });

  const onLub = () => {
    if (!activeRef.current) words.current?.pop(band === 'tiny' ? 'THUMP!' : 'LUB', [-0.95, 0.15, 1.1], '#ffffff');
    if (!reducedMotion) {
      puffs.current?.fire([0.12, 2.05, -0.1], '#ff2a48', 8, 1.3);
      puffs.current?.fire([1.35, 1.1, -0.3], '#4f63ff', 6, 1.1);
      puffs.current?.fire([-1.3, 1.05, -0.5], '#4f63ff', 6, 1.1);
    }
  };
  const onDub = () => {
    if (!activeRef.current && band !== 'tiny') words.current?.pop('DUB', [0.95, 1.35, 0.9], '#ffe3ec');
  };

  const shot: Shot = useMemo(() => {
    if (active) return ecg ? { target: [1.25, 0.3, 0], dir: [0, 0.05, 1], fit: [9.2, 6.2] } : { target: [0, 0.25, 0], dir: [0, 0.05, 1], fit: [6.2, 6.2] };
    return ecg ? { target: [1.1, 0.35, 0], dir: [0.05, 0.08, 1], fit: [8.4, 4.4] } : { target: [0, 0.4, 0], dir: [0.05, 0.08, 1], fit: [4.8, 4.4] };
  }, [active, ecg]);

  return (
    <>
      <ShotCamera shot={shot} entry={{ ...shot, fit: [shot.fit[0] * 2.4, shot.fit[1] * 2.4] }} reducedMotion={reducedMotion} smooth={1.1} onSettled={() => arriving && onArrive()} />
      <BeatDriver bpm={bpm} sfx={actions.sfx} onLub={onLub} onDub={onDub} />
      <group ref={spinner}>
        <Tappable onTap={tap} hitRadius={active ? 1.9 : undefined} disabled={!active} hoverScale={1.03}>
          <Heart control={control} detail={quality.detail} face reducedMotion={reducedMotion} />
        </Tappable>
        {!ecg && (
          <group position={[-0.78, -0.72, 0.72]} rotation={[0, 0.35, 0.3]}>
            <Stethoscope detail={quality.detail} />
            <Tag id="beat-steth" position={[-0.8, 0.95, 0.34]} text={band === 'tiny' ? 'Listen!' : 'Stethoscope'} emoji="🩺" accent="#2ec4b6" visible={phase === 'explore'} />
          </group>
        )}
      </group>
      <Ripples position={[0, 0.1, 0.4]} size={2} color="#ffb3cc" reducedMotion={reducedMotion} />
      {active && <ApproachRing reducedMotion={reducedMotion} />}
      {ecg && (
        <group position={[3.35, 0.35, -0.2]} rotation={[0, -0.28, 0]}>
          <EcgMonitor />
          <Tag id="beat-ecg" position={[0, 1.02, 0]} text="ECG — the heart’s electricity" emoji="⚡" accent="#2ec4b6" visible={phase === 'explore'} />
        </group>
      )}
      <PopWords ref={words} reducedMotion={reducedMotion} size={0.9} />
      <Burst ref={burst} count={Math.round(80 * quality.particleScale) + 30} reducedMotion={reducedMotion} />
      <Burst ref={puffs} count={48} reducedMotion={reducedMotion} soft />
    </>
  );
}

/** The rhythm cue: a golden ring that shrinks onto the heart and lands exactly on the big squeeze. */
function ApproachRing({ reducedMotion }: { reducedMotion: boolean }) {
  const ring = useRef<Mesh>(null);
  const flash = useRef<Mesh>(null);
  const camera = useThree((s) => s.camera);
  const assistOn = useHeart((s) => s.beat.assist);
  useFrame(() => {
    const period = periodFor(beat.bpm);
    const toPeak = wrap01(CYCLE.ventPeak - beat.phase) * period;
    const since = wrap01(beat.phase - CYCLE.ventPeak) * period;
    const r = ring.current;
    if (r) {
      r.quaternion.copy(camera.quaternion);
      const on = toPeak <= LEAD;
      r.visible = on;
      if (on) {
        const k = toPeak / LEAD;
        r.scale.setScalar(R_END + (R_START - R_END) * (reducedMotion ? Math.round(k * 3) / 3 : k));
        (r.material as MeshBasicMaterial).opacity = (assistOn ? 1 : 0.85) * (1 - k * 0.5);
      }
    }
    const f = flash.current;
    if (f) {
      f.quaternion.copy(camera.quaternion);
      const on = since < 0.22;
      f.visible = on;
      if (on) {
        f.scale.setScalar(R_END * (1 + since * 0.8));
        (f.material as MeshBasicMaterial).opacity = (1 - since / 0.22) * 0.9;
      }
    }
  });
  return (
    <group position={[0, 0.15, 0.3]}>
      <mesh ref={ring} renderOrder={12} visible={false}>
        <ringGeometry args={[assistOn ? 0.9 : 0.94, 1, 72]} />
        <meshBasicMaterial color={assistOn ? '#fff4b0' : '#ffc93c'} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={flash} renderOrder={12} visible={false}>
        <ringGeometry args={[0.88, 1, 72]} />
        <meshBasicMaterial color="#ffffff" transparent depthTest={false} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}
