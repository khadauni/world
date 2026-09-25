import { useMemo, useRef, type RefObject } from 'react';
import { LatheGeometry, Vector2 } from 'three';
import { Flame } from './Flame';
import { mats } from './materials';

/** Radius profile → lathe (y up). Points are [radius, y]. */
function lathe(points: readonly [number, number][], segments: number): LatheGeometry {
  return new LatheGeometry(
    points.map(([r, y]) => new Vector2(r, y)),
    segments,
  );
}

/** Ogive nose from radius r at y0 up to a rounded tip at y1. */
function ogive(r: number, y0: number, y1: number, steps = 10, tip = 0.02): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push([Math.max(tip, r * Math.sqrt(1 - t * t * 0.98)), y0 + (y1 - y0) * Math.pow(t, 0.9)]);
  }
  pts.push([0, y1 + 0.02]);
  return pts;
}

/**
 * Stylised LVM3 (about 43.5 m → 8 units): white core with the C25 upper stage, a bulb-shaped 5 m
 * payload fairing (wider than the core), two big S200 strap-on boosters and engine bells.
 * Base of the engines at y = 0.
 */
export function LVM3({ thrust, detail = 1 }: { thrust: RefObject<number>; detail?: number }) {
  const seg = Math.max(16, Math.round(40 * detail));
  const geo = useMemo(() => {
    const core = lathe(
      [
        [0, 0.34],
        [0.37, 0.34],
        [0.37, 4.35],
      ],
      seg,
    );
    const band = lathe(
      [
        [0.372, 4.35],
        [0.372, 4.65],
      ],
      seg,
    );
    const upper = lathe(
      [
        [0.37, 4.65],
        [0.37, 6.0],
      ],
      seg,
    );
    const fairing = lathe(
      [
        [0.37, 6.0],
        [0.4, 6.1],
        [0.47, 6.3],
        [0.47, 7.25],
        ...ogive(0.47, 7.25, 8.35, 12, 0.03),
      ],
      seg,
    );
    const booster = lathe(
      [
        [0, 0.28],
        [0.3, 0.28],
        [0.3, 4.2],
        ...ogive(0.3, 4.2, 5.2, 10, 0.02),
      ],
      Math.round(seg * 0.8),
    );
    const bell = lathe(
      [
        [0.06, 0],
        [0.1, 0.05],
        [0.17, 0.18],
        [0.23, 0.34],
      ].map(([r, y]) => [r as number, 0.34 - (y as number)] as [number, number]),
      Math.round(seg * 0.6),
    );
    return { core, band, upper, fairing, booster, bell };
  }, [seg]);

  const zero = useRef(0);
  const power = thrust ?? zero;

  return (
    <group>
      <mesh geometry={geo.core} material={mats.white()} castShadow />
      <mesh geometry={geo.band} material={mats.dark()} />
      <mesh geometry={geo.upper} material={mats.offWhite()} castShadow />
      <mesh position={[0, 5.6, 0]} material={mats.saffron()}>
        <cylinderGeometry args={[0.374, 0.374, 0.12, seg, 1, true]} />
      </mesh>
      <mesh geometry={geo.fairing} material={mats.white()} castShadow />
      <mesh position={[0, 6.62, 0]} material={mats.saffron()}>
        <cylinderGeometry args={[0.474, 0.474, 0.1, seg, 1, true]} />
      </mesh>
      {/* tricolour wrapped on the core, facing the camera side */}
      <mesh position={[0, 3.2, 0]} rotation={[0, -Math.PI / 2, 0]} material={mats.flag()}>
        <cylinderGeometry args={[0.374, 0.374, 0.5, 24, 1, true, -0.62, 1.24]} />
      </mesh>
      {/* core engines (two Vikas bells) */}
      {[-0.14, 0.14].map((z) => (
        <mesh key={z} geometry={geo.bell} position={[0, 0, z]} material={mats.nozzle()} />
      ))}
      <Flame power={power} length={2.6} radius={0.3} position={[0, 0.02, 0]} glowScale={1.6} />
      {/* S200 boosters */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, s * 0.7]}>
          <mesh geometry={geo.booster} material={mats.offWhite()} castShadow />
          <mesh position={[0, 3.7, 0]} material={mats.dark()}>
            <cylinderGeometry args={[0.303, 0.303, 0.08, seg, 1, true]} />
          </mesh>
          <mesh position={[0, 1.0, 0]} material={mats.dark()}>
            <cylinderGeometry args={[0.303, 0.303, 0.08, seg, 1, true]} />
          </mesh>
          <mesh geometry={geo.bell} scale={[1.25, 1, 1.25]} position={[0, -0.06, 0]} material={mats.nozzle()} />
          <Flame power={power} length={3.4} radius={0.34} position={[0, -0.04, 0]} glowScale={1.4} />
          {[1.2, 3.6].map((y) => (
            <mesh key={y} position={[0, y, -s * 0.33]} material={mats.metal()}>
              <boxGeometry args={[0.14, 0.1, 0.12]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

