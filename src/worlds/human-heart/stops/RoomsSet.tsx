import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { AdditiveBlending, Plane, Vector3, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import { glowTexture } from '@/engine/kit';
import { CHAMBER_LINES, ROOM_LINES, pick } from '../content/lines';
import { tuning } from '../logic/bands';
import type { Shot } from '../logic/camera';
import { CHAMBERS, type ChamberId } from '../logic/ids';
import { ROOMS_START, reduceRoomTap, roomRounds, type RoomsState } from '../logic/rooms';
import { BeatDriver } from '../parts/BeatDriver';
import { Burst, type BurstHandle } from '../parts/Burst';
import { Heart, makeHeartControl } from '../parts/Heart';
import { FlowArrows } from '../parts/FlowArrows';
import { HeartSection, SLAB_DEPTH, chamberLabelAt, makeSectionControl } from '../parts/HeartSection';
import { FLOW_PATHS } from '../logic/section';
import { ShotCamera } from '../parts/ShotCamera';
import { Tag } from '../parts/Tag';
import { useSpin } from '../parts/useSpin';
import { useHeart } from '../store';
import { useOnTaskEnd, useOnTaskStart, useSayThrottle, useTimers, type StopProps } from './common';

const SCAN_TOP = 2.3;
const SCAN_BOTTOM = -1.9;

const NAMES: Record<'tiny' | 'junior' | 'senior', Record<ChamberId, { text: string; emoji: string }>> = {
  tiny: { ra: { text: 'Top', emoji: '🔵' }, rv: { text: 'Bottom', emoji: '🔵' }, la: { text: 'Top', emoji: '🔴' }, lv: { text: 'Bottom', emoji: '🔴' } },
  junior: { ra: { text: 'Right atrium', emoji: '🔵' }, rv: { text: 'Right ventricle', emoji: '🔵' }, la: { text: 'Left atrium', emoji: '🔴' }, lv: { text: 'Left ventricle', emoji: '💪' } },
  senior: { ra: { text: 'Right atrium', emoji: '🔵' }, rv: { text: 'Right ventricle', emoji: '🔵' }, la: { text: 'Left atrium', emoji: '🔴' }, lv: { text: 'Left ventricle', emoji: '💪' } },
};

const SHOT: Shot = { target: [0.28, 0.06, 0], dir: [0.16, 0.06, 1], fit: [4.5, 3.45] };
/** Where each chamber's name tag sits (spread out so tags never overlap). */
const TAG_AT: Record<ChamberId, [number, number]> = { ra: [-0.78, 0.5], la: [0.84, 0.52], rv: [-0.56, -0.74], lv: [0.7, -0.82] };
const ENTRY: Shot = { target: [0.1, 0.2, 0], dir: [0.3, 0.1, 1], fit: [7, 7] };

/**
 * Stop 3 — Four rooms. The whole heart is x-rayed by a scanning beam that reveals it cut open:
 * four chambers with flowing blood (blue = oxygen-poor, red = oxygen-rich), the septum, thick
 * ventricle walls and the valves. Task: tap the chamber Dr. Pulse names.
 */
export function RoomsSet({ phase, band, task, reducedMotion, quality, actions, arriving, onArrive }: StopProps) {
  const cfg = tuning(band);
  const rounds = useMemo(() => roomRounds(band, cfg.rooms.rounds), [band, cfg.rooms.rounds]);
  const heartCtl = useMemo(() => makeHeartControl({ beat: 0.8 }), []);
  const control = useMemo(() => makeSectionControl(), []);
  const bpm = useRef(58);
  const spinner = useRef<Group>(null);
  const burst = useRef<BurstHandle>(null);
  const state = useRef<RoomsState>(ROOMS_START);
  const [revealed, setRevealed] = useState(phase !== 'travel' && phase !== 'explore');
  const reveal = useRef(revealed ? 1 : 0);
  const scanBar = useRef<Group>(null);
  const planes = useMemo(() => ({ keepBelow: new Plane(new Vector3(0, -1, 0), SCAN_TOP), keepAbove: new Plane(new Vector3(0, 1, 0), -SCAN_TOP) }), []);
  const exteriorClip = useMemo(() => [planes.keepBelow], [planes]);
  const sectionClip = useMemo(() => [planes.keepAbove], [planes]);
  const [correct, setCorrect] = useState<readonly ChamberId[]>([]);
  const [assist, setAssist] = useState(false);
  const [round, setRound] = useState(0);
  const timers = useTimers();
  const say = useSayThrottle(actions, 700);
  const active = phase === 'task' && task?.kind === 'name-chambers';
  const activeRef = useRef(active);
  activeRef.current = active;

  useSpin(spinner, phase === 'explore' && revealed, 0.55, -0.12);

  // Start the x-ray sweep once the child has arrived.
  useEffect(() => {
    if (phase !== 'travel' && reveal.current < 1 && !revealed) {
      if (reducedMotion) {
        reveal.current = 1;
        setRevealed(true);
      }
    }
  }, [phase, reducedMotion, revealed]);

  const startRound = (i: number, sayAfterMs = 0) => {
    const r = rounds[i];
    if (!r) return;
    setRound(i);
    useHeart.getState().patch('rooms', { round: i, total: rounds.length, prompt: r.prompt, done: false });
    // The first call waits until the banner has read the task instruction aloud.
    if (sayAfterMs > 0) timers(() => activeRef.current && state.current.round === i && actions.say(r.prompt), sayAfterMs);
    else actions.say(r.prompt);
  };

  useOnTaskStart(phase, () => {
    state.current = ROOMS_START;
    setCorrect([]);
    setAssist(false);
    reveal.current = 1;
    setRevealed(true);
    actions.taskProgress(0, rounds.length);
    startRound(0, 2200);
  });
  useOnTaskEnd(phase, () => {
    setAssist(false);
    useHeart.getState().patch('rooms', { done: true });
  });

  const onChamber = (id: ChamberId) => {
    if (!activeRef.current || state.current.done) return;
    const target = rounds[state.current.round]?.target;
    const r = reduceRoomTap(state.current, id, rounds, cfg.assistAfter);
    state.current = r.state;
    const c = chamberLabelAt(id);
    if (r.correct) {
      actions.sfx('star');
      burst.current?.fire([c[0], c[1], 0.6], id === 'ra' || id === 'rv' ? '#b8c4ff' : '#ffc2cc', 20, 2.2);
      control.glow[id] = 1;
      timers(() => {
        control.glow[id] = 0;
      }, 700);
      setCorrect((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setAssist(false);
      actions.taskProgress(r.state.round, rounds.length);
      if (r.state.done) {
        actions.sfx('celebrate');
        actions.say(ROOM_LINES.done);
        burst.current?.fire([0, 0, 0.8], '#fff4b0', 40, 3);
        useHeart.getState().patch('rooms', { done: true });
        timers(() => actions.completeTask(), 1500);
      } else {
        say(pick(ROOM_LINES.correct, r.state.round), true);
        timers(() => startRound(r.state.round), 1100);
      }
      return;
    }
    actions.sfx('wrong');
    if (r.state.assist && target) {
      setAssist(true);
      actions.say(ROOM_LINES.assist);
    } else {
      const line = CHAMBER_LINES[id];
      say(line, true);
    }
  };

  const target = active && !state.current.done ? rounds[round]?.target : undefined;

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    if (!revealed && phase === 'explore' && !reducedMotion) {
      // Wall-clock paced (not frame-clamped) so the sweep never drags on slow devices.
      reveal.current = Math.min(1, reveal.current + Math.min(dtRaw, 0.25) / 1.8);
      if (reveal.current >= 1) setRevealed(true);
    }
    const y = SCAN_TOP + (SCAN_BOTTOM - SCAN_TOP) * reveal.current;
    planes.keepBelow.constant = y;
    planes.keepAbove.constant = -y;
    if (scanBar.current) {
      scanBar.current.visible = reveal.current > 0.001 && reveal.current < 0.999;
      scanBar.current.position.y = y;
    }
    // Assist: the target chamber pulses; otherwise ease glows back down.
    for (const id of CHAMBERS) {
      if (assist && target === id) control.glow[id] = 0.55 + Math.sin(performance.now() / 180) * 0.35;
      else if (control.glow[id] > 0 && control.glow[id] < 1) control.glow[id] = Math.max(0, control.glow[id] - dt * 2);
    }
  });

  const names = NAMES[band];
  const showNames = phase === 'explore' && revealed;
  const sideText =
    band === 'tiny'
      ? { right: 'Blue side', left: 'Red side' }
      : band === 'junior'
        ? { right: 'Right side (your left!)', left: 'Left side (your right!)' }
        : { right: 'Heart’s RIGHT — oxygen-poor', left: 'Heart’s LEFT — oxygen-rich' };

  return (
    <>
      <ShotCamera shot={SHOT} entry={ENTRY} reducedMotion={reducedMotion} smooth={1.2} onSettled={() => arriving && onArrive()} />
      <BeatDriver bpm={bpm} />
      <group ref={spinner}>
        {!revealed || reveal.current < 1 ? (
          <group position={[0.1, 0.05, 0]}>
            <Heart control={heartCtl} detail={quality.detail} reducedMotion={reducedMotion} clip={exteriorClip} />
          </group>
        ) : null}
        <group position={[0, 0, -0.2]}>
          <HeartSection
            detail={quality.detail}
            control={control}
            interactive={active}
            onChamberTap={onChamber}
            clip={revealed ? undefined : sectionClip}
            reducedMotion={reducedMotion}
            // Valve materials aren't clipped: keep them hidden until the sweep has uncovered the inside.
            showValves={revealed}
          />
          <FlowArrows points={FLOW_PATHS.right} z={SLAB_DEPTH * 0.55} color="#dfe4ff" visible={revealed && !active} speed={reducedMotion ? 0.06 : 0.16} />
          <FlowArrows points={FLOW_PATHS.left} z={SLAB_DEPTH * 0.55} color="#ffe1e6" visible={revealed && !active} speed={reducedMotion ? 0.06 : 0.16} />
          {CHAMBERS.map((id) => {
            const p = TAG_AT[id];
            const showThis = showNames || (active && (correct.includes(id) || (assist && target === id)));
            return <Tag key={id} id={`room-${id}`} position={[p[0], p[1], 0.5]} text={names[id].text} emoji={names[id].emoji} accent={id === 'ra' || id === 'rv' ? '#5b72ff' : '#ff3450'} visible={showThis} />;
          })}
          <Tag id="room-side-r" position={[-0.9, 1.22, 0.3]} text={sideText.right} accent="#5b72ff" visible={phase === 'explore' && revealed} />
          <Tag id="room-side-l" position={[1.05, 1.22, 0.3]} text={sideText.left} accent="#ff3450" visible={phase === 'explore' && revealed} />
          {band !== 'tiny' && <Tag id="room-septum" position={[0.18, -1.12, 0.5]} placement="below" text="Septum" accent="#b5304e" visible={phase === 'explore' && revealed} />}
          {band !== 'tiny' && <Tag id="room-thick" position={[1.45, -0.3, 0.5]} text={band === 'junior' ? 'Thickest wall!' : 'Thick LV wall'} emoji="💪" accent="#ff3450" visible={phase === 'explore' && revealed} />}
        </group>
        <ScanBar ref={scanBar} />
      </group>
      <Burst ref={burst} count={Math.round(80 * quality.particleScale) + 20} reducedMotion={reducedMotion} />
    </>
  );
}

/** The glowing x-ray beam that sweeps down the heart. */
function ScanBar({ ref }: { ref: RefObject<Group | null> }) {
  const line = useRef<Mesh>(null);
  useFrame(() => {
    if (line.current) (line.current.material as MeshBasicMaterial).opacity = 0.75 + Math.sin(performance.now() / 60) * 0.2;
  });
  return (
    <group ref={ref} visible={false}>
      <mesh ref={line} position={[0, 0, 0.9]} renderOrder={15}>
        <planeGeometry args={[3.6, 0.035]} />
        <meshBasicMaterial color="#b9fff0" transparent depthTest={false} toneMapped={false} />
      </mesh>
      <sprite position={[0, 0, 0.92]} scale={[4.6, 0.7, 1]} renderOrder={14}>
        <spriteMaterial map={glowTexture()} color="#7dffcf" transparent opacity={0.65} depthTest={false} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}
