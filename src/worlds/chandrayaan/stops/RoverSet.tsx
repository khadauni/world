import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IcosahedronGeometry, type BufferAttribute, Object3D, Quaternion, Vector3, type Group, type InstancedMesh, type Mesh, type Sprite } from 'three';
import { Glow, Tappable } from '@/engine/kit';
import { RULES } from '../logic/bands';
import type { Shot } from '../logic/camera';
import { samplesFor, type MoonElement } from '../logic/elements';
import { createSeq, isDone, tapSeq, type SeqState } from '../logic/sequence';
import { valueNoise, type FlatSpot } from '../logic/terrain';
import { LINES } from '../lines';
import { LunarSurface, useLunarTerrain } from '../parts/LunarSurface';
import { PointerHand } from '../parts/Marker';
import { mats } from '../parts/materials';
import { Particles, type ParticleConfig } from '../parts/Particles';
import { ShotCamera } from '../parts/ShotCamera';
import { Pragyan, Vikram } from '../parts/Spacecraft';
import { elementTexture, softShadowTexture, trackTexture } from '../parts/textures';
import { LongShadow } from '../parts/MoonGround';
import { isAfterTask, useOnTaskEnd, useOnTaskStart, useTimers, type StopProps } from './common';

type V3 = [number, number, number];

const LANDER: V3 = [-2.6, 0, -0.8];
const RAMP_TOP: V3 = [LANDER[0] + 0.95, 0.92, LANDER[2] + 0.1];
const RAMP_FOOT: V3 = [LANDER[0] + 2.75, 0.02, LANDER[2] + 0.1];
const PARK: V3 = [1.3, 0, 0.7];
const ROCKS: V3[] = [
  [2.9, 0, 1.7],
  [-0.9, 0, 2.4],
  [4.1, 0, -1.3],
  [1.3, 0, 3.4],
  [5.2, 0, 1.4],
];
const FLATS: FlatSpot[] = [
  { x: LANDER[0], z: LANDER[2], r: 3.2 },
  { x: 1.6, z: 1.0, r: 5.2 },
];
const HERO: Shot = { target: [0.9, 1.0, 0.8], dir: [0.5, 0.24, 1], fit: [10.5, 5.2] };
const ENTRY: Shot = { target: [0, 4, 0], dir: [0.4, 0.8, 1], fit: [24, 14] };
const MAX_TRACKS = 360;
/** Earth half-risen over the horizon on the right (wide screens); higher and nearer the centre on narrow portrait ones. */
const EARTH_WIDE: V3 = [3, 0.9, -40];
const EARTH_PORTRAIT: V3 = [-7, 4.5, -40];

const PLASMA: ParticleConfig = {
  count: 70,
  mode: 'sparkle',
  life: 1.1,
  spread: 2,
  speed: [0.8, 2.2],
  drag: 1.6,
  gravity: [0, -0.8, 0],
  size: [0.2, 0.05],
  palette: ['#ffffff', '#ff7ad9', '#fff27a'],
  seed: 41,
};

