import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import type { Group, Sprite } from 'three';
import { Tappable } from '@/engine/kit';
import { RULES } from '../logic/bands';
import type { Shot } from '../logic/camera';
import { assistedWindow, gaugeValue, hopArc, judgeHop } from '../logic/hop';
import type { FlatSpot } from '../logic/terrain';
import { LINES } from '../lines';
import { LunarSurface, useLunarTerrain } from '../parts/LunarSurface';
import { PointerHand } from '../parts/Marker';
import { Particles, type ParticleConfig } from '../parts/Particles';
import { ShotCamera } from '../parts/ShotCamera';
import { Pragyan, Vikram } from '../parts/Spacecraft';
import { zzzTexture } from '../parts/textures';
import { LongShadow } from '../parts/MoonGround';
import { live, useMission } from '../store';
import { isAfterTask, useCommands, useOnTaskEnd, useOnTaskStart, useTimers, type StopProps } from './common';

type V3 = [number, number, number];

const LANDER: V3 = [-1.4, 0, -0.3];
const ROVER: V3 = [2.0, 0, 0.9];
const HOP_SIDE = 0.35;
const HOP_UP = 0.4;
const FLATS: FlatSpot[] = [
  { x: 0, z: 0, r: 5 },
  { x: ROVER[0], z: ROVER[2], r: 1.6 },
];
const HERO: Shot = { target: [0.3, 1.35, 0.2], dir: [0.3, 0.17, 1], fit: [8.6, 5.2] };
const ENTRY: Shot = { target: [0, 6, 0], dir: [0.2, 0.7, 1], fit: [24, 14] };

const HOP_DUST: ParticleConfig = {
  count: 90,
  mode: 'smoke',
  life: 1.6,
  emitter: [0, 0.1, 0],
  spawnRadius: 0.8,
  dir: [0, 0.2, 0],
  spread: 2,
  flat: 0.85,
  speed: [2, 4],
  drag: 1.6,
  size: [0.4, 1.6],
  color: '#cfc8bd',
  shadow: '#5f5a55',
  opacity: 0.7,
  burstSpread: 0.3,
  seed: 51,
};

const DREAM: ParticleConfig = {
  count: 40,
  mode: 'sparkle',
  life: 1.4,
  spread: 2,
  speed: [0.6, 1.4],
  drag: 1.5,
  size: [0.22, 0.06],
  palette: ['#b9c4ff', '#ffffff', '#ffd23f'],
  seed: 53,
};

/**
 * Stop 7 — the end of the lunar day (2–4 Sep 2023): tuck Pragyan in, fire Vikram's ~40 cm "hop",
 * then put Vikram to sleep as the Sun sets and earthshine takes over.
 */
