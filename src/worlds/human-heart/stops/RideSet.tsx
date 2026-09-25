import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState, type RefObject } from 'react';
import { AdditiveBlending, CatmullRomCurve3, Vector3, type Group, type SpriteMaterial } from 'three';
import { avatarById } from '@/core/avatars';
import { Tappable, glowTexture } from '@/engine/kit';
import { RIDE_LINES, pick } from '../content/lines';
import { tuning } from '../logic/bands';
import type { Shot } from '../logic/camera';
import {
  LUNG_STOP,
  MUSCLE_STOP,
  OUTSIDE_RUNS,
  RIDE_HEART_SCALE,
  RIDE_POINTS,
  RIDE_START,
  forwardGap,
  oxygenSmooth,
  placeAt,
  rideArrive,
  rideBubble,
  rideDeliver,
  rideProgress,
  rideStart,
  waypointU,
  type RideState,
} from '../logic/ride';
import { BeatDriver } from '../parts/BeatDriver';
import { Burst, PopWords, type BurstHandle, type PopWordHandle, wordTexture } from '../parts/Burst';
import { FlowCells } from '../parts/cells';
import { tubeFromCurve } from '../parts/geometry';
import { HeartSection, makeSectionControl } from '../parts/HeartSection';
import { Lungs } from '../parts/Lungs';
import { Muscle, type MuscleState } from '../parts/Muscle';
import { RiderCell } from '../parts/RiderCell';
import { ShotCamera, type CameraOverride } from '../parts/ShotCamera';
import { Tag } from '../parts/Tag';
import { Vessel } from '../parts/Vessel';
import { useHeart } from '../store';
import { useCommands, useOnTaskEnd, useOnTaskStart, useSayThrottle, useTimers, type StopProps } from './common';
import { useDisposable } from '../parts/dispose';

const OVERVIEW: Shot = { target: [0.45, -0.3, 0], dir: [0, 0.02, 1], fit: [7.0, 10.4] };
const ENTRY: Shot = { target: [0.4, -0.3, 0], dir: [0.2, 0.1, 1], fit: [14, 18] };
const MUSCLE_AT: [number, number, number] = [0, -5.75, -0.55];
const LUNG_R: [number, number, number] = [2.75, 3.95, -0.85];
const LUNG_L: [number, number, number] = [-2.3, 3.95, -0.85];

const tmp = new Vector3();

/** First bubble index not yet popped (-1 when all are taken). Loop, not findIndex: runs every frame. */
function firstFree(count: number, taken: readonly number[]): number {
  for (let k = 0; k < count; k++) if (!taken.includes(k)) return k;
  return -1;
}

/**
 * Stop 6 — Ride a red blood cell through the double circulation: body → vena cava → right atrium →
 * right ventricle → pulmonary artery → lungs (turn red, load O₂) → pulmonary veins → left atrium →
 * left ventricle → aorta → body. The heart in the middle is the cut-away model, so you really ride
 * through its chambers and valves. Task: pop the O₂ bubbles in the lungs, then feed the tired muscle.
 */