/** A lumpy little Moon rock (noise-displaced icosahedron, flat shaded). */
function rockGeometry(seed: number): IcosahedronGeometry {
  const g = new IcosahedronGeometry(0.34, 1);
  const pos = g.attributes.position as BufferAttribute;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = valueNoise(v.x * 3 + seed, v.z * 3 - seed, seed) * 0.22 + valueNoise(v.y * 5, v.x * 5, seed + 3) * 0.08;
    v.multiplyScalar(1 + n);
    v.y *= 0.72;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Stop 6 — Pragyan rolls down the ramp and does science: tap a glowing rock, the rover drives over (leaving
 * wheel tracks), fires its LIBS laser, and the element it finds pops out (sulphur first).
 */
export function RoverSet(props: StopProps) {
  const { phase, band, quality, reducedMotion, actions, arriving, onArrive } = props;
  const portrait = useThree((s) => s.size.width < s.size.height * 0.95);
  const rules = RULES[band].rover;
  const samples = useMemo(() => samplesFor(rules.samples), [rules.samples]);
  const rocks = ROCKS.slice(0, samples.length);
  const terrain = useLunarTerrain(19, 90, 45, FLATS);
  const timers = useTimers();
  const rover = useRef<Group>(null);
  const wheelSpin = useRef(0);
  const panelTilt = useRef(0.28);
  const tracks = useRef<InstancedMesh>(null);
  const trackCount = useRef(0);
  const laser = useRef<Mesh>(null);
  const seq = useRef<SeqState>(createSeq(samples.length, false));
  const [state, setState] = useState<SeqState>(seq.current);
  const [zap, setZap] = useState({ n: 0, at: [0, 0, 0] as V3 });
  const [revealed, setRevealed] = useState<number[]>(isAfterTask(phase) ? samples.map((_, i) => i) : []);
  const [handHint, setHandHint] = useState(false);
  const lastAct = useRef(performance.now());
  /** A rock tapped while Pragyan was busy (driven to next), or -1. */
  const queued = useRef(-1);
  const pose = useRef({ x: RAMP_TOP[0], z: RAMP_TOP[2], heading: 0, y: RAMP_TOP[1], pitch: -0.45 });
  const drive = useRef<{ mode: 'ramp' | 'toPark' | 'idle' | 'turn' | 'go' | 'zap' | 'happy'; target: number; t: number; tx: number; tz: number; dist: number }>({
    mode: isAfterTask(phase) ? 'idle' : 'ramp',
    target: -1,
    t: 0,
    tx: PARK[0],
    tz: PARK[2],
    dist: 0,
  });
  const tmp = useMemo(() => ({ o: new Object3D(), a: new Vector3(), b: new Vector3(), q: new Quaternion(), up: new Vector3(0, 1, 0) }), []);
  const rockGeos = useMemo(() => ROCKS.map((_, i) => rockGeometry(i * 3.7 + 1)), []);

  // Start parked if we arrive after the task (quiz/reward) or with reduced motion.
  useLayoutEffect(() => {
    if (isAfterTask(phase) || reducedMotion) {
      pose.current = { x: PARK[0], z: PARK[2], heading: 0.4, y: 0, pitch: 0 };
      drive.current.mode = 'idle';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useOnTaskStart(phase, () => {
    timers.clear();
    seq.current = createSeq(samples.length, false);
    setState(seq.current);
    setRevealed([]);
    setHandHint(false);
    lastAct.current = performance.now();
    if (drive.current.mode === 'ramp' || drive.current.mode === 'toPark') {
      pose.current = { x: PARK[0], z: PARK[2], heading: 0, y: 0, pitch: 0 };
    }
    drive.current = { ...drive.current, mode: 'idle', target: -1 };
    queued.current = -1;
    actions.taskProgress(0, samples.length);
  });

  useOnTaskEnd(phase, () => {
    timers.clear();
    const all = samples.map((_, i) => i);
    let st = seq.current;
    for (const i of all) st = tapSeq(st, i).state;
    seq.current = st;
    setState(st);
    setRevealed(all);
    queued.current = -1;
    if (drive.current.mode !== 'happy' && drive.current.mode !== 'idle') drive.current = { ...drive.current, mode: 'idle' };
  });

  /** Turn towards rock i and drive up to it (stopping just short, laser range). */
  function driveTo(i: number) {
    const rock = rocks[i] as V3;
    const p = pose.current;
    const dx = rock[0] - p.x;
    const dz = rock[2] - p.z;
    const len = Math.hypot(dx, dz) || 1;
    const stop = Math.max(0, len - 0.95);
    const d = drive.current;
    d.mode = 'turn';
    d.target = i;
    d.t = 0;
    d.tx = p.x + (dx / len) * stop;
    d.tz = p.z + (dz / len) * stop;
    d.dist = 0;
    lastAct.current = performance.now();
    setHandHint(false);
    actions.sfx('tap');
  }

  function tapRock(i: number) {
    if (phase !== 'task' || isDone(seq.current, i)) return;
    const d = drive.current;
    if (d.mode === 'idle') driveTo(i);
    else if (d.mode !== 'happy' && i !== d.target) {
      // Eager tappers are never ignored: the next rock is queued until Pragyan finishes this one.
      queued.current = i;
      actions.sfx('tap');
    }
  }

  function stampTracks() {
    const m = tracks.current;
    if (!m) return;
    const p = pose.current;
    const fx = Math.cos(p.heading);
    const fz = -Math.sin(p.heading);
    for (let side = -1; side <= 1; side += 2) {
      const i = trackCount.current % MAX_TRACKS;
      tmp.o.position.set(p.x - fx * 0.3 + fz * 0.35 * side * -1, 0.03, p.z - fz * 0.3 + fx * 0.35 * side);
      tmp.o.rotation.set(-Math.PI / 2, 0, p.heading);
      tmp.o.scale.set(1, 1, 1);
      tmp.o.updateMatrix();
      m.setMatrixAt(i, tmp.o.matrix);
      trackCount.current += 1;
    }
    m.count = Math.min(MAX_TRACKS, trackCount.current);
    m.instanceMatrix.needsUpdate = true;
  }

  useFrame((state, dt) => {
    const step = Math.min(dt, 0.25);
    const t = state.clock.elapsedTime;
    const d = drive.current;
    const p = pose.current;
    let moved = 0;
    if (d.mode === 'ramp' && phase !== 'travel') {
      // Roll down Vikram's ramp onto the Moon.
      d.t = Math.min(1, d.t + step / 3.2);
      const k = d.t * d.t * (3 - 2 * d.t);
      const nx = RAMP_TOP[0] + (RAMP_FOOT[0] - RAMP_TOP[0]) * k;
      moved = Math.abs(nx - p.x);
      p.x = nx;
      p.z = RAMP_TOP[2];
      p.y = RAMP_TOP[1] + (RAMP_FOOT[1] - RAMP_TOP[1]) * k;
      p.pitch = d.t < 0.97 ? -0.45 : 0;
      if (d.t >= 1) {
        d.mode = 'toPark';
        d.tx = PARK[0];
        d.tz = PARK[2];
      }
    } else if (d.mode === 'toPark' || d.mode === 'go') {
      const dx = d.tx - p.x;
      const dz = d.tz - p.z;
      const len = Math.hypot(dx, dz);
      const want = Math.atan2(-dz, dx);
      p.heading += angleStep(p.heading, want, step * 3);
      const v = Math.min(len, step * 1.15);
      if (len > 0.02) {
        p.x += (dx / len) * v;
        p.z += (dz / len) * v;
        moved = v;
      }
      p.y = 0;
      p.pitch = 0;
      if (len <= 0.03) {
        if (d.mode === 'toPark') d.mode = 'idle';
        else {
          d.mode = 'zap';
          d.t = 0;
          const rock = rocks[d.target] as V3;
          setZap((z) => ({ n: z.n + 1, at: [rock[0], 0.3, rock[2]] }));
          actions.sfx('launch');
          actions.say(LINES.zap);
        }
      }
    } else if (d.mode === 'turn') {
      const want = Math.atan2(-(d.tz - p.z), d.tx - p.x);
      const delta = angleStep(p.heading, want, step * 3);
      p.heading += delta;
      if (Math.abs(delta) < 0.001) d.mode = 'go';
    } else if (d.mode === 'zap') {
      d.t += step;
      if (d.t > 1.1 && phase !== 'task') d.mode = 'idle';
      else if (d.t > 1.1) {
        const i = d.target;
        const r = tapSeq(seq.current, i);
        seq.current = r.state;
        setState(r.state);
        setRevealed((v) => [...v, i]);
        const el = samples[i] as MoonElement;
        actions.sfx('collect');
        actions.say(el.cheer);
        actions.taskProgress(r.state.done.length, samples.length);
        lastAct.current = performance.now();
        if (r.result === 'complete') {
          d.mode = 'happy';
          d.t = 0;
          timers.later(() => {
            actions.sfx('star');
            actions.say(LINES.roverDone);
          }, 1600);
          timers.later(() => actions.completeTask(), 3800);
        } else {
          d.mode = 'idle';
          const q = queued.current;
          queued.current = -1;
          if (q >= 0 && !isDone(r.state, q)) driveTo(q);
        }
      }
    } else if (d.mode === 'happy') {
      d.t += step;
    }

    wheelSpin.current += moved / 0.11;
    if (moved > 0 && p.y < 0.05) {
      d.dist += moved;
      if (d.dist > 0.13) {
        d.dist = 0;
        stampTracks();
      }
    }
    const g = rover.current;
    if (g) {
      const wiggle = d.mode === 'happy' ? Math.sin(d.t * 14) * 0.18 * Math.exp(-d.t * 0.6) : 0;
      const hop = d.mode === 'happy' ? Math.abs(Math.sin(d.t * 7)) * 0.08 * Math.exp(-d.t * 0.6) : 0;
      g.position.set(p.x, p.y + hop, p.z);
      g.rotation.set(0, p.heading + wiggle, p.pitch);
    }

    // LIBS laser beam from the rover's nose to the rock.
    const beam = laser.current;
    if (beam) {
      const on = d.mode === 'zap' && d.t < 0.9;
      beam.visible = on;
      if (on) {
        const rock = rocks[d.target] as V3;
        tmp.a.set(p.x + Math.cos(p.heading) * 0.34, 0.36, p.z - Math.sin(p.heading) * 0.34);
        tmp.b.set(rock[0], 0.18, rock[2]);
        const len = tmp.a.distanceTo(tmp.b);
        beam.position.copy(tmp.a).add(tmp.b).multiplyScalar(0.5);
        tmp.b.sub(tmp.a).normalize();
        tmp.q.setFromUnitVectors(tmp.up, tmp.b);
        beam.quaternion.copy(tmp.q);
        beam.scale.set(1 + Math.sin(t * 60) * 0.3, len, 1 + Math.sin(t * 60) * 0.3);
      }
    }

    if (phase === 'task' && !handHint && band !== 'tiny' && d.mode === 'idle' && performance.now() - lastAct.current > 12000) setHandHint(true);
  });

  const nextRock = rocks.findIndex((_, i) => !isDone(state, i));
  const showHand = phase === 'task' && drive.current.mode === 'idle' && nextRock >= 0 && (band === 'tiny' || handHint);
  const handRock = rocks[nextRock];

  return (
    <group>
      <ShotCamera shot={HERO} entry={ENTRY} reducedMotion={reducedMotion} smooth={1.3} orbit={phase === 'explore'} onSettled={arriving ? onArrive : undefined} />
      <LunarSurface terrain={terrain} detail={quality.detail} shadows={quality.shadows} earth={portrait ? EARTH_PORTRAIT : EARTH_WIDE} earthRadius={3.2} shadowBox={9} />

      <group position={LANDER} rotation={[0, 0.25, 0]}>
        <Vikram />
      </group>
      <LongShadow position={LANDER} width={2.8} length={7} opacity={0.55} />
      <Ramp />

      <group ref={rover} position={[RAMP_TOP[0], RAMP_TOP[1], RAMP_TOP[2]]}>
        <Pragyan wheelSpin={wheelSpin} panelTilt={panelTilt} />
        <mesh position={[-0.1, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <planeGeometry args={[1.2, 0.95]} />
          <meshBasicMaterial map={softShadowTexture()} color="#000000" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      </group>

      <instancedMesh ref={tracks} args={[undefined, undefined, MAX_TRACKS]} count={0} frustumCulled={false} renderOrder={1}>
        <planeGeometry args={[0.16, 0.12]} />
        <meshBasicMaterial map={trackTexture()} transparent depthWrite={false} color="#3a3530" />
      </instancedMesh>

      {rocks.map((pos, i) => (
        <Rock
          key={i}
          position={pos}
          geometry={rockGeos[i] as IcosahedronGeometry}
          element={samples[i] as MoonElement}
          done={isDone(state, i)}
          revealed={revealed.includes(i)}
          active={phase === 'task'}
          showSymbol={rules.showSymbols}
          onTap={() => tapRock(i)}
        />
      ))}

      <mesh ref={laser} visible={false} renderOrder={8}>
        <cylinderGeometry args={[0.025, 0.025, 1, 8, 1, true]} />
        <meshBasicMaterial color="#ff4fd8" toneMapped={false} transparent opacity={0.95} />
      </mesh>
      <Particles config={PLASMA} trigger={zap.n} position={zap.at} scale={quality.particleScale} />
      {showHand && handRock && <PointerHand position={[handRock[0], 1.35, handRock[2]]} scale={0.9} />}
    </group>
  );
}

function angleStep(from: number, to: number, max: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.max(-max, Math.min(max, d));
}

/** Vikram's deployed side ramp (the rover rolled down it on 23–24 Aug 2023). */
function Ramp() {
  const len = Math.hypot(RAMP_FOOT[0] - RAMP_TOP[0], RAMP_FOOT[1] - RAMP_TOP[1]);
  const angle = Math.atan2(RAMP_TOP[1] - RAMP_FOOT[1], RAMP_FOOT[0] - RAMP_TOP[0]);
  const mid: V3 = [(RAMP_TOP[0] + RAMP_FOOT[0]) / 2, (RAMP_TOP[1] + RAMP_FOOT[1]) / 2 - 0.04, RAMP_TOP[2]];
  return (
    <group position={mid} rotation={[0, 0, -angle]}>
      <mesh material={mats.silver()}>
        <boxGeometry args={[len, 0.04, 0.95]} />
      </mesh>
      {[-0.45, 0.45].map((z) => (
        <mesh key={z} position={[0, 0.05, z]} material={mats.gold()}>
          <boxGeometry args={[len, 0.08, 0.05]} />
        </mesh>
      ))}
    </group>
  );
}

function Rock({
  position,
  geometry,
  element,
  done,
  revealed,
  active,
  showSymbol,
  onTap,
}: {
  position: V3;
  geometry: IcosahedronGeometry;
  element: MoonElement;
  done: boolean;
  revealed: boolean;
  active: boolean;
  showSymbol: boolean;
  onTap: () => void;
}) {
  const ring = useRef<Mesh>(null);
  const badge = useRef<Sprite>(null);
  const t = useRef(position[0]);
  const pop = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(t.current * 4) * (done ? 0 : 0.08));
    if (badge.current) {
      pop.current = revealed ? Math.min(1, pop.current + dt * 2.2) : 0;
      const k = pop.current;
      const bounce = k < 1 ? Math.sin(k * Math.PI) * 0.25 : 0;
      const s = (0.9 + bounce) * Math.min(1, k * 1.6);
      badge.current.visible = k > 0;
      badge.current.scale.set(s, s, 1);
      badge.current.position.y = 0.7 + k * 0.55 + Math.sin(t.current * 1.8) * 0.05;
    }
  });
  return (
    <group position={position}>
      <Tappable onTap={onTap} hitRadius={0.85} disabled={!active || done} hoverScale={1.12}>
        <mesh geometry={geometry} position={[0, 0.16, 0]} rotation={[0.3, position[0], 0.2]} castShadow>
          <meshStandardMaterial color={done ? '#8d8a86' : '#a8a39c'} roughness={0.95} flatShading emissive={element.color} emissiveIntensity={done ? 0.05 : 0.18} />
        </mesh>
      </Tappable>
      <LongShadow position={[0, 0, 0]} width={0.7} length={2.2} opacity={0.45} />
      <mesh ref={ring} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.64, 40]} />
        <meshBasicMaterial color={done ? '#2fbf71' : '#7dffcf'} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      {!done && active && <Glow color="#7dffcf" scale={1.6} opacity={0.45} position={[0, 0.3, 0]} />}
      <sprite ref={badge} visible={false} renderOrder={30} raycast={() => null}>
        <spriteMaterial map={elementTexture(element.symbol, element.name, element.color, showSymbol)} transparent depthTest={false} toneMapped={false} />
      </sprite>
    </group>
  );
}
