import { useCursor } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AdditiveBlending, Color, Quaternion, ShaderMaterial, Vector3, type Group, type IUniform, type Plane } from 'three';
import { squash, valveOpen } from '../logic/beat';
import { PARTS, type PartId, type ValveId } from '../logic/ids';
import { VALVE_KIND } from '../logic/valves';
import { beat } from '../store';
import { GHOST_FRAG, GHOST_VERT } from '../shaders/effects';
import { heartBuild, type PartBuild } from './anatomy';
import type { Vec3 } from './geometry';
import { HeartFace, type FaceState } from './HeartFace';
import { TissueMaterial, easeGlow } from './materials';
import { PALETTE, PART_COLOR } from './palette';
import { Valve } from './Valve';
import { useDisposable } from './dispose';

/**
 * Live controls for a Heart instance. Stops mutate these (no React renders); the heart eases towards them.
 */
export interface HeartControl {
  /** Target explode amount per part (0 in place … 1 pulled out). */
  pulled: Record<PartId, number>;
  /** Target highlight glow per part (0…1). */
  glow: Record<PartId, number>;
  /** Squash strength of the beat (0 = still). */
  beat: number;
  face: FaceState;
  /** Extra overall glow / "power" (healthy-heart). */
  power: number;
  /** Parts hidden entirely (e.g. valves in the "whole heart" look). */
  hidden: Partial<Record<PartId, boolean>>;
  /** Heart Lab: where a pulled part flies to (overrides the build's default offset) … */
  explode: Partial<Record<PartId, Vec3>>;
  /** … and how much it shrinks while parked there. */
  park: Partial<Record<PartId, number>>;
}

function record(v: number): Record<PartId, number> {
  return Object.fromEntries(PARTS.map((p) => [p, v])) as Record<PartId, number>;
}

export function makeHeartControl(init: Partial<HeartControl> = {}): HeartControl {
  return {
    pulled: record(0),
    glow: record(0),
    beat: 1,
    face: { mood: 0.2, squint: 0, lookX: 0, lookY: 0 },
    power: 0,
    hidden: { tricuspid: true, pulmonary: true, mitral: true, aortic: true },
    explode: {},
    park: {},
    ...init,
  };
}

const Z_AXIS = new Vector3(0, 0, 1);

