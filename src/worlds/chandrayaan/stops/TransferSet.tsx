import { Billboard, Line } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { CubicBezierCurve3, Quaternion, Vector3, type Group } from 'three';
import { Glow, Tappable } from '@/engine/kit';
import { RULES } from '../logic/bands';
import { fitAround, rotateZ, type Shot } from '../logic/camera';
import { faceRotationY, SRIHARIKOTA } from '../logic/geo';
import { createSeq, isDone, needsAssist, nextTarget, tapSeq, type SeqState } from '../logic/sequence';
import { LINES } from '../lines';
import { emojiTex, PointerHand } from '../parts/Marker';
import { Particles, type ParticleConfig } from '../parts/Particles';
import { Earth, Moon } from '../parts/Planets';
import { ShotCamera } from '../parts/ShotCamera';
import { IntegratedModule } from '../parts/Spacecraft';
import { numberTexture } from '../parts/textures';
import { isAfterTask, useOnTaskEnd, useOnTaskStart, useTimers, type StopProps } from './common';

type V3 = [number, number, number];

const EARTH: V3 = [-7.6, -1.3, 0];
const MOON: V3 = [7.6, 1.2, -1];
const SUN: V3 = [0.3, 0.45, 0.85];
const START = new Vector3(EARTH[0] + 1.5, EARTH[1] + 2.25, 0.6);
const MOON_R = 1.45;
/** Seconds to glide from the arc's end into the lunar orbit. */
const CAPTURE_BLEND = 0.8;
const END = new Vector3(MOON[0] - 1.75, MOON[1] + 1.15, -0.4);
const CURVE = new CubicBezierCurve3(START, new Vector3(-3.2, 4.6, 1.4), new Vector3(3.2, 4.9, 0.8), END);
const PATH: V3[] = CURVE.getSpacedPoints(90).map((p) => [p.x, p.y, p.z]);
const UP = new Vector3(0, 1, 0);

const SHOT: Shot = { target: [0, 1.3, 0], dir: [0, 0.22, 1], fit: [21, 8] };
const ENTRY: Shot = { target: [-4, 0, 0], dir: [-0.3, 0.4, 1], fit: [12, 7] };
/** On portrait screens the diorama is tipped so the Moon sits above the Earth (like the mission map). */
const PORTRAIT_TILT = 0.9;
const SHOT_PORTRAIT: Shot = fitAround(
  [[...EARTH, 2.3], [...MOON, MOON_R + 0.35], ...PATH.filter((_, i) => i % 6 === 0).map((p) => [...p, 0.95] as const)],
  PORTRAIT_TILT,
  [0, 0.22, 1],
);
const ENTRY_PORTRAIT: Shot = {
  ...ENTRY,
  target: rotateZ(ENTRY.target, PORTRAIT_TILT),
};

const SPARKLE: ParticleConfig = {
  count: 50,
  mode: 'sparkle',
  life: 1,
  spread: 2,
  speed: [1.2, 2.6],
  drag: 2,
  size: [0.35, 0.1],
  palette: ['#ffd23f', '#ffffff', '#9b7bff'],
  seed: 4,
};

/** Where waypoint i of n sits along the transfer arc. */
function waypointT(i: number, n: number): number {
  return (i + 1) / (n + 1);
}

/**
 * Stop 3 — trans-lunar injection → coast → lunar orbit insertion. Tap the glowing waypoints in order; the craft
 * zooms along the arc, then the Moon's gravity captures it into orbit.
 */
