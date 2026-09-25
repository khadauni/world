import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import type { Group, SpriteMaterial } from 'three';
import { Glow, Tappable } from '@/engine/kit';
import { RULES } from '../logic/bands';
import type { Shot } from '../logic/camera';
import { createSeq, isDone, needsAssist, nextTarget, tapSeq, type SeqState } from '../logic/sequence';
import { LINES } from '../lines';
import { emojiTex, PointerHand } from '../parts/Marker';
import { mats } from '../parts/materials';
import { Particles, type ParticleConfig } from '../parts/Particles';
import { Earth, Moon } from '../parts/Planets';
import { ShotCamera } from '../parts/ShotCamera';
import { latchAngles, latchScale, PropulsionModule, Vikram } from '../parts/Spacecraft';
import { isAfterTask, useOnTaskEnd, useOnTaskStart, useTimers, type StopProps } from './common';

type V3 = [number, number, number];

const SUN: V3 = [0.8, 0.45, 0.55];
const RING_Y = 0.7;
const RING_R = 0.92;
/** Height of the padlock badge on each clamp's face. */
const LOCK_Y = 0.07;
/** The stack turns its front (where the latches are) towards the hero camera. */
const STACK_YAW = 0.29;
const HERO: Shot = { target: [0.35, 0.75, 0], dir: [0.3, 0.2, 1], fit: [6.2, 4.7] };
/** During the task: a little closer on the latch ring (the bottom of the screen is free — no overlay controls). */
const TASK: Shot = { target: [0.3, 1.1, 0], dir: [0.3, 0.2, 1], fit: [5, 4.3] };
const APART: Shot = { target: [0.4, 1.4, 0], dir: [0.4, 0.3, 1], fit: [10, 7.4] };
const ENTRY: Shot = { target: [0, 0, 0], dir: [0.3, 0.1, 1], fit: [26, 16] };

const POP: ParticleConfig = {
  count: 40,
  mode: 'sparkle',
  life: 0.9,
  spread: 2,
  speed: [1, 2.2],
  drag: 2.2,
  size: [0.22, 0.06],
  palette: ['#ffd23f', '#ff9933', '#ffffff'],
  seed: 12,
};

const SPRING: ParticleConfig = {
  count: 80,
  mode: 'sparkle',
  life: 1.6,
  emitter: [0, RING_Y, 0],
  spawnRadius: 0.5,
  spread: 2,
  flat: 0.6,
  speed: [1.2, 3],
  drag: 1.4,
  size: [0.3, 0.08],
  palette: ['#ff9933', '#ffffff', '#138808'],
  seed: 15,
};

/**
 * Stop 4 — in a ~150 km lunar orbit, Vikram separates from the Propulsion Module (17 Aug 2023).
 * The Moon's cratered surface curves below; tap the glowing latches to set Vikram free.
 */
