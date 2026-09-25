import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Vector3, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import { Glow } from '@/engine/kit';
import { RULES } from '../logic/bands';
import type { Shot } from '../logic/camera';
import { createLander, descentProgress, resetLander, stepLander } from '../logic/landing';
import type { Crater, FlatSpot } from '../logic/terrain';
import { LINES } from '../lines';
import { LunarSurface, useLunarTerrain } from '../parts/LunarSurface';
import { LongShadow } from '../parts/MoonGround';
import { Particles, type ParticleConfig } from '../parts/Particles';
import { ShotCamera } from '../parts/ShotCamera';
import { Vikram } from '../parts/Spacecraft';
import { softShadowTexture } from '../parts/textures';
import { live, useMission } from '../store';
import { isAfterTask, useOnTaskEnd, useOnTaskStart, useTimers, type StopProps } from './common';

/** Scene units per metre of altitude (100 m → 10 units, so the whole descent fits in view). */
const M = 0.1;
/** Where Vikram hovers during the explore narration (scene units above the landing spot). */
const HOVER_Y = 3.3;
/** Vikram is drawn a little larger here so the hero stays readable during the long descent. */
const VIKRAM_SCALE = 1.25;
const FLATS: FlatSpot[] = [{ x: 0, z: 0, r: 4.2 }];
const HERO_CRATERS: Crater[] = [
  { x: -10, z: -7, r: 6.5, depth: 1.6 },
  { x: 9, z: -12, r: 5, depth: 1.2 },
  { x: -5, z: 10, r: 3, depth: 0.7 },
  { x: 12, z: 6, r: 3.6, depth: 0.9 },
];

const EXPLORE: Shot = { target: [0, 3.0, 0], dir: [0.85, 0.24, 1], fit: [9, 8] };
const TASK: Shot = { target: [0, 3.2, 0], dir: [0.85, 0.22, 1], fit: [10.5, 10.5] };
const LANDED: Shot = { target: [0, 1.4, 0], dir: [-0.5, 0.25, 1], fit: [7.4, 5] };
const ENTRY: Shot = { target: [0, 12, 0], dir: [0.6, 0.9, 1], fit: [30, 20] };

const DUST: ParticleConfig = {
  count: 120,
  mode: 'smoke',
  life: 1.6,
  emitter: [0, 0.15, 0],
  spawnRadius: 0.8,
  dir: [0, 0.15, 0],
  spread: 2,
  flat: 0.85,
  speed: [3, 6],
  drag: 1.3,
  size: [0.5, 2.2],
  color: '#cfc8bd',
  shadow: '#6f6a64',
  opacity: 0.7,
  seed: 31,
};

const TOUCHDOWN: ParticleConfig = { ...DUST, count: 160, life: 2.4, speed: [4, 9], size: [0.8, 3.2], burstSpread: 0.25, seed: 33 };

const TRICOLOUR: ParticleConfig = {
  count: 150,
  mode: 'sparkle',
  life: 2.4,
  emitter: [0, 2.2, 0],
  spawnRadius: 0.4,
  dir: [0, 1, 0],
  spread: 0.9,
  speed: [3, 6],
  gravity: [0, -1.62, 0],
  drag: 0.4,
  size: [0.35, 0.15],
  palette: ['#ff9933', '#ffffff', '#138808'],
  burstSpread: 0.4,
  seed: 35,
};

/**
 * Stop 5 — powered descent near the lunar south pole (23 Aug 2023, ~6:04 pm IST). Hold THRUST to brake;
 * touch down gently on the glowing flat spot. Tiny: autopilot flies, the child holds at "NOW!" moments.
 */