export function TransferSet(props: StopProps) {
  const { phase, band, quality, reducedMotion, actions, arriving, onArrive } = props;
  const portrait = useThree((s) => s.size.width < s.size.height * 0.95);
  const tilt = portrait ? PORTRAIT_TILT : 0;
  const rules = RULES[band].transfer;
  const n = rules.waypoints;
  const timers = useTimers();
  const craft = useRef<Group>(null);
  const thrust = useRef(0);
  const seq = useRef<SeqState>(createSeq(n, true));
  const [state, setState] = useState<SeqState>(seq.current);
  const [flown, setFlown] = useState(0);
  const [burst, setBurst] = useState({ n: 0, at: [0, 0, 0] as V3 });
  const [wobble, setWobble] = useState<{ i: number; n: number }>({
    i: -1,
    n: 0,
  });
  const fly = useRef({ from: 0, to: 0, t: 1, arrived: true });
  const mode = useRef<'park' | 'fly' | 'capture' | 'orbit'>(isAfterTask(phase) ? 'orbit' : 'park');
  const clock = useRef(0);
  const captureT = useRef(0);
  /** Where along the arc (0..1) the craft is right now. */
  const curU = useRef(0);
  const tmp = useMemo(
    () => ({
      p: new Vector3(),
      q: new Vector3(),
      tan: new Vector3(),
      quat: new Quaternion(),
    }),
    [],
  );
  const waypoints = useMemo(() => Array.from({ length: n }, (_, i) => CURVE.getPointAt(waypointT(i, n)).toArray() as V3), [n]);

  useOnTaskStart(phase, () => {
    timers.clear();
    seq.current = createSeq(n, true);
    setState(seq.current);
    setFlown(0);
    fly.current = { from: 0, to: 0, t: 1, arrived: true };
    mode.current = 'park';
    actions.taskProgress(0, n);
  });

  useOnTaskEnd(phase, () => {
    timers.clear();
    if (mode.current !== 'orbit') {
      mode.current = 'orbit';
      captureT.current = 0;
      setFlown(1);
    }
  });

  function tap(i: number) {
    if (phase !== 'task' || mode.current === 'capture' || mode.current === 'orbit') return;
    const r = tapSeq(seq.current, i);
    if (r.result === 'repeat') return;
    seq.current = r.state;
    setState(r.state);
    if (r.result === 'miss') {
      actions.sfx('thud');
      setWobble((w) => ({ i, n: w.n + 1 }));
      actions.say(LINES.wayMiss);
      return;
    }
    const target = waypointT(i, n);
    // A tap mid-flight simply re-aims the craft from wherever it is now (quick tappers are never ignored).
    fly.current = {
      from: mode.current === 'park' ? 0 : curU.current,
      to: target,
      t: 0,
      arrived: false,
    };
    mode.current = 'fly';
    thrust.current = 1;
    actions.sfx('collect');
    setBurst((b) => ({ n: b.n + 1, at: waypoints[i] as V3 }));
    actions.taskProgress(r.state.done.length, n);
    if (r.result === 'complete') {
      timers.later(() => {
        fly.current = { from: target, to: 1, t: 0, arrived: false };
        mode.current = 'capture';
        captureT.current = 0;
      }, 1300);
    } else actions.say(LINES.wayGood);
  }

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.25);
    clock.current += step;
    const g = craft.current;
    if (!g) return;
    const m = mode.current;
    if (m === 'park') {
      // Parking orbit around Earth, ready for the TLI burn.
      const a = clock.current * (reducedMotion ? 0.2 : 0.7);
      tmp.p.set(EARTH[0] + Math.cos(a) * 2.6, EARTH[1] + Math.sin(a) * 1.3, Math.sin(a) * 1.4);
      tmp.q.set(EARTH[0] + Math.cos(a + 0.05) * 2.6, EARTH[1] + Math.sin(a + 0.05) * 1.3, Math.sin(a + 0.05) * 1.4);
      if (phase === 'task') {
        tmp.p.copy(START);
        tmp.q.copy(CURVE.getPointAt(0.01, tmp.q));
      }
      thrust.current = 0;
    } else if (m === 'fly' || m === 'capture') {
      const f = fly.current;
      f.t = Math.min(1, f.t + step / (m === 'capture' ? 1.4 : 1.0));
      const e = f.t * f.t * (3 - 2 * f.t);
      const u = f.from + (f.to - f.from) * e;
      curU.current = u;
      CURVE.getPointAt(Math.min(1, u), tmp.p);
      CURVE.getPointAt(Math.min(1, u + 0.01), tmp.q);
      if (u >= 0.999) tmp.q.copy(tmp.p).add(tmp.tan.set(0.2, -0.1, 0));
      thrust.current = f.t < 0.6 ? 1 : f.t < 1 ? 0.2 : 0;
      if (f.t >= 1 && !f.arrived) {
        f.arrived = true;
        if (m === 'fly') {
          // Hold position at the reached waypoint until the next tap.
          setFlown(f.to);
          thrust.current = 0;
        } else {
          mode.current = 'orbit';
          captureT.current = 0;
          setFlown(1);
          if (phase === 'task') {
            actions.sfx('star');
            actions.say(LINES.captured);
            timers.later(() => actions.completeTask(), 2400);
          }
        }
      }
    } else {
      // Captured: circling the Moon.
      captureT.current += step;
      const a = captureT.current * 1.1 + 2.4;
      tmp.p.set(MOON[0] + Math.cos(a) * 2.15, MOON[1] + Math.sin(a) * 0.65, MOON[2] + Math.sin(a) * 1.8);
      tmp.q.set(MOON[0] + Math.cos(a + 0.05) * 2.15, MOON[1] + Math.sin(a + 0.05) * 0.65, MOON[2] + Math.sin(a + 0.05) * 1.8);
      // Ease from the end of the transfer arc into the circular orbit (no pop at capture).
      if (captureT.current < CAPTURE_BLEND) {
        const k = captureT.current / CAPTURE_BLEND;
        const e = k * k * (3 - 2 * k);
        tmp.p.lerpVectors(END, tmp.p, e);
        tmp.q.lerpVectors(END, tmp.q, e);
      }
      thrust.current = 0;
    }
    g.position.copy(tmp.p);
    tmp.tan.copy(tmp.q).sub(tmp.p);
    if (tmp.tan.lengthSq() > 1e-8) {
      tmp.quat.setFromUnitVectors(UP, tmp.tan.normalize());
      g.quaternion.slerp(tmp.quat, Math.min(1, step * 8));
    }
  });

  const next = nextTarget(state);
  const assist = band === 'tiny' || needsAssist(state);
  const flownPts = useMemo(() => PATH.slice(0, Math.max(2, Math.round(flown * (PATH.length - 1)) + 1)), [flown]);
  const earthRot = faceRotationY(SRIHARIKOTA.lon) + 0.6;
  const handAt = phase === 'task' && assist && next !== null ? waypoints[next] : undefined;
  // The hand hangs straight down in screen space, so it is placed in world space above the tipped waypoint.
  const hand = handAt ? rotateZ(handAt, tilt) : null;

  return (
    <group>
      <ShotCamera
        shot={portrait ? SHOT_PORTRAIT : SHOT}
        entry={portrait ? ENTRY_PORTRAIT : ENTRY}
        reducedMotion={reducedMotion}
        smooth={1.3}
        orbit={phase === 'explore'}
        onSettled={arriving ? onArrive : undefined}
      />
      <directionalLight position={[SUN[0] * 30, SUN[1] * 30, SUN[2] * 30]} intensity={2.4} color="#fff2dc" />
      <directionalLight position={[-10, -3, -12]} intensity={0.7} color="#9fb4ff" />

      {/* Planets stay upright (outside the tipped group) at their tipped positions. */}
      <group position={rotateZ(EARTH, tilt)}>
        <Earth radius={1.9} sun={SUN} rotationY={earthRot} detail={quality.detail * 0.8} spin={reducedMotion ? 0 : 0.02} />
      </group>
      <group position={rotateZ(MOON, tilt)}>
        <Moon radius={MOON_R} sun={SUN} detail={quality.detail * 0.8} />
      </group>

      <group rotation={[0, 0, tilt]}>
        <Line points={PATH} color="#b9a6ff" lineWidth={2} dashed dashSize={0.25} gapSize={0.2} transparent opacity={0.45} />
        {flown > 0 && <Line points={flownPts} color="#ffd23f" lineWidth={3} transparent opacity={0.95} />}

        {waypoints.map((pos, i) => {
          const doneI = isDone(state, i);
          const isNext = next === i && phase === 'task';
          return (
            <Waypoint
              key={i}
              position={pos}
              index={i}
              numbered={rules.numbered}
              done={doneI}
              next={isNext}
              dim={band === 'tiny' && !isNext && !doneI}
              wobble={wobble.i === i ? wobble.n : 0}
              active={phase === 'task'}
              onTap={() => tap(i)}
            />
          );
        })}
        <Particles config={SPARKLE} trigger={burst.n} scale={quality.particleScale} position={burst.at} />

        <group ref={craft} position={[START.x, START.y, START.z]}>
          <group scale={0.3} rotation={[0, Math.PI / 4, 0]}>
            <IntegratedModule thrust={thrust} />
          </group>
        </group>
      </group>
      {hand && <PointerHand position={[hand[0], hand[1] + 1.05, hand[2]]} scale={1.1} />}
    </group>
  );
}

