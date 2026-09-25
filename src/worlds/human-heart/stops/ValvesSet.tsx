import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState, type RefObject } from 'react';
import { AdditiveBlending, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry, Path, Shape, Vector2, type Group, type Mesh } from 'three';
import { tier } from '@/core/tier';
import { glowTexture, Tappable } from '@/engine/kit';
import { VALVE_LINES, pick } from '../content/lines';
import { PART_INFO } from '../content/parts';
import { tuning } from '../logic/bands';
import { valveOpen } from '../logic/beat';
import type { Shot } from '../logic/camera';
import { VALVES, type ValveId } from '../logic/ids';
import { closedSpline, type P2 } from '../logic/section';
import { VALVE_FLAPS, VALVE_KIND, tapValve, valvesStart, type ValvesState } from '../logic/valves';
import { BeatDriver } from '../parts/BeatDriver';
import { Burst, PopWords, type BurstHandle, type PopWordHandle } from '../parts/Burst';
import { TissueMaterial } from '../parts/materials';
import { PALETTE } from '../parts/palette';
import { ShotCamera } from '../parts/ShotCamera';
import { Tag } from '../parts/Tag';
import { Valve } from '../parts/Valve';
import { ValveFlow } from '../parts/ValveFlow';
import { useSpin } from '../parts/useSpin';
import { beat } from '../store';
import { useOnTaskEnd, useOnTaskStart, useSayThrottle, useTimers, type StopProps } from './common';
import { useDisposable } from '../parts/dispose';

/** The valve plane seen from above (anterior = towards the viewer), like the real "flower" of four valves. */
const LAYOUT: Record<ValveId, { x: number; z: number; r: number }> = {
  tricuspid: { x: -1.28, z: -0.5, r: 0.52 },
  mitral: { x: 1.22, z: -0.78, r: 0.5 },
  aortic: { x: 0.04, z: 0.06, r: 0.44 },
  pulmonary: { x: 0.46, z: 1.28, r: 0.42 },
};
/** Reused emitter position for backflow drips (no per-emission allocations). */
const DRIP_AT: [number, number, number] = [0, 0.2, 0];
const SIDE: Record<ValveId, 'right' | 'left'> = { tricuspid: 'right', pulmonary: 'right', mitral: 'left', aortic: 'left' };

const PLATE: readonly P2[] = [
  [-1.98, 0.5],
  [-1.62, 1.28],
  [-0.62, 1.2],
  [0.2, 1.58],
  [1.34, 1.58],
  [1.98, 0.9],
  [1.74, 0.0],
  [1.2, -0.52],
  [1.16, -1.62],
  [0.46, -2.02],
  [-0.3, -1.66],
  [-0.56, -0.82],
  [-1.42, -0.32],
];

const SHOT: Shot = { target: [0, 0.05, 0.25], dir: [0, 1.35, 1], fit: [4.7, 3.7] };
/** During the task the banner covers more of the top: frame a little taller so back columns' tags stay clear. */
const TASK_SHOT: Shot = { target: [0, 0.2, 0.05], dir: [0, 1.35, 1], fit: [4.9, 4.5] };
const ENTRY: Shot = { target: [0, 0, 0], dir: [0.4, 0.6, 1], fit: [10, 9] };

