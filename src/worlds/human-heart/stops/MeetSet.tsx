import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { AdditiveBlending, type Group, type Mesh, type MeshBasicMaterial, type SpriteMaterial } from 'three';
import { glowTexture, Tappable } from '@/engine/kit';
import { MEET_LINES, pick } from '../content/lines';
import { tuning } from '../logic/bands';
import type { Shot } from '../logic/camera';
import type { SpotId } from '../logic/ids';
import { MEET_START, tapHeart, tapSpot, type MeetState } from '../logic/meet';
import { BeatDriver } from '../parts/BeatDriver';
import { Burst, type BurstHandle } from '../parts/Burst';
import { GhostBody } from '../parts/GhostBody';
import { Heart, makeHeartControl } from '../parts/Heart';
import { Ripples } from '../parts/Ripples';
import { ShotCamera } from '../parts/ShotCamera';
import { Tag } from '../parts/Tag';
import { useSpin } from '../parts/useSpin';
import { beat } from '../store';
import { useOnTaskEnd, useOnTaskStart, useSayThrottle, useTimers, type StopProps } from './common';

const HEART_AT: [number, number, number] = [0.3, 1.3, 0.14];
const SPOT_AT: Record<SpotId, [number, number, number]> = {
  heart: [0.3, 1.3, 0.42],
  mirror: [-0.3, 1.3, 0.42],
  head: [0, 2.72, 0.5],
  tummy: [0, 0.5, 0.5],
  belly: [0.04, 0.84, 0.5],
};
const SPOT_NAME: Record<SpotId, { text: string; emoji: string }> = {
  heart: { text: 'Heart!', emoji: '💗' },
  mirror: { text: 'Right side of chest', emoji: '👈' },
  head: { text: 'Head', emoji: '🧠' },
  tummy: { text: 'Tummy', emoji: '🍽️' },
  belly: { text: 'Upper belly', emoji: '🫃' },
};

const EXPLORE: Shot = { target: [0, 1.5, 0], dir: [0, 0.04, 1], fit: [3.9, 3.5] };
const TASK: Shot = { target: [0, 1.62, 0], dir: [0, 0.02, 1], fit: [3.9, 3.9] };
const ENTRY: Shot = { target: [0, 1.2, 0], dir: [0, 0.1, 1], fit: [9, 9] };

/**
 * Stop 1 — Meet your heart. A glowing x-ray kid with the heart shining in the chest (a little to the body's
 * left, fist-sized — the raised fist is right there to compare). Task: find the heart.
 */