export function LandingSet(props: StopProps) {
  const { phase, band, quality, reducedMotion, actions, arriving, onArrive } = props;
  const rules = RULES[band].landing;
  const timers = useTimers();
  const store = useMission.getState;
  const terrain = useLunarTerrain(7, 150, 70, FLATS, HERO_CRATERS);

  const lander = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const sim = useRef(createLander(rules));
  const input = useRef({ thrust: false, assist: false });
  const thrust = useRef(0);
  const squash = useRef(1);
  const follow = useRef<Vector3 | null>(null);
  const fit = useRef<[number, number] | null>(null);
  const fitBox = useMemo<[number, number]>(() => [9.5, 9.5], []);
  const followVec = useMemo(() => new Vector3(), []);
  const mode = useRef<'idle' | 'fly' | 'landed' | 'bounce' | 'reset'>(isAfterTask(phase) ? 'landed' : 'idle');
  const modeT = useRef(0);
  const misses = useRef(0);
  const progress = useRef(-1);
  const gateSeen = useRef(-1);
  const fuelWarned = useRef(false);
  const visualY = useRef(isAfterTask(phase) ? 0 : HOVER_Y);
  const [dusting, setDusting] = useState(false);
  const [touch, setTouch] = useState(0);
  const [landed, setLanded] = useState(isAfterTask(phase));
  const gates = rules.gates.length;
  const total = rules.mode === 'autopilot' ? gates + 1 : 20;

  useOnTaskStart(phase, () => {
    timers.clear();
    resetLander(sim.current, rules);
    mode.current = 'fly';
    misses.current = 0;
    progress.current = -1;
    gateSeen.current = -1;
    fuelWarned.current = false;
    setLanded(false);
    live.startAlt = rules.startAlt;
    live.safeSpeed = rules.safeSpeed;
    store().patch('landing', { stage: 'descent', assist: false, holdNow: false });
    actions.taskProgress(0, total);
  });

  useOnTaskEnd(phase, () => {
    timers.clear();
    useMission.getState().setThrust(false);
    if (mode.current !== 'landed') {
      mode.current = 'landed';
      modeT.current = 5;
      setLanded(true);
    }
  });

  useFrame((state, dt) => {
    const step = Math.min(dt, 0.25);
    const t = state.clock.elapsedTime;
    const s = sim.current;
    const m = mode.current;
    let y = visualY.current;
    let x = 0;
    let tilt = 0;
    let power = 0;

    if (m === 'idle') {
      // Explore: Vikram hovers above the landing site, engines softly glowing.
      y = HOVER_Y + Math.sin(t * 1.3) * (reducedMotion ? 0 : 0.18);
      power = 0.45 + Math.sin(t * 9) * 0.05;
    } else if (m === 'fly' && phase === 'task') {
      input.current.thrust = useMission.getState().thrust || performance.now() < live.pulseUntil;
      input.current.assist = misses.current >= 2;
      stepLander(s, input.current, step, rules);
      live.alt = s.alt;
      live.speed = -s.vel;
      live.fuel = Number.isFinite(s.fuel) && rules.fuel ? s.fuel / rules.fuel : 1;
      const frac = s.alt / rules.startAlt;
      y = s.alt * M;
      x = -4.5 * Math.max(0, Math.min(1, (frac - 0.35) / 0.65)) ** 1.5;
      tilt = 0.85 * Math.max(0, Math.min(1, (frac - 0.45) / 0.55)) ** 2;
      power = s.firing ? 1 : 0.12;

      // Tiny: "NOW!" gates.
      if (rules.mode === 'autopilot') {
        const atGate = s.status === 'gate';
        const holdNow = store().landing.holdNow;
        if (atGate && !holdNow) {
          store().patch('landing', { holdNow: true, stage: 'gate' });
          if (gateSeen.current !== s.gate) {
            gateSeen.current = s.gate;
            actions.say(LINES.holdNow);
            actions.sfx('pop');
          }
        } else if (!atGate && holdNow) {
          store().patch('landing', { holdNow: false, stage: 'descent' });
          actions.say(LINES.gatePassed);
          actions.sfx('collect');
          actions.taskProgress(Math.min(gates, s.gate), total);
        }
      } else {
        const p = Math.round(descentProgress(s, rules) * 20);
        if (p !== progress.current && s.status === 'flying') {
          progress.current = p;
          actions.taskProgress(Math.min(19, p), total);
        }
        const tooFast = -s.vel > rules.safeSpeed * 1.4 && s.alt < 45;
        if (tooFast !== store().landing.holdNow) store().patch('landing', { holdNow: tooFast });
        if (rules.fuel && s.fuel <= 0 && !fuelWarned.current) {
          fuelWarned.current = true;
          actions.say(LINES.noFuel);
        }
      }

      if (s.status === 'soft') {
        mode.current = 'landed';
        modeT.current = 0;
        setLanded(true);
        setTouch((n) => n + 1);
        store().patch('landing', { stage: 'soft', holdNow: false });
        actions.sfx('celebrate');
        actions.say(LINES.touchdown);
        actions.taskProgress(total, total);
        timers.later(() => actions.completeTask(), 3400);
      } else if (s.status === 'hard') {
        mode.current = 'bounce';
        modeT.current = 0;
        misses.current += 1;
        setTouch((n) => n + 1);
        store().patch('landing', { stage: 'hard', holdNow: false, assist: misses.current >= 2 });
        actions.sfx('thud');
        actions.say(misses.current >= 2 ? LINES.autopilot : LINES.hard);
      }
    } else if (m === 'bounce') {
      modeT.current += step;
      const k = modeT.current;
      y = Math.abs(Math.sin(k * Math.PI * 1.6)) * 1.1 * Math.exp(-k * 1.8);
      tilt = Math.sin(k * 9) * 0.25 * Math.exp(-k * 2);
      power = 0;
      if (k > 1.9) {
        mode.current = 'reset';
        modeT.current = 0;
      }
    } else if (m === 'reset') {
      // Lift back up and try again.
      modeT.current += step;
      const k = Math.min(1, modeT.current / 1.2);
      y = (k * k * (3 - 2 * k)) * rules.startAlt * M;
      x = -4.5 * k;
      tilt = 0.85 * k;
      power = 1;
      if (k >= 1) {
        resetLander(sim.current, rules);
        progress.current = -1;
        mode.current = 'fly';
        store().patch('landing', { stage: 'descent' });
      }
    } else if (m === 'landed') {
      modeT.current += step;
      y = 0;
      power = Math.max(0, 0.6 - modeT.current);
    }

    visualY.current = y;
    thrust.current = power;
    // Squash on touchdown / bounce, stretch while braking hard.
    const land = m === 'landed' ? Math.exp(-modeT.current * 4) * Math.cos(modeT.current * 18) : 0;
    squash.current = 1 - 0.2 * land + (power > 0.9 ? 0.04 : 0);
    const g = lander.current;
    if (g) {
      g.position.set(x, y, 0);
      g.rotation.z = tilt;
    }
    if (shadow.current) {
      const k = Math.max(0.25, 1 - y / 14);
      shadow.current.scale.setScalar(1 + y * 0.12);
      (shadow.current.material as MeshBasicMaterial).opacity = 0.55 * k;
      shadow.current.position.x = x - 0.4;
    }
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(t * 3) * 0.04);

    const dust = (m === 'fly' && y < 3.2 && power > 0.5) || (m === 'reset' && y < 1.5);
    if (dust !== dusting) setDusting(dust);
    // Keep both Vikram and the landing spot in view: the frame grows while Vikram is high up.
    const tracking = phase === 'task' && (m === 'fly' || m === 'reset' || m === 'bounce');
    // Headroom above Vikram so it never slides under the (sometimes two-line) task banner at the start.
    followVec.set(x * 0.55, 0.4 + y * 0.62, 0);
    fitBox[0] = 8.5 + y * 0.25;
    fitBox[1] = 8 + y * 0.8;
    follow.current = tracking ? followVec : null;
    fit.current = tracking ? fitBox : null;
  });

  const shot = phase === 'task' ? (landed ? LANDED : TASK) : isAfterTask(phase) || landed ? LANDED : EXPLORE;

  return (
    <group>
      <ShotCamera shot={shot} entry={ENTRY} reducedMotion={reducedMotion} smooth={phase === 'task' ? 0.6 : 1.3} orbit={phase === 'explore'} onSettled={arriving ? onArrive : undefined} liveTarget={follow} liveFit={fit} />
      <LunarSurface terrain={terrain} detail={quality.detail} shadows={quality.shadows} earth={[-60, 4, -40]} earthRadius={4.2} />

      {/* Safe landing spot */}
      <mesh ref={ring} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.1, 2.35, 64]} />
        <meshBasicMaterial color={landed ? '#ffd23f' : '#5dffb1'} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.1, 48]} />
        <meshBasicMaterial color={landed ? '#ffd23f' : '#5dffb1'} transparent opacity={0.08} depthWrite={false} />
      </mesh>
      {!landed && <Glow color="#5dffb1" scale={3} opacity={0.35} position={[0, 0.3, 0]} />}

      {/* Once down, Vikram throws a long south-pole shadow away from the low Sun. */}
      {landed && <LongShadow position={[0, 0, 0]} width={2.8} length={7.5} opacity={0.5} />}
      {/* Contact shadow that grows and fades with altitude */}
      <mesh ref={shadow} position={[-0.4, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[3.4, 2.6]} />
        <meshBasicMaterial map={softShadowTexture()} color="#000000" transparent opacity={0.55} depthWrite={false} />
      </mesh>

      <group ref={lander} position={[0, HOVER_Y, 0]}>
        <group rotation={[0, -0.5, 0]} scale={VIKRAM_SCALE}>
          <Vikram thrust={thrust} squash={squash} />
        </group>
      </group>

      <Particles config={DUST} loop active={dusting} scale={quality.particleScale} />
      <Particles config={TOUCHDOWN} trigger={touch} scale={quality.particleScale} />
      {landed && <Particles config={TRICOLOUR} trigger={touch} scale={quality.particleScale} />}
    </group>
  );
}
