import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, ExtrudeGeometry, Path, Shape, ShapeGeometry, Vector2, Vector3, type BufferGeometry, type Group, type Plane } from 'three';
import { valveOpen } from '../logic/beat';
import { VALVES, type ChamberId, type ValveId } from '../logic/ids';
import { VALVE_KIND } from '../logic/valves';
import { CHAMBER_CENTER, LEFT_HOLE, OUTLINE, RIGHT_HOLE, SECTION_VALVES, chamberAt, closedSpline, type P2 } from '../logic/section';
import { POOL_FRAG, POOL_VERT } from '../shaders/effects';
import { beat } from '../store';
import { tubeGeometry, type Vec3 } from './geometry';
import { TissueMaterial } from './materials';
import { PALETTE } from './palette';
import { Valve } from './Valve';
import { useDisposable } from './dispose';

export const SLAB_DEPTH = 0.36;

export interface SectionControl {
  glow: Record<ChamberId, number>;
  /** Leaky valves flutter and never seal (valves stop). */
  leak: Partial<Record<ValveId, number>>;
  valveGlow: Partial<Record<ValveId, number>>;
  /** 1 = beating normally. */
  beat: number;
}

export function makeSectionControl(): SectionControl {
  return { glow: { ra: 0, rv: 0, la: 0, lv: 0 }, leak: {}, valveGlow: {}, beat: 1 };
}

function toVec2(pts: [number, number][]): Vector2[] {
  return pts.map((p) => new Vector2(p[0], p[1]));
}

interface SectionGeo {
  slab: ExtrudeGeometry;
  back: ExtrudeGeometry;
  poolRight: ShapeGeometry;
  poolLeft: ShapeGeometry;
  frontZ: number;
  vessels: { geometry: BufferGeometry; color: string }[];
}

const VESSELS: { points: Vec3[]; r: number; color: string; caps?: 'both' | 'start' | 'end' | 'none' }[] = [
  // superior vena cava into the top of the right atrium
  { points: [[-0.8, 1.62, 0.18], [-0.8, 1.25, 0.18], [-0.8, 0.9, 0.18]], r: 0.14, color: PALETTE.poor, caps: 'start' },
  // inferior vena cava from below
  { points: [[-1.0, -1.5, 0.14], [-1.16, -0.95, 0.16], [-1.22, -0.28, 0.18]], r: 0.15, color: PALETTE.poor, caps: 'start' },
  // pulmonary trunk + branches
  { points: [[-0.12, 0.8, 0.18], [-0.14, 1.2, 0.18], [-0.2, 1.48, 0.1]], r: 0.13, color: PALETTE.poor, caps: 'none' },
  { points: [[-0.2, 1.46, 0.1], [-0.6, 1.62, 0.02], [-1.05, 1.62, -0.08]], r: 0.1, color: PALETTE.poor, caps: 'end' },
  { points: [[-0.2, 1.46, 0.1], [0.25, 1.52, -0.3], [0.8, 1.44, -0.45]], r: 0.1, color: PALETTE.poor, caps: 'end' },
  // aorta: up, arching to the viewer's right and down behind
  { points: [[0.33, 0.8, 0.18], [0.35, 1.35, 0.14], [0.56, 1.76, -0.06], [0.98, 1.76, -0.28], [1.22, 1.36, -0.4], [1.28, 0.8, -0.44]], r: 0.15, color: PALETTE.rich, caps: 'end' },
  // pulmonary veins into the left atrium
  { points: [[1.3, 0.52, 0.18], [1.62, 0.62, 0.14], [1.92, 0.7, 0.1]], r: 0.085, color: PALETTE.rich, caps: 'end' },
  { points: [[1.3, 0.24, 0.18], [1.64, 0.18, 0.14], [1.94, 0.12, 0.1]], r: 0.085, color: PALETTE.rich, caps: 'end' },
];

const cache = new Map<number, SectionGeo>();