export function SeparationSet(props: StopProps) {
  const { phase, band, quality, reducedMotion, actions, arriving, onArrive } = props;
  const count = RULES[band].separation.latches;
  const angles = useMemo(() => latchAngles(count), [count]);
  const timers = useTimers();
  const seq = useRef<SeqState>(createSeq(count, false));
  const [state, setState] = useState<SeqState>(seq.current);
  const [popAt, setPopAt] = useState({ n: 0, at: [0, 0, 0] as V3 });
  const [springs, setSprings] = useState(0);
  const [apart, setApart] = useState(isAfterTask(phase));
  const stack = useRef<Group>(null);
  const lander = useRef<Group>(null);
  const pm = useRef<Group>(null);
  const sepT = useRef(isAfterTask(phase) ? 10 : 0);
  const clock = useRef(0);

  useOnTaskStart(phase, () => {
    timers.clear();
    seq.current = createSeq(count, false);
    setState(seq.current);
    setApart(false);
    sepT.current = 0;
    actions.taskProgress(0, count);
  });

  useOnTaskEnd(phase, () => {
    timers.clear();
    setApart(true);
  });

  function tap(i: number) {
    if (phase !== 'task' || apart) return;
    const r = tapSeq(seq.current, i);
    if (r.result === 'repeat') return;
    seq.current = r.state;
    setState(r.state);
    const a = angles[i] ?? 0;
    setPopAt((p) => ({ n: p.n + 1, at: [Math.sin(a) * RING_R, RING_Y, Math.cos(a) * RING_R] }));
    actions.sfx('pop');
    actions.taskProgress(r.state.done.length, count);
    if (r.result === 'complete') {
      timers.later(() => {
        setApart(true);
        setSprings((n) => n + 1);
        actions.sfx('whoosh');
        actions.say(LINES.separated);
      }, 500);
      timers.later(() => actions.completeTask(), 3600);
    } else actions.say(LINES.latchOpen);
  }

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.25);
    clock.current += step;
    const t = clock.current;
    if (stack.current) {
      stack.current.rotation.y = STACK_YAW + Math.sin(t * 0.3) * (reducedMotion ? 0 : 0.08);
      stack.current.position.y = Math.sin(t * 0.8) * (reducedMotion ? 0 : 0.06);
    }
    if (apart) sepT.current += step;
    const s = sepT.current;
    const ease = 1 - Math.exp(-s * 0.9);
    if (lander.current) {
      lander.current.position.set(ease * 0.9, 0.55 + ease * 2.0, ease * 0.4);
      lander.current.rotation.set(ease * 0.25, ease * 0.5, -ease * 0.18);
    }
    if (pm.current) {
      pm.current.position.set(-ease * 0.7, -ease * 0.9, -ease * 0.3);
      pm.current.rotation.z = ease * 0.12;
    }
  });

  const next = nextTarget(state);
  const showHand = phase === 'task' && !apart && (band === 'tiny' || needsAssist(state)) && next !== null;
  const handA = angles[next ?? 0] ?? 0;
  const shot = apart ? APART : phase === 'task' ? TASK : HERO;

  return (
    <group>
      <ShotCamera shot={shot} entry={ENTRY} reducedMotion={reducedMotion} smooth={1.4} orbit={phase === 'explore'} onSettled={arriving ? onArrive : undefined} />
      <directionalLight position={[SUN[0] * 30, SUN[1] * 30, SUN[2] * 30]} intensity={2.8} color="#fff1d6" />
      <directionalLight position={[-12, 4, -8]} intensity={1.2} color="#8fb0ff" />
      <hemisphereLight args={['#c8d6ff', '#4a4640', 0.35]} />

      {/* The Moon fills the bottom of the frame: we are only ~150 km up. */}
      <group position={[0, -34, -6]} rotation={[0.9, 0.3, 0]}>
        <Moon radius={30} sun={SUN} detail={quality.detail} bump={1.4} ambient={0.05} halo={false} />
      </group>
      <group position={[-30, -2.5, -32]}>
        <Earth radius={2.2} sun={SUN} rotationY={1.8} detail={0.5} />
      </group>

      <group ref={stack} rotation={[0, STACK_YAW, 0]}>
        <group ref={pm}>
          <PropulsionModule panelAngle={0.2} />
          <mesh position={[0, 1.02, 0]} material={mats.metal()}>
            <cylinderGeometry args={[0.38, 0.5, 0.75, 20]} />
          </mesh>
          {angles.map((a, i) => (
            <Latch key={i} angle={a} scale={latchScale(count)} open={isDone(state, i) || apart} active={phase === 'task'} next={next === i} onTap={() => tap(i)} />
          ))}
        </group>
        <group ref={lander} position={[0, 0.55, 0]}>
          <Vikram />
        </group>
        {showHand && <PointerHand position={[Math.sin(handA) * RING_R * 1.1, RING_Y + 0.62, Math.cos(handA) * RING_R * 1.1 + 0.35]} scale={0.8} />}
        <Particles config={POP} trigger={popAt.n} position={popAt.at} scale={quality.particleScale} />
        <Particles config={SPRING} trigger={springs} scale={quality.particleScale} />
      </group>
    </group>
  );
}

/**
 * A chunky glowing release clamp sticking out of the adapter ring, wearing a padlock badge so even pre-readers
 * see "something to open". Tapped: the clamp swings open, turns green and the padlock pops open and away.
 */
function Latch({ angle, scale, open, active, next, onTap }: { angle: number; scale: number; open: boolean; active: boolean; next: boolean; onTap: () => void }) {
  const arm = useRef<Group>(null);
  const lock = useRef<Group>(null);
  const lockMat = useRef<SpriteMaterial>(null);
  const t = useRef(angle * 3);
  const opened = useRef(open ? 1 : 0);
  useFrame((_, dt) => {
    t.current += dt;
    if (arm.current) {
      const goal = open ? -1.3 : 0;
      arm.current.rotation.x += (goal - arm.current.rotation.x) * Math.min(1, dt * 7);
      const pulse = !open && active ? 1 + Math.sin(t.current * (next ? 7 : 4)) * 0.08 : 1;
      arm.current.scale.setScalar(pulse);
    }
    // Padlock on the clamp's face: once open it springs up, swells and fades out.
    opened.current = open ? Math.min(1, opened.current + dt * 1.6) : 0;
    const o = opened.current;
    if (lock.current) {
      lock.current.visible = o < 1;
      lock.current.position.y = LOCK_Y + o * 0.6;
      lock.current.scale.setScalar(0.34 * (1 + Math.sin(Math.min(1, o * 2) * Math.PI) * 0.4));
    }
    if (lockMat.current) lockMat.current.opacity = 1 - o * o;
  });
  return (
    <group rotation={[0, angle, 0]}>
      <group position={[0, RING_Y, RING_R]} scale={scale}>
        <Tappable onTap={onTap} hitRadius={0.62} disabled={!active || open} hoverScale={1.2}>
          <group ref={arm}>
            <RoundedBox args={[0.52, 0.34, 0.34]} radius={0.09} smoothness={2} position={[0, 0.06, 0.08]} material={open ? mats.green() : mats.latch()} />
            <mesh position={[0, 0.25, 0.08]} rotation={[0, 0, Math.PI / 2]} material={mats.metal()}>
              <cylinderGeometry args={[0.06, 0.06, 0.52, 10]} />
            </mesh>
            {!open && <Glow color="#ff9a2a" scale={next ? 2 : 1.45} opacity={0.95} position={[0, 0.08, 0.3]} />}
          </group>
          <group ref={lock} position={[0, LOCK_Y, 0.32]}>
            <sprite renderOrder={30} raycast={() => null}>
              <spriteMaterial ref={lockMat} map={emojiTex(open ? '🔓' : '🔒')} transparent depthTest={false} depthWrite={false} toneMapped={false} />
            </sprite>
          </group>
        </Tappable>
      </group>
    </group>
  );
}
