import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Vector3, type Group } from 'three';
import { Glow } from '@/engine/kit';
import { RULES, type CheckId } from '../logic/bands';
import type { Shot } from '../logic/camera';
import { checksFor, LAUNCH_CHECKS, liftoffHeight } from '../logic/launch';
import { createSeq, needsAssist, nextTarget, tapSeq, type SeqState } from '../logic/sequence';
import { LINES } from '../lines';
import { Balloon, Island, LaunchPad, Palms, palmSpots, Sea, SkyDome, SUN_DIR } from '../parts/LaunchSite';
import { LVM3 } from '../parts/LVM3';
import { Particles, type ParticleConfig } from '../parts/Particles';
import { ShotCamera } from '../parts/ShotCamera';
import { live, useMission } from '../store';
import { isAfterTask, useCommands, useOnTaskEnd, useOnTaskStart, useTimers, type StopProps } from './common';

const PAD_Y = 1.27;

const ENTRY: Shot = { target: [0, 6, 0], dir: [-1, 0.55, 0.5], fit: [44, 26] };
const HERO: Shot = { target: [1.2, 5.2, 0.2], dir: [-1, 0.1, 0.46], fit: [12, 10.2] };
const TASK: Shot = { target: [1.2, 5.0, 0.3], dir: [-1, 0.06, 0.5], fit: [13, 10.6] };

const VENT: ParticleConfig = {
  count: 70,
  mode: 'smoke',
  life: 2.6,
  emitter: [0, PAD_Y + 5.3, 0],
  spawnRadius: 0.38,
  dir: [0, -0.3, 1],
  spread: 1.6,
  flat: 0.6,
  speed: [0.5, 1.3],
  gravity: [0, -0.25, 0],
  drag: 0.6,
  size: [0.35, 1.5],
  color: '#ffffff',
  shadow: '#b8c6dc',
  opacity: 0.75,
  seed: 21,
};

const GROUND_CLOUD: ParticleConfig = {
  count: 150,
  mode: 'smoke',
  life: 6,
  emitter: [3.2, 0.6, 0],
  spawnRadius: 1.4,
  dir: [1, 0.12, 0],
  spread: 1.35,
  flat: 0.72,
  speed: [5, 12],
  gravity: [0, 0.35, 0],
  drag: 0.85,
  size: [2.2, 7.5],
  color: '#fff7ee',
  color2: '#f0f2f7',
  shadow: '#a7a2b3',
  opacity: 0.95,
  burstSpread: 3.2,
  seed: 5,
};

const PAD_CLOUD: ParticleConfig = {
  count: 110,
  mode: 'smoke',
  life: 5.5,
  emitter: [0, 0.8, 0],
  spawnRadius: 1.2,
  dir: [0, 0.2, 0],
  spread: 2,
  flat: 0.85,
  speed: [3, 7],
  gravity: [0, 0.3, 0],
  drag: 0.9,
  size: [2, 6],
  color: '#ffffff',
  shadow: '#aaa6b8',
  opacity: 0.9,
  burstSpread: 2.6,
  seed: 9,
};

const TRAIL: ParticleConfig = {
  count: 170,
  mode: 'smoke',
  life: 4.5,
  emitter: [0, PAD_Y - 0.5, 0],
  spawnRadius: 0.45,
  dir: [0, -1, 0],
  spread: 0.5,
  speed: [1.5, 3.5],
  drag: 1.2,
  size: [1.1, 4.5],
  color: '#ffffff',
  shadow: '#b5b0c2',
  opacity: 0.9,
  rise: 0.8,
  seed: 13,
};

const SPARKS: ParticleConfig = {
  count: 90,
  mode: 'glow',
  life: 1.1,
  emitter: [0, PAD_Y, 0],
  spawnRadius: 0.8,
  dir: [0, -1, 0],
  spread: 1.6,
  flat: 0.5,
  speed: [3, 8],
  gravity: [0, -3, 0],
  drag: 1,
  size: [0.25, 0.05],
  color: '#ffd27a',
  color2: '#ff6a1a',
  burstSpread: 2.4,
  seed: 3,
};

/** Lingering steam and smoke drifting off the pad after the rocket has gone. */
const AFTER_STEAM: ParticleConfig = {
  count: 60,
  mode: 'smoke',
  life: 7,
  emitter: [3.5, 0.4, 0],
  spawnRadius: 3,
  dir: [0.4, 1, 0.1],
  spread: 0.5,
  speed: [0.4, 1],
  drag: 0.3,
  size: [2, 6],
  color: '#ffffff',
  shadow: '#b4b0c0',
  opacity: 0.55,
  seed: 17,
};

