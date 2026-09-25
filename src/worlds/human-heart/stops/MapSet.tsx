import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CatmullRomCurve3, Vector3, type Group } from 'three';
import { tier } from '@/core/tier';
import { unlockedStops } from '@/engine/flow';
import { content } from '../content';
import type { Shot } from '../logic/camera';
import { BeatDriver } from '../parts/BeatDriver';
import { FlowCells } from '../parts/cells';
import { tubeFromCurve } from '../parts/geometry';
import { Heart, makeHeartControl } from '../parts/Heart';
import { ShotCamera } from '../parts/ShotCamera';
import { StopBubble } from '../parts/StopBubble';
import { Tag } from '../parts/Tag';
import { Vessel } from '../parts/Vessel';
import { useSpin } from '../parts/useSpin';
import type { StopProps } from './common';
import { useDisposable } from '../parts/dispose';

const CY = 0.35;
const HEART_Y = 0.35;

/**
 * The loop's ellipse. Landscape screens are wide: a flat oval, with side stops' name tags beside them.
 * Portrait tablets are tall: a taller, narrower oval so stops on the sides are well apart vertically.
 */
export interface LoopShape {
  readonly rx: number;
  readonly ry: number;
  readonly rz: number;
}
export const LOOP_LANDSCAPE: LoopShape = { rx: 4.7, ry: 2.0, rz: 1.6 };
export const LOOP_PORTRAIT: LoopShape = { rx: 3.3, ry: 2.9, rz: 1.6 };

/** Point on the loop: an ellipse facing the camera, tipped back so its top passes behind the heart. */
function loopPoint(a: number, l: LoopShape): [number, number, number] {
  const s = Math.sin(a);
  return [Math.cos(a) * l.rx, CY + s * l.ry, -s * l.rz];
}

/** Stops sit along the lower part of the loop, a horseshoe around the heart (left → bottom → right). */
export function mapStopPosition(i: number, n: number, l: LoopShape = LOOP_LANDSCAPE): [number, number, number] {
  const a = ((158 + (i * 224) / Math.max(1, n - 1)) * Math.PI) / 180;
  const p = loopPoint(a, l);
  return [p[0], p[1] + 0.62, p[2]];
}

/**
 * Where a stop's name tag goes so tags never cover a neighbouring bubble: beside the side stops on wide
 * screens, above the upper ones on tall screens, below the bottom ones.
 */
export function mapTagPlacement(i: number, n: number, portrait: boolean): 'above' | 'below' | 'left' | 'right' {
  const side = i <= 1 ? 'left' : i >= n - 2 ? 'right' : null;
  if (!side) return 'below';
  return portrait ? 'above' : side;
}

function loopCurve(l: LoopShape): CatmullRomCurve3 {
  const pts: Vector3[] = [];
  const n = 28;
  for (let i = 0; i < n; i++) {
    const p = loopPoint((i / n) * Math.PI * 2, l);
    pts.push(new Vector3(p[0], p[1] + Math.sin((i / n) * Math.PI * 6) * 0.05, p[2]));
  }
  return new CatmullRomCurve3(pts, true, 'centripetal');
}

const MAP_SHOT: Shot = { target: [0, 0.12, 0], dir: [0, 0.12, 1], fit: [11.2, 6.5] };
const MAP_SHOT_TALL: Shot = { target: [0, 0.2, 0], dir: [0, 0.12, 1], fit: [9.4, 8.2] };

/**
 * The world map: the friendly heart floats in the middle, a glassy blood vessel loops around it carrying
 * cells, and the seven stops wait on the loop as glossy bubbles. Tap one to fly there.
 */