export function MeetSet({ phase, band, task, reducedMotion, quality, actions, arriving, onArrive }: StopProps) {
  const cfg = tuning(band).meet;
  const control = useMemo(() => makeHeartControl({ face: { mood: 0.8, squint: 0, lookX: 0, lookY: 0 }, beat: 1.2 }), []);
  const bpm = useRef(78);
  const body = useRef<Group>(null);
  const heartScale = useRef<Group>(null);
  const heartGlow = useRef<SpriteMaterial>(null);
  const burst = useRef<BurstHandle>(null);
  const state = useRef<MeetState>(MEET_START);
  const vis = useRef({ goal: 1, x: 1, v: 0, punch: 0 });
  const [tried, setTried] = useState<readonly SpotId[]>([]);
  const [found, setFound] = useState(false);
  const [assist, setAssist] = useState(false);
  const timers = useTimers();
  const say = useSayThrottle(actions);
  const active = phase === 'task' && task?.kind === 'find-heart';
  const spotsMode = cfg.mode === 'spots';

  useSpin(body, phase === 'explore', 0.6);

  useOnTaskStart(phase, () => {
    state.current = MEET_START;
    setTried([]);
    setFound(false);
    setAssist(false);
    vis.current.goal = spotsMode ? 0 : 1;
    actions.taskProgress(0, spotsMode ? 1 : cfg.taps);
  });
  useOnTaskEnd(phase, () => {
    setFound(true);
    vis.current.goal = 1;
  });

  const celebrate = () => {
    setFound(true);
    vis.current.goal = 1;
    vis.current.punch = 1;
    burst.current?.fire(SPOT_AT.heart, '#ff9fc0', 36, 3);
    actions.sfx('star');
    actions.say(MEET_LINES.found);
    control.face.mood = 1;
    timers(() => actions.completeTask(), 1600);
  };

  const onHeartTap = () => {
    if (!active || spotsMode) return;
    const r = tapHeart(state.current, cfg.taps);
    if (r.event === 'ignored') return;
    state.current = r.state;
    vis.current.punch = 1;
    beat.phase = 0.98; // make it thump right away — cause and effect!
    burst.current?.fire(SPOT_AT.heart, '#ffd1e0', 14, 2);
    actions.sfx('pop');
    actions.taskProgress(r.state.taps, cfg.taps);
    if (r.event === 'found') celebrate();
    else say(pick(MEET_LINES.tap, r.state.taps - 1), true);
  };

  const onSpotTap = (spot: SpotId) => {
    if (!active || !spotsMode) return;
    const r = tapSpot(state.current, spot, tuning(band).assistAfter);
    if (r.event === 'ignored') return;
    state.current = r.state;
    if (r.event === 'found') {
      actions.taskProgress(1, 1);
      celebrate();
      return;
    }
    actions.sfx('wrong');
    setTried(r.state.tried);
    if (r.state.assist && !assist) {
      setAssist(true);
      actions.say(MEET_LINES.assist);
    } else say(MEET_LINES.miss[spot], true);
  };

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const v = vis.current;
    v.v += ((v.goal - v.x) * 90 - v.v * 11) * dt;
    v.x += v.v * dt;
    if (reducedMotion) v.x = v.goal;
    v.punch = Math.max(0, v.punch - dt * 3);
    const s = Math.max(0, v.x) * (1 + Math.sin(v.punch * Math.PI) * 0.25);
    heartScale.current?.scale.setScalar(s * 0.28);
    if (heartGlow.current) heartGlow.current.opacity = Math.min(1, Math.max(0, v.x) * (0.7 + Math.max(0, beat.vent) * 0.5 + (active && !spotsMode ? 0.25 : 0)));
    control.glow.lv = control.glow.rv = active && !spotsMode ? 0.35 + Math.max(0, beat.vent) * 0.4 : 0;
  });

  const shot = active && spotsMode ? TASK : EXPLORE;
  const spots = cfg.spots;

  return (
    <>
      <ShotCamera shot={shot} entry={ENTRY} reducedMotion={reducedMotion} smooth={1.2} onSettled={() => arriving && onArrive()} />
      <BeatDriver bpm={bpm} />
      <group ref={body}>
        <GhostBody detail={quality.detail} breathe={!reducedMotion} />
        <group position={HEART_AT}>
          <sprite scale={1.9} renderOrder={2}>
            <spriteMaterial ref={heartGlow} map={glowTexture()} color="#ff7aa8" transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
          </sprite>
          <Tappable onTap={onHeartTap} hitRadius={active && !spotsMode ? 0.62 : undefined} disabled={!active || spotsMode}>
            <group ref={heartScale} scale={0.28} rotation={[0, -0.25, 0]}>
              <Heart control={control} detail={quality.detail * 0.8} face={!spotsMode || found || !active} reducedMotion={reducedMotion} />
            </group>
          </Tappable>
        </group>
        <Ripples position={[HEART_AT[0], HEART_AT[1], HEART_AT[2] + 0.3]} size={0.55} enabled={!active || !spotsMode || found} reducedMotion={reducedMotion} />
        {active &&
          spotsMode &&
          !found &&
          spots.map((spot) => (
            <Spot key={spot} spot={spot} tried={tried.includes(spot)} assist={assist && spot === 'heart'} onTap={() => onSpotTap(spot)} reducedMotion={reducedMotion} />
          ))}
        <Tag id="meet-heart" position={[HEART_AT[0] + 0.28, HEART_AT[1] + 0.42, HEART_AT[2]]} text={band === 'tiny' ? 'Heart' : 'Your heart'} emoji="💗" accent="#ff6f91" visible={phase === 'explore' || (active && found)} />
        <Tag id="meet-fist" position={[-0.72, 1.7, 0.62]} text={band === 'tiny' ? 'Fist' : band === 'junior' ? 'Fist-sized!' : 'About fist-sized'} emoji="✊" accent="#ffb020" visible={phase === 'explore'} />
        {tried.map((s) => (
          <Tag key={s} id={`meet-try-${s}`} position={[SPOT_AT[s][0], SPOT_AT[s][1] + 0.2, SPOT_AT[s][2]]} text={SPOT_NAME[s].text} emoji={SPOT_NAME[s].emoji} accent="#9aa3c7" visible={active && !found} />
        ))}
      </group>
      <Burst ref={burst} count={Math.round(80 * quality.particleScale) + 20} reducedMotion={reducedMotion} />
    </>
  );
}

function Spot({ spot, tried, assist, onTap, reducedMotion }: { spot: SpotId; tried: boolean; assist: boolean; onTap: () => void; reducedMotion: boolean }) {
  const core = useRef<Mesh>(null);
  const glow = useRef<SpriteMaterial>(null);
  const t = useRef(spot.length * 0.7);
  useFrame((_, dt) => {
    t.current += dt;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(t.current * 4) * (assist ? 0.22 : 0.1);
    core.current?.scale.setScalar((tried ? 0.6 : assist ? 1.25 : 1) * pulse * 0.13);
    if (glow.current) glow.current.opacity = tried ? 0.12 : assist ? 0.95 : 0.7;
    if (core.current) (core.current.material as MeshBasicMaterial).opacity = tried ? 0.35 : 1;
  });
  return (
    <group position={SPOT_AT[spot]}>
      <Tappable onTap={onTap} hitRadius={0.36} disabled={tried}>
        <mesh ref={core} renderOrder={7}>
          <sphereGeometry args={[1, 20, 14]} />
          <meshBasicMaterial color={tried ? '#c9c2d8' : '#fff1b8'} transparent toneMapped={false} />
        </mesh>
        <sprite scale={assist ? 1.1 : 0.8} renderOrder={6}>
          <spriteMaterial ref={glow} map={glowTexture()} color={tried ? '#9aa3c7' : '#ffc93c'} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </sprite>
      </Tappable>
    </group>
  );
}