export function RideSet({ phase, band, task, reducedMotion, quality, actions, arriving, onArrive, explorer }: StopProps) {
  const cfg = tuning(band).ride;
  const curve = useMemo(() => new CatmullRomCurve3(RIDE_POINTS.map((w) => new Vector3(...w.p)), true, 'centripetal'), []);
  const us = useMemo(() => waypointU(curve.getLengths(RIDE_POINTS.length * 24)), [curve]);
  const oxyAt = useMemo(() => (u: number) => oxygenSmooth(u, us), [us]);
  const vessels = useMemo(
    () =>
      OUTSIDE_RUNS.map(([a, b]) => {
        const ua = us[a] ?? 0;
        const span = forwardGap(ua, us[b] ?? 0);
        const pts: Vector3[] = [];
        const n = 40;
        for (let i = 0; i <= n; i++) pts.push(curve.getPointAt((ua + (span * i) / n) % 1));
        const piece = new CatmullRomCurve3(pts, false, 'centripetal');
        return { geometry: tubeFromCurve(piece, { radius: () => 0.24, tubular: 90, radial: 14, caps: 'none', attr: (t) => oxyAt((ua + span * t) % 1) }, quality.detail), length: piece.getLength() };
      }),
    [curve, us, oxyAt, quality.detail],
  );
  const section = useMemo(() => makeSectionControl(), []);
  const bpm = useRef(60);
  const rider = useRef<Group>(null);
  const u = useRef(us[RIDE_START] ?? 0);
  const oxy = useRef(0);
  const carried = useRef(0);
  const state = useRef<RideState>(rideStart(cfg.bubbles));
  const [stage, setStage] = useState<RideState['stage']>('to-lungs');
  const [taken, setTaken] = useState<readonly number[]>([]);
  const takenRef = useRef<readonly number[]>([]);
  takenRef.current = taken;
  const muscle = useMemo<MuscleState>(() => ({ energy: 0.2, glow: 0, flex: 0 }), []);
  const camera = useRef<CameraOverride>({ on: false, pos: new Vector3(), look: new Vector3() });
  const burst = useRef<BurstHandle>(null);
  const words = useRef<PopWordHandle>(null);
  const lastPlace = useRef('');
  const idle = useRef(0);
  const hintIdx = useRef(-1);
  const timers = useTimers();
  const say = useSayThrottle(actions, 700);
  const active = phase === 'task' && task?.kind === 'blood-ride';
  const activeRef = useRef(active);
  activeRef.current = active;

  const setRide = (s: RideState) => {
    state.current = s;
    setStage(s.stage);
    useHeart.getState().patch('ride', { stage: s.stage, bubbles: s.bubbles, goal: s.goal });
    const p = rideProgress(s);
    actions.taskProgress(p.done, p.total);
  };

  useOnTaskStart(phase, () => {
    u.current = us[RIDE_START] ?? 0;
    oxy.current = 0;
    carried.current = 0;
    muscle.energy = 0.15;
    idle.current = 0;
    setTaken([]);
    setRide(rideStart(cfg.bubbles));
  });
  useOnTaskEnd(phase, () => {
    camera.current.on = false;
    muscle.energy = 1;
    muscle.glow = 0;
    setStage('done');
  });

  const deliver = () => {
    if (!activeRef.current) return;
    const r = rideDeliver(state.current);
    if (r.event === 'ignored') return;
    setRide(r.state);
    muscle.energy = 1;
    muscle.flex = 1;
    muscle.glow = 0;
    carried.current = 0;
    actions.sfx('celebrate');
    actions.say(RIDE_LINES.delivered);
    burst.current?.fire([MUSCLE_AT[0], MUSCLE_AT[1] + 0.6, MUSCLE_AT[2] + 0.8], '#fff4b0', 40, 3.4);
    words.current?.pop(band === 'tiny' ? 'YUM!' : 'O₂!', [MUSCLE_AT[0] + 0.9, MUSCLE_AT[1] + 1.2, 0.6], '#b9fff0');
    timers(() => actions.completeTask(), 1800);
  };

  useCommands((cmd) => {
    if (cmd.type === 'ride-deliver') deliver();
    if (cmd.type === 'ride-bubble') {
      const next = firstFree(bubbleSpots.length, takenRef.current);
      if (next >= 0) popBubble(next);
    }
  });

  const bubbleSpots = useMemo(() => {
    const c = curve.getPointAt(us[LUNG_STOP] ?? 0);
    return Array.from({ length: cfg.bubbles }, (_, i) => {
      const a = (i / cfg.bubbles) * Math.PI * 2 + 0.4;
      const r = cfg.bubbles > 4 ? 1.05 + (i % 2) * 0.35 : 1.05;
      return [c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.85, c.z + 0.35] as [number, number, number];
    });
  }, [curve, us, cfg.bubbles]);

  const popBubble = (i: number) => {
    if (!activeRef.current || takenRef.current.includes(i)) return;
    takenRef.current = [...takenRef.current, i];
    const r = rideBubble(state.current);
    if (r.event === 'ignored') return;
    idle.current = 0;
    setTaken((prev) => [...prev, i]);
    carried.current = Math.min(6, r.state.bubbles);
    const at = bubbleSpots[i];
    if (at) burst.current?.fire(at, '#b9f3ff', 16, 2);
    actions.sfx('collect');
    setRide(r.state);
    if (r.event === 'loaded') {
      actions.sfx('star');
      actions.say(RIDE_LINES.loaded);
    } else say(pick(RIDE_LINES.bubble, r.state.bubbles), true);
  };

  useDisposable(vessels);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const s = state.current;
    idle.current += dt;
    hintIdx.current = s.stage === 'lungs' && (idle.current > 7 || band === 'tiny') ? firstFree(bubbleSpots.length, takenRef.current) : -1;
    // --- move the rider ---
    if (active) {
      const speed = reducedMotion ? 0.11 : 0.075;
      if (s.stage === 'to-lungs' || s.stage === 'to-muscle') {
        const goal = us[s.stage === 'to-lungs' ? LUNG_STOP : MUSCLE_STOP] ?? 0;
        const gap = forwardGap(u.current, goal);
        const step = speed * dt * Math.max(0.35, Math.min(1, gap / 0.05));
        if (gap <= step || gap > 0.995) {
          u.current = goal;
          const r = rideArrive(s);
          setRide(r.state);
          if (r.state.stage === 'lungs') actions.say(RIDE_LINES.lungs);
          if (r.state.stage === 'muscle') {
            muscle.glow = 1;
            actions.say(RIDE_LINES.muscle);
          }
        } else u.current = (u.current + step) % 1;
      }
      // Oxygen follows what the child did, not the map.
      const goalOxy = s.stage === 'to-lungs' ? 0 : s.stage === 'lungs' ? s.bubbles / Math.max(1, s.goal) : s.stage === 'done' ? 0.05 : 1;
      oxy.current += (goalOxy - oxy.current) * Math.min(1, dt * 3);
    } else {
      u.current = (u.current + (reducedMotion ? 0.012 : 0.03) * dt) % 1;
      oxy.current += (oxyAt(u.current) - oxy.current) * Math.min(1, dt * 4);
    }
    curve.getPointAt(u.current, tmp);
    rider.current?.position.copy(tmp);
    // --- where are we? (overlay chip) ---
    const place = placeAt(u.current, us);
    if (place !== lastPlace.current) {
      lastPlace.current = place;
      useHeart.getState().patch('ride', { place });
    }
    // --- chase camera during the task ---
    const cam = camera.current;
    cam.on = active && s.stage !== 'done';
    if (cam.on) {
      if (s.stage === 'lungs') {
        cam.look.set(tmp.x - 0.1, tmp.y - 0.15, tmp.z);
        cam.pos.set(tmp.x - 0.2, tmp.y + 0.1, tmp.z + 6.2);
      } else if (s.stage === 'muscle') {
        cam.look.set(MUSCLE_AT[0], MUSCLE_AT[1] + 0.55, 0);
        cam.pos.set(MUSCLE_AT[0] + 0.3, MUSCLE_AT[1] + 1.1, 6.6);
      } else {
        cam.look.set(tmp.x, tmp.y, tmp.z);
        cam.pos.set(tmp.x + 0.35, tmp.y + 0.5, tmp.z + 4.6);
      }
    }
  });

  const labels = phase === 'explore';
  return (
    <>
      <ShotCamera shot={OVERVIEW} entry={ENTRY} reducedMotion={reducedMotion} smooth={active ? 0.8 : 1.2} override={camera} onSettled={() => arriving && onArrive()} />
      <BeatDriver bpm={bpm} />
      <group position={[0, 0, -0.28]} scale={RIDE_HEART_SCALE}>
        <HeartSection detail={quality.detail} control={section} showVessels={false} reducedMotion={reducedMotion} />
      </group>
      {vessels.map((v, i) => (
        <Vessel key={i} geometry={v.geometry} length={v.length} opacity={0.8} speed={reducedMotion ? 0.3 : 1} />
      ))}
      <Lungs detail={quality.detail} reducedMotion={reducedMotion} right={LUNG_R} left={LUNG_L} />
      <group position={MUSCLE_AT} scale={0.95}>
        <Tappable onTap={deliver} hitRadius={active && stage === 'muscle' ? 1.7 : undefined} disabled={!active || stage !== 'muscle'}>
          <Muscle detail={quality.detail} state={muscle} />
        </Tappable>
      </group>
      <FlowCells curve={curve} count={Math.round(46 * quality.particleScale) + 10} speed={reducedMotion ? 0.01 : 0.03} size={0.12} oxygenAt={oxyAt} detail={quality.detail} spread={0.1} />
      <group ref={rider}>
        <RiderCell oxy={oxy} carried={carried} detail={quality.detail} reducedMotion={reducedMotion} rider={avatarById(explorer.avatar).emoji} />
        <Tag id="ride-you" position={[0, 0.72, 0]} text={band === 'tiny' ? 'You!' : 'You’re here!'} emoji="🔴" accent="#ff3450" visible={labels || (active && stage !== 'lungs' && stage !== 'muscle')} />
      </group>
      {active &&
        stage === 'lungs' &&
        bubbleSpots.map((p, i) =>
          taken.includes(i) ? null : <O2Bubble key={i} index={i} position={p} onTap={() => popBubble(i)} hint={hintIdx} size={band === 'tiny' ? 1.25 : 1} />,
        )}
      <Tag id="ride-lungs" position={[LUNG_R[0], LUNG_R[1] + 1.55, LUNG_R[2]]} text="Lungs" emoji="🫁" accent="#ff8fb1" visible={labels} />
      <Tag id="ride-heart" position={[-1.9, 1.5, 0.4]} text="Heart" emoji="❤️" accent="#ff3450" visible={labels} />
      <Tag id="ride-body" position={[MUSCLE_AT[0] - 1.7, MUSCLE_AT[1] + 0.9, 0]} text={band === 'tiny' ? 'Muscle' : 'Body (muscle)'} emoji="💪" accent="#ffb020" visible={labels} />
      <PopWords ref={words} reducedMotion={reducedMotion} size={1} />
      <Burst ref={burst} count={Math.round(90 * quality.particleScale) + 30} reducedMotion={reducedMotion} />
    </>
  );
}