export function MapSet({ phase, stopId, band, explorer, completedStops, actions, reducedMotion, quality }: StopProps) {
  const heartGroup = useRef<Group>(null);
  const control = useMemo(() => makeHeartControl({ face: { mood: 0.7, squint: 0, lookX: 0, lookY: -0.2 } }), []);
  const bpm = useRef(64);
  const portrait = useThree((st) => st.size.width < st.size.height);
  const loopShape = portrait ? LOOP_PORTRAIT : LOOP_LANDSCAPE;
  const curve = useMemo(() => loopCurve(loopShape), [loopShape]);
  const loop = useMemo(
    () => tubeFromCurve(curve, { radius: () => 0.13, tubular: 140, radial: 12, closed: true, attr: (u) => 0.5 + 0.5 * Math.sin(u * Math.PI * 2 - 0.4) }, quality.detail),
    [curve, quality.detail],
  );
  const completed = useMemo(() => new Set(completedStops), [completedStops]);
  const unlocked = useMemo(() => unlockedStops(content, completed), [completed]);
  const nextId = content.stops.find((s) => !completed.has(s.id))?.id ?? null;
  const positions = useMemo(() => content.stops.map((_, i) => mapStopPosition(i, content.stops.length, loopShape)), [loopShape]);
  const t = useRef(0);
  const interactive = phase === 'map' || phase === 'intro';
  const labels = phase === 'map' || phase === 'intro' || phase === 'finale';

  useSpin(heartGroup, interactive, 0.8);

  useDisposable(loop);
  useFrame((_, dt) => {
    t.current += dt;
    control.face.lookX = Math.sin(t.current * 0.4) * 0.6;
  });

  const selectedIndex = content.stops.findIndex((s) => s.id === stopId);
  const shot: Shot = useMemo(() => {
    if (phase === 'travel' && selectedIndex >= 0) {
      const p = positions[selectedIndex] as [number, number, number];
      return { target: p, dir: [p[0] * 0.15, 0.35, 1], fit: [2.6, 2.2] };
    }
    return portrait ? MAP_SHOT_TALL : MAP_SHOT;
  }, [phase, selectedIndex, positions, portrait]);

  return (
    <>
      <ShotCamera shot={shot} reducedMotion={reducedMotion} smooth={phase === 'travel' ? 0.55 : 1.1} />
      <BeatDriver bpm={bpm} />
      <group position={[0, HEART_Y, 0]}>
        <group ref={heartGroup} scale={1.08}>
          <group rotation={[0.08, -0.12, 0]}>
            <Heart control={control} detail={quality.detail} face reducedMotion={reducedMotion} />
          </group>
        </group>
      </group>
      <Vessel geometry={loop} length={curve.getLength()} opacity={0.85} speed={reducedMotion ? 0.3 : 1} />
      <FlowCells
        curve={curve}
        count={Math.round(34 * quality.particleScale) + 8}
        speed={reducedMotion ? 0.006 : 0.025}
        size={0.1}
        oxygenAt={(u) => 0.5 + 0.5 * Math.sin(u * Math.PI * 2 - 0.4)}
        detail={quality.detail}
      />
      {content.stops.map((s, i) => {
        const pos = positions[i] as [number, number, number];
        const state = completed.has(s.id) ? 'done' : s.id === nextId ? 'next' : unlocked.has(s.id) ? 'open' : 'locked';
        const placement = mapTagPlacement(i, content.stops.length, portrait);
        const tagAt: [number, number, number] =
          placement === 'left' ? [pos[0] - 0.62, pos[1], pos[2]] : placement === 'right' ? [pos[0] + 0.62, pos[1], pos[2]] : placement === 'below' ? [pos[0], pos[1] - 0.66, pos[2]] : [pos[0], pos[1] + 0.7, pos[2]];
        return (
          <group key={s.id}>
            <StopBubble
              position={pos}
              emoji={s.emoji}
              color={s.color}
              state={state}
              seed={i * 1.7}
              reducedMotion={reducedMotion}
              scale={band === 'tiny' ? 1.12 : 1}
              onTap={() => {
                if (!interactive) return;
                if (!unlocked.has(s.id)) {
                  actions.sfx('wrong');
                  actions.say({ tiny: 'Not yet! Try the bouncing one! 👆', junior: 'That stop is still locked — try the bouncing one!', senior: 'Locked — finish the earlier stops first.' });
                  return;
                }
                actions.sfx('tap');
                actions.selectStop(s.id);
              }}
            />
            <Tag
              id={`map-${s.id}`}
              position={tagAt}
              placement={placement}
              accent={s.color}
              visible={labels && state !== 'locked'}
              text={tier(s.title, band).replace('{name}', explorer.name)}
            />
          </group>
        );
      })}
    </>
  );
}