function Waypoint({
  position,
  index,
  numbered,
  done,
  next,
  dim,
  wobble,
  active,
  onTap,
}: {
  position: V3;
  index: number;
  numbered: boolean;
  done: boolean;
  next: boolean;
  dim: boolean;
  wobble: number;
  active: boolean;
  onTap: () => void;
}) {
  const g = useRef<Group>(null);
  const t = useRef(index);
  const wob = useRef(0);
  const last = useRef(wobble);
  useFrame((_, dt) => {
    t.current += dt;
    if (wobble !== last.current) {
      last.current = wobble;
      wob.current = 1;
    }
    wob.current = Math.max(0, wob.current - dt * 2.2);
    if (!g.current) return;
    const bounce = next ? Math.abs(Math.sin(t.current * 3.4)) * 0.25 : Math.sin(t.current * 1.5) * 0.05;
    g.current.position.set(position[0] + Math.sin(wob.current * 25) * wob.current * 0.25, position[1] + bounce, position[2]);
    const s = (done ? 0.7 : next ? 1.15 : dim ? 0.75 : 1) * (1 + (next ? Math.sin(t.current * 5) * 0.06 : 0));
    g.current.scale.setScalar(s);
  });
  const map = done ? emojiTex('✅') : numbered ? numberTexture(index + 1, '#7b61ff') : emojiTex('⭐');
  return (
    <group ref={g} position={position}>
      <Tappable onTap={onTap} hitRadius={0.95} disabled={!active || done}>
        <Billboard>
          {(next || !dim) && !done && <Glow color={next ? '#ffd23f' : '#b9a6ff'} scale={next ? 2.8 : 1.6} opacity={next ? 0.95 : 0.5} />}
          <mesh renderOrder={12}>
            <torusGeometry args={[0.5, 0.07, 10, 40]} />
            <meshBasicMaterial color={done ? '#2fbf71' : next ? '#ffd23f' : '#cbbdff'} toneMapped={false} transparent opacity={dim ? 0.5 : 1} />
          </mesh>
          <mesh renderOrder={13} position={[0, 0, 0.01]}>
            <planeGeometry args={[0.72, 0.72]} />
            <meshBasicMaterial map={map} transparent toneMapped={false} opacity={dim ? 0.55 : 1} depthWrite={false} />
          </mesh>
        </Billboard>
      </Tappable>
    </group>
  );
}