function buildSection(detail: number): SectionGeo {
  const key = Math.round(detail * 4) / 4;
  const hit = cache.get(key);
  if (hit) return hit;
  const segs = Math.max(3, Math.round(6 * key));
  const outline = new Shape(toVec2(closedSpline(OUTLINE, segs)));
  const rightPts = toVec2(closedSpline(RIGHT_HOLE, Math.max(2, segs - 2)));
  const leftPts = toVec2(closedSpline(LEFT_HOLE, Math.max(2, segs - 2)));
  const holed = new Shape(toVec2(closedSpline(OUTLINE, segs)));
  holed.holes.push(new Path(rightPts), new Path(leftPts));
  const bevel = { bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.045, bevelSegments: Math.max(2, Math.round(4 * key)), curveSegments: 1 };
  const slab = new ExtrudeGeometry(holed, { depth: SLAB_DEPTH, ...bevel });
  const back = new ExtrudeGeometry(outline, { depth: 0.18, ...bevel });
  slab.computeBoundingBox();
  back.computeBoundingBox();
  const slabMin = slab.boundingBox?.min.z ?? 0;
  const backMax = back.boundingBox?.max.z ?? 0;
  slab.translate(0, 0, -slabMin);
  back.translate(0, 0, -backMax);
  slab.computeBoundingBox();
  const frontZ = slab.boundingBox?.max.z ?? SLAB_DEPTH;
  const poolRight = new ShapeGeometry(new Shape(rightPts));
  const poolLeft = new ShapeGeometry(new Shape(leftPts));
  poolRight.translate(0, 0, 0.012);
  poolLeft.translate(0, 0, 0.012);
  const vessels = VESSELS.map((v) => ({ geometry: tubeGeometry(v.points, { radius: () => v.r, tubular: 24, radial: 12, caps: v.caps ?? 'both' }, key), color: v.color }));
  const out = { slab, back, poolRight, poolLeft, frontZ, vessels };
  cache.set(key, out);
  return out;
}

function poolUniforms(side: 'right' | 'left') {
  return {
    uColor: { value: new Color(side === 'right' ? '#6f7dff' : '#ff4a5f') },
    uDeep: { value: new Color(side === 'right' ? '#2b2c9e' : '#9e0f2c') },
    uTime: { value: 0 },
    uSide: { value: side === 'right' ? -1 : 1 },
    uChanX: { value: side === 'right' ? -0.33 : 0.49 },
    uWaist: { value: side === 'right' ? -0.04 : -0.01 },
    uGlowA: { value: 0 },
    uGlowV: { value: 0 },
    uPulseA: { value: 0 },
    uPulseV: { value: 0 },
    uDim: { value: 1 },
  };
}

const local = new Vector3();

/**
 * The heart cut open like a science-museum model: a thick candy slab whose walls show the real
 * proportions (thin atria, thick left ventricle, the septum between the sides), blood flowing in the
 * cavities, and the four valves flapping in time. Tap a cavity to pick a chamber.
 */
