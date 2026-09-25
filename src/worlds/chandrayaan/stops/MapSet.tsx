import { Line } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3, type Group } from 'three';
import { Glow } from '@/engine/kit';
import { fmt } from '@/engine/text';
import type { Shot } from '../logic/camera';
import { faceRotationY, lonLatToVec3, rotateY, SRIHARIKOTA } from '../logic/geo';
import { markerStates } from '../logic/map';
import { ellipseFromApsides, pointOnEllipse } from '../logic/orbit';
import { content } from '../content';
import { MapMarker } from '../parts/Marker';
import { Earth, Moon } from '../parts/Planets';
import { ShotCamera } from '../parts/ShotCamera';
import type { StopProps } from './common';

type V3 = [number, number, number];

const EARTH: V3 = [-5.3, -0.2, 0];
const EARTH_R = 1.75;
const MOON: V3 = [5.5, 0.35, -0.3];
const MOON_R = 1.05;
const SUN: V3 = [0.55, 0.35, 0.8];
const EARTH_ROT = faceRotationY(SRIHARIKOTA.lon) - 0.25;

/** Orbit plane basis: u points Earth → Moon, v is "up" within a plane tilted slightly towards the camera. */
const BASIS = (() => {
  const e = new Vector3(...EARTH);
  const m = new Vector3(...MOON);
  const n = new Vector3(0.05, 0.55, 1).normalize();
  const u = m.clone().sub(e);
  u.sub(n.clone().multiplyScalar(u.dot(n))).normalize();
  const v = new Vector3().crossVectors(n, u).normalize();
  return { u, v, dist: m.distanceTo(e) };
})();

function inPlane(center: V3, x: number, y: number): V3 {
  return [center[0] + BASIS.u.x * x + BASIS.v.x * y, center[1] + BASIS.u.y * x + BASIS.v.y * y, center[2] + BASIS.u.z * x + BASIS.v.z * y];
}

/** Points of an ellipse around a focus; `turn` rotates it in the orbit plane (π → apogee towards the Moon). */
function ellipsePoints(center: V3, rp: number, ra: number, from = 0, to = Math.PI * 2, steps = 96, turn = Math.PI, squash = 0.55): V3[] {
  const el = ellipseFromApsides(rp, ra);
  const pts: V3[] = [];
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  for (let i = 0; i <= steps; i++) {
    const nu = from + ((to - from) * i) / steps;
    const p = pointOnEllipse(nu, el);
    // Squashed across the Earth–Moon line: a friendly schematic that fits on screen.
    pts.push(inPlane(center, p.x * c - p.y * s, (p.x * s + p.y * c) * squash));
  }
  return pts;
}

const EARTH_ORBITS = [3.0, 4.0, 5.2, 6.6].map((ra) => ellipsePoints(EARTH, 2.2, ra));
/** Trans-lunar arc: from perigee (far side of Earth) over the top to the Moon. */
const TRANSFER = ellipsePoints(EARTH, 2.2, BASIS.dist - 0.4, Math.PI, 2 * Math.PI, 120).reverse();
const MOON_ORBITS = [2.3, 1.8, 1.45].map((ra) => ellipsePoints(MOON, 1.4, ra, 0, Math.PI * 2, 80, 2.2, 0.85));

/** Sriharikota on the globe (world space) — the launch badge is pinned to it. */
const SHAR: V3 = (() => {
  const d = rotateY(lonLatToVec3(SRIHARIKOTA.lon, SRIHARIKOTA.lat), EARTH_ROT);
  return [EARTH[0] + d[0] * EARTH_R * 1.01, EARTH[1] + d[1] * EARTH_R * 1.01, EARTH[2] + d[2] * EARTH_R * 1.01];
})();

/** The landing region near the Moon's south pole, as seen on the map. */
const SOUTH_POLE: V3 = [MOON[0] - 0.15, MOON[1] - MOON_R * 0.8, MOON[2] + MOON_R * 0.55];

/** Where each stop's badge floats on the map. */
const MARKERS: Record<string, V3> = {
  'launch-pad': [EARTH[0] - 1.1, EARTH[1] + 2.25, EARTH[2] + 1.4],
  'earth-orbit': EARTH_ORBITS[3]?.[33] ?? [0, 0, 0],
  'to-the-moon': TRANSFER[84] ?? [0, 0, 0],
  separation: [MOON[0] - 1.1, MOON[1] + 2.0, MOON[2] + 0.4],
  landing: [MOON[0] - 2.25, MOON[1] - 0.9, MOON[2] + 0.9],
  'pragyan-rover': [MOON[0] - 0.2, MOON[1] - 1.95, MOON[2] + 0.9],
  'moon-night': [MOON[0] + 1.95, MOON[1] - 1.0, MOON[2] + 0.9],
};

const OVERVIEW: Shot = { target: [0.3, 0.1, 0], dir: [0, 0.14, 1], fit: [19.5, 7.6] };
const OVERVIEW_PORTRAIT: Shot = { target: [0.3, 0.45, 0], dir: [0, 0.14, 1], fit: [12.5, 16.5] };
const ENTRY: Shot = { target: [0.3, 0.6, 0], dir: [0.05, 0.3, 1], fit: [26, 12] };