type Stage = 'checks' | 'hold' | 'countdown' | 'liftoff' | 'gone';

/**
 * Stop 1 — Satish Dhawan Space Centre, Sriharikota. Afternoon sun, the Bay of Bengal behind the pad,
 * palms swaying. Task: pre-launch checks (junior/senior), hold LAUNCH, countdown, liftoff.
 */
export function LaunchSet(props: StopProps) {
  const { phase, band, quality, reducedMotion, actions, arriving, onArrive } = props;
  const rules = RULES[band].launch;
  const checks = useMemo(() => checksFor(rules), [rules]);
  const timers = useTimers();

  const rocket = useRef<Group>(null);
  const thrust = useRef(0);
  const shake = useRef(0);
  const clouds = useRef(1);
  const armsOpen = useRef(0);
  const follow = useRef<Vector3 | null>(null);
  const followVec = useMemo(() => new Vector3(), []);
  const seq = useRef<SeqState>(createSeq(checks.length, rules.ordered));
  const stage = useRef<Stage>(isAfterTask(phase) ? 'gone' : 'checks');
  const liftT = useRef(0);
  const liftStart = useRef(0);
  const countT = useRef(0);
  const countStart = useRef(0);
  const [done, setDone] = useState<readonly CheckId[]>([]);
  const [ignite, setIgnite] = useState(0);
  const [venting, setVenting] = useState(false);

  const total = checks.length + 1;
  const store = useMission.getState;

  function setStage(s: Stage) {
    stage.current = s;
    if (s !== 'gone') store().patch('launch', { stage: s === 'checks' || s === 'hold' || s === 'countdown' ? s : 'liftoff' });
  }

  useOnTaskStart(phase, () => {
    timers.clear();
    seq.current = createSeq(checks.length, rules.ordered);
    setDone([]);
    setVenting(false);
    clouds.current = 1;
    armsOpen.current = 0;
    thrust.current = 0;
    liftT.current = 0;
    live.launchFill = 0;
    store().patch('launch', { done: [], assist: null, count: 0, wiggle: { id: null, n: 0 } });
    setStage(checks.length ? 'checks' : 'hold');
    actions.taskProgress(0, total);
  });

  // Skipped (or finished): stop timers; if the rocket never lifted off, the pad is shown empty after launch
  // (`gone` below already hides the rocket in the same render that leaves the task phase).
  useOnTaskEnd(phase, () => {
    timers.clear();
    setVenting(false);
    if (stage.current !== 'liftoff') stage.current = 'gone';
  });

  function react(id: CheckId) {
    if (id === 'fuel') setVenting(true);
    if (id === 'weather') clouds.current = 0.35;
    if (id === 'clock') armsOpen.current = 1;
  }

  useCommands((cmd) => {
    if (phase !== 'task') return;
    if (cmd.type === 'check' && stage.current === 'checks') {
      const index = checks.findIndex((c) => c.id === cmd.id);
      const r = tapSeq(seq.current, index);
      seq.current = r.state;
      if (r.result === 'miss') {
        actions.sfx('thud');
        const assist = needsAssist(r.state) ? (checks[nextTarget(r.state) ?? 0]?.id ?? null) : null;
        const w = store().launch.wiggle;
        store().patch('launch', { wiggle: { id: cmd.id, n: w.n + 1 }, assist });
        actions.say(assist ? LINES.checkAssist : LINES.checkOrder);
        return;
      }
      if (r.result === 'repeat') return;
      const check = LAUNCH_CHECKS.find((c) => c.id === cmd.id);
      actions.sfx('collect');
      react(cmd.id);
      const doneIds = r.state.done.map((i) => checks[i]?.id).filter((x): x is CheckId => !!x);
      setDone(doneIds);
      const assist = needsAssist(r.state) && r.result === 'hit' ? (checks[nextTarget(r.state) ?? 0]?.id ?? null) : null;
      store().patch('launch', { done: doneIds, assist });
      actions.taskProgress(doneIds.length, total);
      if (r.result === 'complete') {
        actions.sfx('unlock');
        actions.say(LINES.checksDone);
        setStage('hold');
      } else if (check) actions.say(check.done);
    }
    if (cmd.type === 'launch' && stage.current === 'hold') {
      setStage('countdown');
      countT.current = 0;
      countStart.current = performance.now() / 1000;
      armsOpen.current = 1;
      setVenting(true);
      store().patch('launch', { count: rules.countdownFrom });
      actions.sfx('beat');
    }
  });

  useFrame(() => {
    // Gameplay timers use wall-clock time so the countdown is honest even at a low frame rate.
    const now = performance.now() / 1000;
    const s = stage.current;
    if (s === 'countdown' && phase !== 'task') {
      stage.current = 'gone';
    } else if (s === 'countdown') {
      countT.current = now - countStart.current;
      const left = rules.countdownFrom - Math.floor(countT.current);
      if (left !== store().launch.count && left > 0) {
        store().patch('launch', { count: left });
        actions.sfx('beat');
      }
      shake.current = 0.08 + (countT.current / rules.countdownFrom) * 0.2;
      thrust.current = countT.current > rules.countdownFrom - 0.6 ? 0.5 : 0;
      if (countT.current >= rules.countdownFrom) {
        setStage('liftoff');
        store().patch('launch', { count: 0 });
        liftStart.current = now;
        thrust.current = 1.2;
        setIgnite((n) => n + 1);
        setVenting(false);
        actions.sfx('launch');
        actions.say(LINES.liftoff);
        actions.taskProgress(total, total);
        timers.later(() => actions.completeTask(), 4600);
      }
    } else if (s === 'liftoff' || s === 'gone') {
      liftT.current = now - liftStart.current;
      const h = liftoffHeight(Math.max(0, liftT.current - 0.35));
      if (rocket.current) {
        rocket.current.position.y = PAD_Y + h;
        rocket.current.position.x = h * h * 0.0012;
        rocket.current.rotation.z = -Math.min(0.25, h * 0.004);
      }
      thrust.current = 1.2;
      shake.current = s === 'liftoff' ? Math.max(0, 1 - liftT.current * 0.25) : 0;
      followVec.set(HERO.target[0] + Math.min(h, 60) * 0.02, HERO.target[1] + Math.min(h * 0.72, 40), HERO.target[2]);
      follow.current = s === 'liftoff' ? followVec : null;
    } else {
      // Rumble while LAUNCH is being held.
      const fill = live.launchFill;
      shake.current = fill * 0.08;
      if (rocket.current) {
        rocket.current.position.y = PAD_Y;
        rocket.current.position.x = Math.sin(performance.now() * 0.06) * fill * 0.015;
        rocket.current.rotation.z = 0;
      }
      thrust.current = 0;
      follow.current = null;
    }
  });

  // After the task (quiz / reward) the rocket is long gone — show the empty pad and drifting clouds.
  const gone = isAfterTask(phase) && stage.current !== 'liftoff';
  const shot = phase === 'task' ? TASK : HERO;
  const spots = useMemo(() => palmSpots(3), []);
  const vis = stage.current !== 'gone' && !gone;

  return (
    <group>
      <ShotCamera
        shot={shot}
        entry={ENTRY}
        reducedMotion={reducedMotion}
        smooth={stage.current === 'liftoff' ? 0.75 : 1.2}
        orbit={phase === 'explore'}
        onSettled={arriving ? onArrive : undefined}
        shake={shake}
        liveTarget={follow}
      />
      <hemisphereLight args={['#bfe3ff', '#8d7a5a', 0.9]} />
      <directionalLight
        position={[SUN_DIR[0] * 40, SUN_DIR[1] * 40, SUN_DIR[2] * 40]}
        intensity={2.6}
        color="#fff0d6"
        castShadow={quality.shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[30, 10, -20]} intensity={1.1} color="#ffd9a8" />
      <directionalLight position={[20, 14, 18]} intensity={1.4} color="#a9c8ff" />

      <SkyDome clouds={clouds} detail={quality.detail} />
      <Sea />
      <Island detail={quality.detail} />
      <Palms spots={spots} />
      <LaunchPad armsOpen={armsOpen} towerLight={done.includes('spacecraft') || band === 'tiny'} />
      <Balloon launched={done.includes('weather')} />

      <group ref={rocket} position={[0, PAD_Y, 0]} visible={vis}>
        <LVM3 thrust={thrust} detail={quality.detail} />
        {done.includes('spacecraft') && <Glow color="#7dffb0" scale={1.6} opacity={0.8} position={[-0.5, 7.4, 0]} />}
      </group>

      <Particles config={VENT} loop active={venting && phase === 'task'} scale={quality.particleScale} />
      <Particles config={GROUND_CLOUD} trigger={ignite} scale={quality.particleScale} />
      <Particles config={PAD_CLOUD} trigger={ignite} scale={quality.particleScale} />
      <Particles config={SPARKS} trigger={ignite} scale={quality.particleScale} />
      <Particles config={TRAIL} loop active={ignite > 0 && stage.current === 'liftoff'} scale={quality.particleScale} />
      <Particles config={AFTER_STEAM} loop active={isAfterTask(phase)} scale={quality.particleScale} />
    </group>
  );
}