export function HeartSection({
  detail,
  control,
  onChamberTap,
  interactive = false,
  clip,
  reducedMotion = false,
  showValves = true,
  showVessels = true,
}: {
  detail: number;
  control: SectionControl;
  onChamberTap?: (id: ChamberId) => void;
  interactive?: boolean;
  clip?: Plane[];
  reducedMotion?: boolean;
  showValves?: boolean;
  showVessels?: boolean;
}) {
  const geo = useMemo(() => buildSection(detail), [detail]);
  const mats = useMemo(
    () => ({
      cut: new TissueMaterial({ color: '#ff8aa0', rim: '#ffe4ec', rimStrength: 0.12, mottle: 0.14, fibres: 0.14, roughness: 0.5, clearcoat: 0.35, sheen: '#ffd0dc' }),
      wall: new TissueMaterial({ color: PALETTE.muscleWall, rim: '#ffc1d6', rimStrength: 0.35, mottle: 0.1, fibres: 0.08 }),
      back: new TissueMaterial({ color: '#b5304e', rimStrength: 0.2, mottle: 0.12, fibres: 0.1 }),
      poor: new TissueMaterial({ color: PALETTE.poor, rim: '#ffd6f0', rimStrength: 0.45, mottle: 0.04, fibres: 0 }),
      rich: new TissueMaterial({ color: PALETTE.rich, rim: '#ffd6f0', rimStrength: 0.45, mottle: 0.04, fibres: 0 }),
    }),
    [],
  );
  const right = useMemo(() => poolUniforms('right'), []);
  const left = useMemo(() => poolUniforms('left'), []);
  const group = useRef<Group>(null);
  const open = useRef<Record<ValveId, { current: number }>>({ tricuspid: { current: 0 }, pulmonary: { current: 0 }, mitral: { current: 0 }, aortic: { current: 0 } });
  const wobble = useRef<Record<ValveId, { current: number }>>({ tricuspid: { current: 0 }, pulmonary: { current: 0 }, mitral: { current: 0 }, aortic: { current: 0 } });
  const vglow = useRef<Record<ValveId, { current: number }>>({ tricuspid: { current: 0 }, pulmonary: { current: 0 }, mitral: { current: 0 }, aortic: { current: 0 } });

  useEffect(() => {
    const planes = clip ?? null;
    for (const m of Object.values(mats)) m.clippingPlanes = planes;
  }, [clip, mats]);

  useDisposable(mats);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const k = Math.min(1, dt * 6);
    const flow = dt * (reducedMotion ? 0.3 : 1);
    const pulseA = Math.max(0, beat.atria) * control.beat;
    const pulseV = Math.max(0, beat.vent) * control.beat;
    right.uTime.value += flow;
    left.uTime.value += flow;
    right.uPulseA.value = left.uPulseA.value = pulseA;
    right.uPulseV.value = left.uPulseV.value = pulseV;
    right.uGlowA.value += (control.glow.ra - right.uGlowA.value) * k;
    right.uGlowV.value += (control.glow.rv - right.uGlowV.value) * k;
    left.uGlowA.value += (control.glow.la - left.uGlowA.value) * k;
    left.uGlowV.value += (control.glow.lv - left.uGlowV.value) * k;
    const g = group.current;
    if (g) {
      const v = Math.max(0, beat.vent) * control.beat * (reducedMotion ? 0.3 : 1);
      g.scale.set(1 + v * 0.02, 1 - v * 0.035, 1);
    }
    for (let i = 0; i < VALVES.length; i++) {
      const id = VALVES[i] as ValveId;
      const o = open.current[id];
      o.current += (valveOpen(VALVE_KIND[id], beat.phase) * control.beat - o.current) * Math.min(1, dt * 14);
      wobble.current[id].current = control.leak[id] ?? 0;
      vglow.current[id].current = control.valveGlow[id] ?? 0;
    }
  });

  const tap = (side: 'right' | 'left') => (e: ThreeEvent<MouseEvent>) => {
    if (!interactive || !onChamberTap) return;
    e.stopPropagation();
    if (e.delta > 12) return;
    e.object.worldToLocal(local.copy(e.point));
    onChamberTap(chamberAt(side, local.x, local.y));
  };

  return (
    <group ref={group}>
      <mesh geometry={geo.back} material={mats.back} />
      <mesh geometry={geo.slab} material={[mats.cut, mats.wall]} />
      <mesh geometry={geo.poolRight} onClick={interactive ? tap('right') : undefined}>
        <shaderMaterial vertexShader={POOL_VERT} fragmentShader={POOL_FRAG} uniforms={right} clipping clippingPlanes={clip ?? null} />
      </mesh>
      <mesh geometry={geo.poolLeft} onClick={interactive ? tap('left') : undefined}>
        <shaderMaterial vertexShader={POOL_VERT} fragmentShader={POOL_FRAG} uniforms={left} clipping clippingPlanes={clip ?? null} />
      </mesh>
      {showVessels && geo.vessels.map((v, i) => (
        <mesh key={i} geometry={v.geometry} material={v.color === PALETTE.poor ? mats.poor : mats.rich} />
      ))}
      {showValves &&
        (Object.keys(SECTION_VALVES) as ValveId[]).map((id) => {
          const v = SECTION_VALVES[id];
          return (
            <group key={id} position={[v.at[0], v.at[1], geo.frontZ * 0.62]}>
              <Valve
                radius={v.radius}
                flaps={id === 'mitral' ? 2 : 3}
                normal={[v.flow[0], v.flow[1], 0.75]}
                open={open.current[id]}
                wobble={wobble.current[id]}
                glow={vglow.current[id]}
                detail={detail * 0.6}
                maxAngle={1.35}
              />
            </group>
          );
        })}
    </group>
  );
}

/** Where to pin each chamber's label (section space, on the cut face). */
export function chamberLabelAt(id: ChamberId, frontZ = SLAB_DEPTH): Vec3 {
  const c = CHAMBER_CENTER[id] as P2;
  return [c[0], c[1], frontZ * 0.4];
}