/** The mission map: Earth, Moon and Chandrayaan-3's growing loops, with a badge for every stop. */
export function MapSet(props: StopProps) {
  const { phase, stopId, band, explorer, completedStops, actions, quality, reducedMotion } = props;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const portrait = aspect < 0.95;
  // On tall screens the whole map is tipped so the Moon sits above the Earth.
  const tilt = portrait ? 0.8 : 0;
  const states = useMemo(
    () =>
      markerStates(
        content.stops.map((s) => s.id),
        completedStops,
      ),
    [completedStops],
  );
  const focus = phase === 'travel' && stopId ? MARKERS[stopId] : null;
  const focusWorld = useMemo<V3 | null>(() => {
    if (!focus) return null;
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    return [focus[0] * c - focus[1] * s, focus[0] * s + focus[1] * c, focus[2]];
  }, [focus, tilt]);
  const base = portrait ? OVERVIEW_PORTRAIT : OVERVIEW;
  const shot = useMemo<Shot>(() => (focusWorld ? { target: focusWorld, dir: [0, 0.1, 1], fit: [3.4, 2.4] } : base), [focusWorld, base]);
  const drift = useRef<Vector3 | null>(null);
  const t = useRef(0);
  const driftVec = useMemo(() => new Vector3(), []);
  useFrame((_, dt) => {
    t.current += dt;
    if (phase === 'intro' && !reducedMotion) {
      driftVec.set(base.target[0] + Math.sin(t.current * 0.25) * 0.5, base.target[1] + Math.sin(t.current * 0.18) * 0.2, base.target[2]);
      drift.current = driftVec;
    } else drift.current = null;
  });
  const showLabels = phase === 'map' || phase === 'intro';

  return (
    <group>
      <ShotCamera shot={shot} entry={ENTRY} reducedMotion={reducedMotion} smooth={focus ? 0.5 : 1.1} liveTarget={drift} />
      <directionalLight position={[SUN[0] * 20, SUN[1] * 20, SUN[2] * 20]} intensity={2.2} color="#fff4e0" />
      <ambientLight intensity={0.25} color="#8fa8ff" />

      <group rotation={[0, 0, tilt]}>
        <group position={EARTH}>
          <Earth radius={EARTH_R} sun={SUN} rotationY={EARTH_ROT} tilt={0} detail={quality.detail} />
        </group>
        <group position={MOON}>
          <Moon radius={MOON_R} sun={SUN} detail={quality.detail * 0.8} />
        </group>

        {EARTH_ORBITS.map((pts, i) => (
          <Line key={`eo${i}`} points={pts} color="#8fd3ff" lineWidth={1.6} transparent opacity={0.3 + i * 0.12} dashed dashSize={0.18} gapSize={0.12} />
        ))}
        <FlowLine points={TRANSFER} color="#ffb14a" />
        {MOON_ORBITS.map((pts, i) => (
          <Line key={`mo${i}`} points={pts} color="#ffe08a" lineWidth={1.6} transparent opacity={0.35 + i * 0.15} dashed dashSize={0.14} gapSize={0.1} />
        ))}
        <Line points={[SHAR, MARKERS['launch-pad'] as V3]} color="#ffffff" lineWidth={2} transparent opacity={0.75} />
        <mesh position={SHAR}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color="#ff9933" toneMapped={false} />
        </mesh>
        {(['landing', 'pragyan-rover', 'moon-night'] as const).map((id) => {
          const m = MARKERS[id] as V3;
          return <Line key={id} points={[m, SOUTH_POLE]} color="#ffffff" lineWidth={1.4} transparent opacity={0.45} />;
        })}
        <Comet path={TRANSFER} reducedMotion={reducedMotion} />

        {content.stops.map((s) => {
          const pos = MARKERS[s.id] as V3;
          return (
            <MapMarker
              key={s.id}
              position={pos}
              emoji={s.emoji}
              color={s.color}
              state={states[s.id] ?? 'locked'}
              label={fmt(s.title, band, explorer.name)}
              showLabel={showLabels}
              onTap={() => {
                actions.sfx('pop');
                actions.selectStop(s.id);
              }}
              size={band === 'tiny' ? 1.15 : 1}
              reducedMotion={reducedMotion}
              labelHeight={portrait ? 0.027 : 0.04}
            />
          );
        })}
      </group>
    </group>
  );
}

/** The transfer path, with dashes flowing towards the Moon. */
function FlowLine({ points, color }: { points: V3[]; color: string }) {
  const ref = useRef<{ material: { dashOffset: number } } | null>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.material.dashOffset -= dt * 0.6;
  });
  return <Line ref={ref as never} points={points} color={color} lineWidth={2.8} dashed dashSize={0.3} gapSize={0.16} transparent opacity={0.95} />;
}

/** A little glowing spacecraft that keeps flying the path — the map always feels alive. */
function Comet({ path, reducedMotion }: { path: V3[]; reducedMotion: boolean }) {
  const g = useRef<Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!g.current || reducedMotion) return;
    t.current = (t.current + dt * 0.09) % 1;
    const f = t.current * (path.length - 1);
    const i = Math.floor(f);
    const a = path[i] as V3;
    const b = path[Math.min(path.length - 1, i + 1)] as V3;
    const k = f - i;
    g.current.position.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
  });
  return (
    <group ref={g} position={path[0]}>
      <Glow color="#ffd27a" scale={0.9} />
      <Glow color="#ffffff" scale={0.3} />
    </group>
  );
}