export function NightSet(props: StopProps) {
  const { phase, band, quality, reducedMotion, actions, arriving, onArrive } = props;
  const rules = RULES[band].night;
  const terrain = useLunarTerrain(23, 90, 45, FLATS);
  const timers = useTimers();
  const store = useMission.getState;
  const after = isAfterTask(phase);

  const night = useRef(after ? 1 : 0.12);
  const nightGoal = useRef(after ? 1 : 0.12);
  const roverSleep = useRef(after ? 1 : 0);
  const landerSleep = useRef(after ? 1 : 0);
  const roverSleepGoal = useRef(after ? 1 : 0);
  const landerSleepGoal = useRef(after ? 1 : 0);
  const panel = useRef(after ? 0.02 : 0.28);
  const thrust = useRef(0);
  const squash = useRef(1);
  const hopT = useRef(-1);
  const landerX = useRef(after ? HOP_SIDE : 0);
  const lander = useRef<Group>(null);
  const misses = useRef(0);
  const gaugeClock = useRef(0);
  const lastAct = useRef(performance.now());
  const [step, setStepState] = useState(after ? 3 : 0);
  const [dust, setDust] = useState(0);
  const [dream, setDream] = useState({ n: 0, at: [0, 0, 0] as V3 });
  const [idleHint, setIdleHint] = useState(false);
  const stepRef = useRef(step);

  function setStep(s: number) {
    stepRef.current = s;
    setStepState(s);
    store().patch('night', { step: s, busy: false });
    lastAct.current = performance.now();
    setIdleHint(false);
  }

  useOnTaskStart(phase, () => {
    timers.clear();
    night.current = nightGoal.current = 0.12;
    roverSleep.current = roverSleepGoal.current = 0;
    landerSleep.current = landerSleepGoal.current = 0;
    panel.current = 0.28;
    landerX.current = 0;
    hopT.current = -1;
    misses.current = 0;
    live.gaugeMax = rules.gaugeMax;
    live.gaugeWindow = [rules.window[0], rules.window[1]];
    store().patch('night', { step: 0, busy: false, assist: false });
    setStep(0);
    actions.taskProgress(0, 3);
  });

  // Finished or skipped: everyone goes to sleep under earthshine for the reward screen.
  useOnTaskEnd(phase, () => {
    timers.clear();
    hopT.current = -1;
    roverSleepGoal.current = 1;
    landerSleepGoal.current = 1;
    nightGoal.current = 1;
    stepRef.current = 3;
    setStepState(3);
  });

  function tuck(who: 'rover' | 'lander') {
    if (phase !== 'task') return;
    const s = stepRef.current;
    if (who === 'rover' && s === 0) {
      roverSleepGoal.current = 1;
      nightGoal.current = 0.3;
      setDream((d) => ({ n: d.n + 1, at: [ROVER[0], 1.0, ROVER[2]] }));
      actions.sfx('pop');
      actions.say(LINES.roverSleep);
      actions.taskProgress(1, 3);
      setStep(1);
    } else if (who === 'lander' && s === 2) {
      landerSleepGoal.current = 1;
      nightGoal.current = 1;
      setDream((d) => ({ n: d.n + 1, at: [LANDER[0] + landerX.current, 2.2, LANDER[2]] }));
      actions.sfx('star');
      actions.say(LINES.landerSleep);
      actions.taskProgress(3, 3);
      setStep(3);
      timers.later(() => actions.completeTask(), 3200);
    } else if (who === 'lander' && s === 0) {
      actions.say(LINES.tapRover);
    } else if (who === 'lander' && s === 1) {
      // Tapping Vikram at the hop step works just like the HOP button.
      hop();
    }
  }

  function hop() {
    if (phase !== 'task' || stepRef.current !== 1 || hopT.current >= 0) return;
    if (rules.hopGauge) {
      const assist = misses.current >= 2;
      const verdict = judgeHop(live.gauge, assistedWindow(rules.window, assist));
      if (verdict !== 'good') {
        misses.current += 1;
        thrust.current = 0.6;
        timers.later(() => (thrust.current = 0), 250);
        actions.sfx('thud');
        if (misses.current === 2) {
          const w = assistedWindow(rules.window, true);
          live.gaugeWindow = [w[0], w[1]];
          store().patch('night', { assist: true });
          setIdleHint(true);
          actions.say(LINES.hopAssist);
        } else actions.say(verdict === 'low' ? LINES.hopLow : LINES.hopHigh);
        return;
      }
    }
    hopT.current = 0;
    store().patch('night', { busy: true });
    actions.sfx('launch');
  }

  useCommands((cmd) => {
    if (cmd.type === 'hop') hop();
    if (cmd.type === 'tuck') tuck(cmd.who);
  });

  useFrame((state, dt) => {
    const stepDt = Math.min(dt, 0.25);
    const t = state.clock.elapsedTime;
    night.current += (nightGoal.current - night.current) * Math.min(1, stepDt * 0.8);
    roverSleep.current += (roverSleepGoal.current - roverSleep.current) * Math.min(1, stepDt * 3);
    landerSleep.current += (landerSleepGoal.current - landerSleep.current) * Math.min(1, stepDt * 3);
    panel.current = 0.28 - 0.26 * roverSleep.current;

    // Friendly blinks while awake.
    const blink = (Math.sin(t * 0.9) > 0.985 ? 1 : 0) * (reducedMotion ? 0 : 1);
    if (roverSleepGoal.current === 0) roverSleep.current = Math.max(roverSleep.current, blink);
    if (landerSleepGoal.current === 0) landerSleep.current = Math.max(landerSleep.current, Math.sin(t * 0.7 + 2) > 0.988 ? 1 : 0);

    // Senior hop gauge.
    if (phase === 'task' && stepRef.current === 1 && rules.hopGauge && hopT.current < 0) {
      gaugeClock.current += stepDt * (misses.current >= 2 ? 0.6 : 1);
      live.gauge = gaugeValue(gaugeClock.current, rules.gaugePeriod, rules.gaugeMax);
    }

    // The hop: squash, launch, ~40 cm up, land 30–40 cm away, squash again.
    let y = 0;
    squash.current = 1;
    if (hopT.current >= 0) {
      hopT.current += stepDt;
      const h = hopT.current;
      if (h < 0.35) {
        squash.current = 1 - 0.18 * Math.sin((h / 0.35) * Math.PI * 0.5);
        thrust.current = 0.5;
      } else if (h < 1.55) {
        const k = (h - 0.35) / 1.2;
        const arc = hopArc(k);
        y = arc.up * HOP_UP;
        landerX.current = arc.side * HOP_SIDE;
        squash.current = 1.08 - 0.08 * k;
        thrust.current = k < 0.45 ? 1 : 0.2;
        if (h - stepDt < 0.35) setDust((n) => n + 1);
      } else if (h < 2.1) {
        const k = (h - 1.55) / 0.55;
        squash.current = 1 - 0.16 * Math.sin(k * Math.PI) * (1 - k);
        thrust.current = 0;
        if (h - stepDt < 1.55) {
          setDust((n) => n + 1);
          actions.sfx('thud');
        }
      } else {
        hopT.current = -1;
        nightGoal.current = 0.6;
        if (phase === 'task') {
          actions.sfx('star');
          actions.say(LINES.hopGood);
          actions.taskProgress(2, 3);
          setStep(2);
        }
      }
    }
    if (lander.current) lander.current.position.set(LANDER[0] + landerX.current, y, LANDER[2]);

    if (phase === 'task' && !idleHint && band !== 'tiny' && performance.now() - lastAct.current > 12000) setIdleHint(true);
  });

  const hand = phase === 'task' && (band === 'tiny' || idleHint);
  const handPos: V3 | null = step === 0 ? [ROVER[0], 1.6, ROVER[2]] : step === 2 ? [LANDER[0] + HOP_SIDE, 3.0, LANDER[2]] : null;
  const zzzR = step >= 1;
  const zzzL = step >= 3;

  return (
    <group>
      <ShotCamera shot={HERO} entry={ENTRY} reducedMotion={reducedMotion} smooth={1.3} orbit={phase === 'explore'} onSettled={arriving ? onArrive : undefined} />
      <LunarSurface terrain={terrain} detail={quality.detail} shadows={quality.shadows} night={night} earth={[3.5, 2.9, -34]} earthRadius={2.6} sunColor="#ffd6a0" shadowBox={8} />

      <group ref={lander} position={LANDER}>
        <Tappable onTap={() => tuck('lander')} hitRadius={1.5} disabled={phase !== 'task'}>
          <group rotation={[0, 0.35, 0]}>
            <Vikram thrust={thrust} sleep={landerSleep} squash={squash} />
          </group>
        </Tappable>
        <LongShadow position={[0, 0, 0]} width={2.8} length={7} opacity={0.5} />
        <Zzz visible={zzzL} position={[0.4, 2.5, 0.3]} />
      </group>

      <group position={ROVER} rotation={[0, 2.5, 0]}>
        <Tappable onTap={() => tuck('rover')} hitRadius={0.9} disabled={phase !== 'task'}>
          <Pragyan sleep={roverSleep} panelTilt={panel} />
        </Tappable>
      </group>
      <LongShadow position={ROVER} width={1.1} length={3} opacity={0.45} />
      <Zzz visible={zzzR} position={[ROVER[0] + 0.1, 1.1, ROVER[2]]} small />

      {hand && handPos && <PointerHand position={handPos} scale={0.9} />}
      <Particles config={HOP_DUST} trigger={dust} position={[LANDER[0] + HOP_SIDE * 0.5, 0, LANDER[2]]} scale={quality.particleScale} />
      <Particles config={DREAM} trigger={dream.n} position={dream.at} scale={quality.particleScale} />
    </group>
  );
}

/** Three drifting "z"s above a sleeping robot. */
function Zzz({ visible, position, small = false }: { visible: boolean; position: V3; small?: boolean }) {
  const group = useRef<Group>(null);
  const t = useRef(0);
  const tex = useMemo(() => zzzTexture(), []);
  useFrame((_, dt) => {
    t.current += dt;
    const g = group.current;
    if (!g) return;
    g.visible = visible;
    for (let i = 0; i < g.children.length; i++) {
      const s = g.children[i] as Sprite;
      const k = (t.current * 0.45 + i / 3) % 1;
      const size = (small ? 0.28 : 0.4) * (0.6 + k * 0.8);
      s.scale.set(size, size, 1);
      s.position.set(Math.sin(k * 6 + i) * 0.15 + k * 0.3, k * (small ? 0.7 : 1), 0);
      s.material.opacity = Math.sin(k * Math.PI);
    }
  });
  return (
    <group ref={group} position={position} visible={false}>
      {[0, 1, 2].map((i) => (
        <sprite key={i} renderOrder={25} raycast={() => null}>
          <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}