/** Hologram-style outline of a missing part: warm rim glow, faint core (additive, never blocks taps). */
function makeGhost(): { material: ShaderMaterial; time: IUniform<number>; opacity: IUniform<number> } {
  const time = { value: 0 };
  const opacity = { value: 0.7 };
  const material = new ShaderMaterial({
    vertexShader: GHOST_VERT,
    fragmentShader: GHOST_FRAG,
    uniforms: { uColor: { value: new Color('#ffe9f1') }, uRimColor: { value: new Color('#ffd66b') }, uTime: time, uOpacity: opacity },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  return { material, time, opacity };
}

interface PartRuntime {
  x: number;
  v: number;
}

/**
 * The stylised anatomical heart (see anatomy.ts), beating in the correct order — atria, then ventricles —
 * with springy squash-and-stretch. Parts fly out and snap back with a bouncy spring for the Heart Lab.
 */
export function Heart({
  control,
  detail,
  face = false,
  onPartTap,
  interactive = false,
  reducedMotion = false,
  clip,
  partChildren,
  ghosts = false,
}: {
  control: HeartControl;
  detail: number;
  face?: boolean;
  onPartTap?: (id: PartId, e: ThreeEvent<MouseEvent>) => void;
  interactive?: boolean;
  reducedMotion?: boolean;
  /** Clipping planes (world space) — used by the x-ray reveal. */
  clip?: Plane[];
  /** Extra things that ride along with a part (labels, effects) — positioned relative to its pivot. */
  partChildren?: Partial<Record<PartId, ReactNode>>;
  /** Heart Lab: a glowing outline stays where a pulled part belongs (tap it to snap the part back). */
  ghosts?: boolean;
}) {
  const build = useMemo(() => heartBuild(detail), [detail]);
  const materials = useMemo(() => {
    const m = {} as Record<PartId, TissueMaterial>;
    for (const id of PARTS) {
      const vessel = build.parts[id].material === 'vessel';
      m[id] = new TissueMaterial({
        color: PART_COLOR[id],
        rim: vessel ? '#ffd6f0' : PALETTE.rimWarm,
        rimStrength: vessel ? 0.45 : 0.5,
        mottle: vessel ? 0.05 : 0.12,
        fibres: vessel ? 0 : 0.06,
        roughness: vessel ? 0.3 : 0.42,
        sheen: vessel ? '#ffffff' : '#ffd6e2',
      });
    }
    return m;
  }, [build]);
  useEffect(() => {
    for (const m of Object.values(materials)) m.clippingPlanes = clip ?? null;
  }, [clip, materials]);
  const groups = useRef<Partial<Record<PartId, Group | null>>>({});
  const faceGroup = useRef<Group>(null);
  const state = useRef<Record<PartId, PartRuntime>>(Object.fromEntries(PARTS.map((p) => [p, { x: 0, v: 0 }])) as Record<PartId, PartRuntime>);
  const valveOpenRef = useRef<Record<string, { current: number }>>({
    tricuspid: { current: 0 },
    pulmonary: { current: 0 },
    mitral: { current: 0 },
    aortic: { current: 0 },
  });
  const valveGlow = useRef<Record<string, { current: number }>>({
    tricuspid: { current: 0 },
    pulmonary: { current: 0 },
    mitral: { current: 0 },
    aortic: { current: 0 },
  });
  const ghostGroups = useRef<Partial<Record<PartId, Group | null>>>({});
  const ghost = useMemo(() => (ghosts ? makeGhost() : null), [ghosts]);
  const ghostMat = ghost?.material ?? null;
  const valveQuat = useMemo(() => {
    const q: Partial<Record<PartId, Quaternion>> = {};
    for (const id of PARTS) {
      const v = build.parts[id].valve;
      if (v) q[id] = new Quaternion().setFromUnitVectors(Z_AXIS, new Vector3(v.normal[0], v.normal[1], v.normal[2]).normalize());
    }
    return q;
  }, [build]);
  useEffect(() => () => ghostMat?.dispose(), [ghostMat]);
  const t = useRef(0);
  const [hover, setHover] = useState<PartId | null>(null);
  useCursor(interactive && hover !== null);

  useDisposable(materials);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    t.current += dt;
    const strength = control.beat * (reducedMotion ? 0.35 : 1);
    const [vx, vy] = squash(beat.vent, 0.075 * strength);
    const [ax, ay] = squash(beat.atria, 0.09 * strength);
    const arterial = 1 + Math.max(0, beat.vent) * 0.035 * strength;
    for (const id of PARTS) {
      const g = groups.current[id];
      const p = build.parts[id];
      const s = state.current[id];
      // Bouncy spring towards the pulled target (slight overshoot = cartoon snap).
      const goal = control.pulled[id];
      const k = 60;
      const c = 9;
      s.v += ((goal - s.x) * k - s.v * c) * dt;
      s.x += s.v * dt;
      if (reducedMotion) {
        s.x = goal;
        s.v = 0;
      }
      easeGlow(materials[id], control.glow[id] + control.power * (p.material === 'tissue' ? 0.25 : 0.1) + (interactive && hover === id ? 0.3 : 0), dt);
      const outline = ghostGroups.current[id];
      if (outline) outline.visible = s.x > 0.35 && !control.hidden[id];
      if (!g) continue;
      g.visible = !control.hidden[id];
      const e = control.explode[id] ?? p.explode;
      const bob = s.x > 0.5 && !reducedMotion ? Math.sin(t.current * 1.6 + e[0] * 3) * 0.05 * s.x : 0;
      g.position.set(p.pivot[0] + e[0] * s.x, p.pivot[1] + e[1] * s.x + bob, p.pivot[2] + e[2] * s.x);
      // Parked parts turn a little towards the heart so their best side faces the child.
      g.rotation.set(s.x * 0.08, -Math.sign(e[0]) * 0.22 * s.x, 0);
      const out = Math.min(1, Math.abs(s.x));
      const beatOn = 1 - out;
      const ps = 1 + ((control.park[id] ?? 1) - 1) * out;
      if (p.beat === 'ventricles') g.scale.set((1 + (vx - 1) * beatOn) * ps, (1 + (vy - 1) * beatOn) * ps, (1 + (vx - 1) * beatOn) * ps);
      else if (p.beat === 'atria') g.scale.set((1 + (ax - 1) * beatOn) * ps, (1 + (ay - 1) * beatOn) * ps, (1 + (ax - 1) * beatOn) * ps);
      else if (p.beat === 'artery') g.scale.setScalar((1 + (arterial - 1) * beatOn) * ps);
      else g.scale.setScalar(ps);
      if (p.valve) {
        const vo = valveOpenRef.current[id];
        if (vo) vo.current += (valveOpen(VALVE_KIND[id as ValveId], beat.phase) * 0.8 - vo.current) * Math.min(1, dt * 10);
        const vg = valveGlow.current[id];
        if (vg) vg.current = materials[id].glow.value;
      }
    }
    if (ghost) {
      ghost.time.value = t.current;
      // Subtle: several outlines can overlap once many parts are out (additive blending adds up).
      ghost.opacity.value = reducedMotion ? 0.4 : 0.34 + Math.sin(t.current * 3.2) * 0.12;
    }
    const f = faceGroup.current;
    if (f) {
      f.visible = face && control.pulled.rv < 0.05 && control.pulled.lv < 0.05;
      f.scale.set(vx, vy, vx);
      control.face.squint = Math.max(0, beat.vent) * strength;
    }
  });

  const tap = (id: PartId) => (e: ThreeEvent<MouseEvent>) => {
    if (!onPartTap || !interactive) return;
    e.stopPropagation();
    if (e.delta > 12) return;
    onPartTap(id, e);
  };

  return (
    <group>
      {PARTS.map((id) => {
        const p: PartBuild = build.parts[id];
        return (
          <group
            key={id}
            ref={(el) => {
              groups.current[id] = el;
            }}
            position={[p.pivot[0], p.pivot[1], p.pivot[2]]}
            onClick={interactive ? tap(id) : undefined}
            onPointerOver={
              interactive
                ? (e) => {
                    e.stopPropagation();
                    setHover(id);
                  }
                : undefined
            }
            onPointerOut={interactive ? () => setHover((h) => (h === id ? null : h)) : undefined}
          >
            {p.geometries.map((g, i) => (
              <mesh key={i} geometry={g} material={materials[id]} />
            ))}
            {p.valve && (
              <Valve
                radius={p.valve.radius}
                flaps={p.valve.flaps}
                normal={p.valve.normal}
                open={valveOpenRef.current[id] as { current: number }}
                glow={valveGlow.current[id] as { current: number }}
                detail={detail * 0.7}
              />
            )}
            {interactive && !control.hidden[id] && p.hit?.map((g, i) => <mesh key={`hit${i}`} geometry={g} visible={false} />)}
            {partChildren?.[id]}
          </group>
        );
      })}
      {ghostMat &&
        PARTS.map((id) => {
          const p = build.parts[id];
          const q = valveQuat[id];
          return (
            <group
              key={`ghost-${id}`}
              ref={(el) => {
                ghostGroups.current[id] = el;
              }}
              position={[p.pivot[0], p.pivot[1], p.pivot[2]]}
              visible={false}
              onClick={interactive ? tap(id) : undefined}
            >
              {p.valve && q ? (
                <mesh quaternion={q} material={ghostMat}>
                  <torusGeometry args={[p.valve.radius, p.valve.radius * 0.28, 8, 28]} />
                </mesh>
              ) : (
                p.geometries.map((g, i) => <mesh key={i} geometry={g} material={ghostMat} renderOrder={4} />)
              )}
            </group>
          );
        })}
      {face && (
        <group ref={faceGroup} position={[-0.05, -0.35, 0.3]}>
          <group position={[0.05, 0.35, -0.3]}>
            <HeartFace anchors={build.face} state={control.face} />
          </group>
        </group>
      )}
    </group>
  );
}