function plateGeometry(): ExtrudeGeometry {
  const shape = new Shape(closedSpline(PLATE, 6).map((p) => new Vector2(p[0], p[1])));
  for (const id of VALVES) {
    const l = LAYOUT[id];
    const hole = new Path();
    hole.absarc(l.x, -l.z, l.r * 1.02, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const g = new ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 32 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -0.09, 0);
  return g;
}

/**
 * Stop 5 — One-way doors. The four valves bloom in slow motion; cells flow through while they're open and
 * wait while they're shut. "LUB!" pops over the tricuspid + mitral as they close, "DUB!" over the aortic +
 * pulmonary. Task: find the leaky valves (they flutter and let blood squirt back) and tap to fix them.
 */
export function ValvesSet({ phase, band, task, reducedMotion, quality, actions, arriving, onArrive }: StopProps) {
  const cfg = tuning(band);
  const bpm = useRef(cfg.valves.bpm);
  const spinner = useRef<Group>(null);
  const burst = useRef<BurstHandle>(null);
  const drips = useRef<BurstHandle>(null);
  const dripClock = useRef(0);
  const words = useRef<PopWordHandle>(null);
  const state = useRef<ValvesState>(valvesStart([]));
  const [leaky, setLeaky] = useState<readonly ValveId[]>([]);
  const [fixed, setFixed] = useState<readonly ValveId[]>([]);
  const [assist, setAssist] = useState(false);
  const timers = useTimers();
  const say = useSayThrottle(actions, 700);
  const active = phase === 'task' && task?.kind === 'fix-valves';
  const activeRef = useRef(active);
  activeRef.current = active;
  const plate = useMemo(plateGeometry, []);
  const plateMat = useMemo(() => new TissueMaterial({ color: '#ffd0da', rim: '#ffffff', rimStrength: 0.35, mottle: 0.08, fibres: 0.05, roughness: 0.4 }), []);
  const open = useRef<Record<ValveId, { current: number }>>({ tricuspid: { current: 0 }, pulmonary: { current: 0 }, mitral: { current: 0 }, aortic: { current: 0 } });
  const leak = useRef<Record<ValveId, { current: number }>>({ tricuspid: { current: 0 }, pulmonary: { current: 0 }, mitral: { current: 0 }, aortic: { current: 0 } });
  const glow = useRef<Record<ValveId, { current: number }>>({ tricuspid: { current: 0 }, pulmonary: { current: 0 }, mitral: { current: 0 }, aortic: { current: 0 } });

  useSpin(spinner, phase === 'explore', 0.5);

  useOnTaskStart(phase, () => {
    state.current = valvesStart(cfg.valves.leaky);
    setLeaky(cfg.valves.leaky);
    setFixed([]);
    setAssist(false);
    actions.taskProgress(0, cfg.valves.leaky.length);
  });
  useOnTaskEnd(phase, () => {
    setLeaky([]);
    setAssist(false);
  });

  const onValve = (id: ValveId) => {
    if (!activeRef.current) return;
    const r = tapValve(state.current, id, cfg.assistAfter);
    if (r.event === 'ignored') return;
    state.current = r.state;
    const l = LAYOUT[id];
    if (r.event === 'healthy') {
      actions.sfx('wrong');
      if (r.state.assist) {
        setAssist(true);
        say(VALVE_LINES.assist, true);
      } else say(VALVE_LINES.healthy, true);
      return;
    }
    setLeaky(r.state.leaky);
    setFixed(r.state.fixed);
    setAssist(false);
    actions.sfx('star');
    burst.current?.fire([l.x, 0.3, l.z], '#fff4b0', 28, 2.6);
    words.current?.pop(band === 'tiny' ? 'FIXED!' : 'SEALED!', [l.x, 0.9, l.z], '#b9fff0');
    actions.taskProgress(r.state.fixed.length, cfg.valves.leaky.length);
    if (r.event === 'done') {
      actions.say(VALVE_LINES.done);
      timers(() => actions.sfx('celebrate'), 300);
      timers(() => actions.completeTask(), 1700);
    } else say(pick(VALVE_LINES.fixed, r.state.fixed.length), true);
  };

  const onLub = () => {
    if (band === 'tiny') return;
    words.current?.pop('LUB!', [(LAYOUT.tricuspid.x + LAYOUT.mitral.x) / 2, 0.95, (LAYOUT.tricuspid.z + LAYOUT.mitral.z) / 2 - 0.3], '#ffffff');
  };
  const onDub = () => {
    if (band === 'tiny') return;
    words.current?.pop('DUB!', [(LAYOUT.aortic.x + LAYOUT.pulmonary.x) / 2 + 0.7, 1.0, (LAYOUT.aortic.z + LAYOUT.pulmonary.z) / 2], '#ffe3ec');
  };

  useDisposable(plate);
  useDisposable(plateMat);
  useFrame((_, dt) => {
    const t = performance.now() / 1000;
    dripClock.current += dt;
    if (dripClock.current > 0.45 && !reducedMotion) {
      dripClock.current = 0;
      for (const id of leaky) {
        if (open.current[id].current > 0.3) continue;
        const l = LAYOUT[id];
        // Backflow squirts the wrong way through the leaky valve (drawn above the plate, where it's visible).
        DRIP_AT[0] = l.x;
        DRIP_AT[2] = l.z;
        drips.current?.fire(DRIP_AT, SIDE[id] === 'right' ? '#8f9bff' : '#ff7085', 6, 1.4);
      }
    }
    for (const id of VALVES) {
      open.current[id].current = valveOpen(VALVE_KIND[id], beat.phase);
      const isLeaky = leaky.includes(id);
      leak.current[id].current = isLeaky ? 1 : 0;
      const g = fixed.includes(id) ? 0.3 : isLeaky && assist ? 0.6 + Math.sin(t * 8) * 0.35 : isLeaky && band === 'tiny' ? 0.55 + Math.sin(t * 5) * 0.3 : 0;
      glow.current[id].current = g;
    }
  });

  const labelsOn = phase === 'explore' || active;
  const cellCount = Math.max(8, Math.round(24 * quality.particleScale));

  return (
    <>
      <ShotCamera shot={active ? TASK_SHOT : SHOT} entry={ENTRY} reducedMotion={reducedMotion} smooth={1.2} onSettled={() => arriving && onArrive()} />
      <BeatDriver bpm={bpm} onLub={onLub} onDub={onDub} startPhase={0.3} />
      <group ref={spinner}>
        <mesh geometry={plate} material={plateMat} />
        {VALVES.map((id) => {
          const l = LAYOUT[id];
          const dir = VALVE_KIND[id] === 'av' ? -1 : 1;
          const side = SIDE[id];
          const col = side === 'right' ? PALETTE.poor : PALETTE.rich;
          return (
            <group key={id} position={[l.x, 0, l.z]}>
              <Column radius={l.r} color={col} />
              <ValveFlow count={cellCount} radius={l.r} length={2.2} direction={dir as 1 | -1} open={open.current[id]} leak={leak.current[id]} color={side === 'right' ? '#6c7cff' : '#ff3a55'} detail={quality.detail} speed={0.42} />
              <LeakJet radius={l.r} squirt={VALVE_KIND[id] === 'av'} open={open.current[id]} leak={leak.current[id]} color={side === 'right' ? '#aab4ff' : '#ff8d9d'} reducedMotion={reducedMotion} />
              <Tappable onTap={() => onValve(id)} hitRadius={l.r + 0.28} disabled={!active} hoverScale={1.06}>
                <Valve radius={l.r} flaps={VALVE_FLAPS[id]} normal={[0, dir, 0]} open={open.current[id]} wobble={leak.current[id]} glow={glow.current[id]} detail={quality.detail} maxAngle={1.3} />
              </Tappable>
              {fixed.includes(id) && (
                <sprite scale={l.r * 3.2} position={[0, 0.05, 0]}>
                  <spriteMaterial map={glowTexture()} color="#b9fff0" transparent opacity={0.5} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
                </sprite>
              )}
              <Tag
                id={`valve-${id}`}
                position={[0, 0.62, -l.r - 0.1]}
                text={tier(PART_INFO[id].name, band)}
                emoji={fixed.includes(id) ? '✅' : active && leaky.includes(id) && (assist || band === 'tiny') ? '💧' : '🚪'}
                accent={side === 'right' ? '#5b72ff' : '#ff3450'}
                visible={labelsOn}
              />
            </group>
          );
        })}
      </group>
      <Tag id="valve-slowmo" position={[0.46, -0.2, 2.25]} placement="below" text={band === 'tiny' ? 'Slow motion!' : 'Slow motion'} emoji="🐢" accent="#2ec4b6" visible={phase === 'explore'} />
      <PopWords ref={words} reducedMotion={reducedMotion} size={0.9} />
      <Burst ref={burst} count={Math.round(80 * quality.particleScale) + 20} reducedMotion={reducedMotion} />
      <Burst ref={drips} count={60} reducedMotion={reducedMotion} soft />
    </>
  );
}

const JET_VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const JET_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uAlpha;
uniform float uDir;
varying vec2 vUv;
void main(){
  // Streaks rushing away from the valve (uDir 1) or falling back into it (uDir -1), fading at the far end.
  float streak = smoothstep(0.35, 0.65, fract(vUv.y * 3.0 - uTime * 2.6 * uDir + sin(vUv.x * 18.0) * 0.12));
  float a = uAlpha * (0.3 + 0.7 * streak) * (1.0 - vUv.y) * smoothstep(0.0, 0.08, vUv.y);
  gl_FragColor = vec4(uColor * (1.0 + streak * 0.4), a);
}`;

/**
 * Backflow through a leaky valve, drawn in the chamber above the plate: each time it shuts (and fails to
 * seal), streaks squirt up out of a leaky tricuspid/mitral valve (`squirt`), or fall back down into a leaky
 * aortic/pulmonary valve from the artery above.
 */
function LeakJet({ radius, squirt, open, leak, color, reducedMotion }: { radius: number; squirt: boolean; open: RefObject<number>; leak: RefObject<number>; color: string; reducedMotion: boolean }) {
  const mesh = useRef<Mesh>(null);
  const shown = useRef(0);
  const geo = useMemo(() => {
    // Narrow where it squeezes through the valve (y = 0), spraying wider further out.
    const g = new CylinderGeometry(radius * 0.62, radius * 0.18, 1, 24, 1, true);
    g.translate(0, 0.5, 0);
    return g;
  }, [radius]);
  const uniforms = useMemo(() => ({ uColor: { value: new Color(color) }, uTime: { value: 0 }, uAlpha: { value: 0 }, uDir: { value: squirt ? 1 : -1 } }), [color, squirt]);
  useDisposable(geo);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const goal = (leak.current ?? 0) > 0 && (open.current ?? 0) < 0.3 ? 1 : 0;
    shown.current += (goal - shown.current) * Math.min(1, dt * (goal > shown.current ? 9 : 4));
    if (!reducedMotion) uniforms.uTime.value += dt;
    uniforms.uAlpha.value = shown.current * 0.85;
    const m = mesh.current;
    if (m) {
      m.visible = shown.current > 0.02;
      m.scale.set(1, 0.25 + shown.current * 0.85, 1);
    }
  });
  return (
    <mesh ref={mesh} geometry={geo} visible={false} renderOrder={8}>
      <shaderMaterial vertexShader={JET_VERT} fragmentShader={JET_FRAG} uniforms={uniforms} transparent depthWrite={false} side={DoubleSide} blending={AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

/** A glassy column of blood through a valve: atrium/artery above, ventricle below. */
function Column({ radius, color }: { radius: number; color: string }) {
  const mat = useMemo(() => {
    const c = new Color(color);
    return { color: c };
  }, [color]);
  return (
    <mesh>
      <cylinderGeometry args={[radius * 0.98, radius * 0.98, 2.2, 40, 1, true]} />
      <meshPhysicalMaterial color={mat.color} transparent opacity={0.22} roughness={0.1} clearcoat={1} side={DoubleSide} depthWrite={false} emissive={mat.color} emissiveIntensity={0.15} />
    </mesh>
  );
}