/** A floating oxygen bubble to pop in the lungs. */
function O2Bubble({ index, position, onTap, hint, size }: { index: number; position: [number, number, number]; onTap: () => void; hint: RefObject<number>; size: number }) {
  const g = useRef<Group>(null);
  const halo = useRef<SpriteMaterial>(null);
  const seed = useRef(position[0] * 3 + position[1]);
  const tex = useMemo(() => wordTexture('O₂', '#ffffff', '#1d6f8f'), []);
  useFrame((_, dt) => {
    seed.current += dt;
    const e = g.current;
    const on = hint.current === index;
    if (e) {
      e.position.y = Math.sin(seed.current * 2) * 0.08;
      e.scale.setScalar(size * (on ? 1 + Math.abs(Math.sin(seed.current * 5)) * 0.25 : 1));
    }
    if (halo.current) halo.current.opacity = on ? 0.95 : 0.45;
  });
  return (
    <group position={position}>
      <Tappable onTap={onTap} hitRadius={0.48 * size}>
        <group ref={g}>
          <mesh>
            <sphereGeometry args={[0.3, 24, 18]} />
            <meshPhysicalMaterial color="#dff8ff" transparent opacity={0.5} roughness={0.05} clearcoat={1} emissive="#7fd8ff" emissiveIntensity={0.35} depthWrite={false} />
          </mesh>
          <sprite scale={[0.5, 0.25, 1]} position={[0, 0, 0.32]} renderOrder={8}>
            <spriteMaterial map={tex} transparent depthWrite={false} />
          </sprite>
          <mesh position={[-0.1, 0.12, 0.26]} scale={[0.06, 0.04, 0.02]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          <sprite scale={1.1} renderOrder={2}>
            <spriteMaterial ref={halo} map={glowTexture()} color="#7fd8ff" transparent opacity={0.45} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
          </sprite>
        </group>
      </Tappable>
    </group>
  );
}
