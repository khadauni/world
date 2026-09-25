import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { Quaternion, Vector3, type Group } from 'three';
import { Flame } from './Flame';
import { mats } from './materials';

type V3 = [number, number, number];

const UP = new Vector3(0, 1, 0);

/** A cylinder strut between two points (legs, braces, booms). */
export function Strut({ from, to, radius = 0.04, material = mats.metal() }: { from: V3; to: V3; radius?: number; material?: ReturnType<typeof mats.metal> }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const d = b.clone().sub(a);
    const len = d.length();
    const q = new Quaternion().setFromUnitVectors(UP, d.normalize());
    return { position: a.add(b).multiplyScalar(0.5).toArray() as V3, quaternion: q, length: len };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion} material={material}>
      <cylinderGeometry args={[radius, radius, length, 8]} />
    </mesh>
  );
}

/** Round camera "eye" with a glint and a closable lid (sleep 0 = open, 1 = closed). */
function Eye({ position, rotation, size = 0.11, sleep }: { position: V3; rotation?: V3; size?: number; sleep?: RefObject<number> }) {
  const lid = useRef<Group>(null);
  useFrame(() => {
    if (!lid.current) return;
    const s = Math.min(1, Math.max(0.001, sleep?.current ?? 0));
    lid.current.scale.y = s;
    lid.current.visible = s > 0.02;
  });
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.metal()}>
        <cylinderGeometry args={[size * 1.25, size * 1.25, 0.05, 20]} />
      </mesh>
      <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]} material={mats.lens()}>
        <cylinderGeometry args={[size, size * 0.9, 0.04, 20]} />
      </mesh>
      <mesh position={[size * 0.35, size * 0.35, 0.06]} material={mats.glint()}>
        <sphereGeometry args={[size * 0.22, 8, 8]} />
      </mesh>
      <group ref={lid} position={[0, size * 1.25, 0.07]}>
        <mesh position={[0, -size * 1.25, 0]} material={mats.gold()}>
          <boxGeometry args={[size * 2.7, size * 2.5, 0.03]} />
        </mesh>
      </group>
    </group>
  );
}

const LEG_CORNERS: readonly [number, number][] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

/**
 * Vikram lander (stylised): gold-foil body on four sprung legs, solar panel, dish antenna,
 * hazard-camera "eyes", tricolour patches and four throttleable engines. Origin = ground under the feet.
 */
export function Vikram({
  thrust,
  sleep,
  squash,
  children,
  flags = true,
}: {
  thrust?: RefObject<number>;
  sleep?: RefObject<number>;
  /** Squash-and-stretch (1 = rest, <1 squashed, >1 stretched). */
  squash?: RefObject<number>;
  children?: ReactNode;
  flags?: boolean;
}) {
  const body = useRef<Group>(null);
  useFrame(() => {
    if (!body.current) return;
    const s = squash?.current ?? 1;
    body.current.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
  });
  const zero = useRef(0);
  const power = thrust ?? zero;
  return (
    <group>
      <group ref={body}>
        {/* legs */}
        {LEG_CORNERS.map(([sx, sz], i) => (
          <group key={i}>
            <Strut from={[sx * 0.6, 1.0, sz * 0.6]} to={[sx * 0.98, 0.1, sz * 0.98]} radius={0.05} />
            <Strut from={[sx * 0.72, 0.9, sz * 0.2]} to={[sx * 0.85, 0.42, sz * 0.85]} radius={0.03} />
            <Strut from={[sx * 0.2, 0.9, sz * 0.72]} to={[sx * 0.85, 0.42, sz * 0.85]} radius={0.03} />
            <mesh position={[sx * 1.0, 0.05, sz * 1.0]} material={mats.silver()}>
              <cylinderGeometry args={[0.19, 0.22, 0.08, 16]} />
            </mesh>
          </group>
        ))}
        {/* body */}
        <RoundedBox args={[1.5, 0.95, 1.5]} radius={0.09} smoothness={3} position={[0, 1.35, 0]} material={mats.gold()} />
        <RoundedBox args={[1.38, 0.08, 1.38]} radius={0.03} smoothness={2} position={[0, 1.86, 0]} material={mats.silver()} />
        <RoundedBox args={[1.2, 0.12, 1.2]} radius={0.04} smoothness={2} position={[0, 0.85, 0]} material={mats.goldDark()} />
        {/* top instruments */}
        <RoundedBox args={[0.42, 0.26, 0.36]} radius={0.04} smoothness={2} position={[-0.3, 2.02, 0.18]} material={mats.gold()} />
        <mesh position={[0.36, 2.1, -0.36]} material={mats.metal()}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
        </mesh>
        <mesh position={[0.36, 2.34, -0.36]} rotation={[-0.5, 0, 0.3]} material={mats.white()}>
          <sphereGeometry args={[0.24, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
        </mesh>
        <mesh position={[0.2, 1.97, -0.1]} material={mats.dark()}>
          <cylinderGeometry args={[0.07, 0.07, 0.18, 12]} />
        </mesh>
        {/* solar panels: back and left */}
        <mesh position={[0, 1.4, -0.765]} rotation={[0, Math.PI, 0]} material={mats.solar()}>
          <planeGeometry args={[1.25, 0.72]} />
        </mesh>
        <mesh position={[-0.765, 1.4, -0.12]} rotation={[0, -Math.PI / 2, 0]} material={mats.solar()}>
          <planeGeometry args={[0.95, 0.72]} />
        </mesh>
        {/* face: hazard cameras as eyes */}
        <Eye position={[-0.27, 1.5, 0.76]} sleep={sleep} />
        <Eye position={[0.27, 1.5, 0.76]} sleep={sleep} />
        {flags && (
          <>
            <mesh position={[0.46, 1.08, 0.758]} material={mats.flag()}>
              <planeGeometry args={[0.36, 0.24]} />
            </mesh>
            <mesh position={[0.758, 1.35, 0.2]} rotation={[0, Math.PI / 2, 0]} material={mats.flag()}>
              <planeGeometry args={[0.54, 0.36]} />
            </mesh>
          </>
        )}
        {/* engines */}
        {LEG_CORNERS.map(([sx, sz], i) => (
          <group key={`e${i}`} position={[sx * 0.33, 0.78, sz * 0.33]}>
            <mesh position={[0, -0.06, 0]} material={mats.nozzle()}>
              <cylinderGeometry args={[0.07, 0.13, 0.16, 14, 1, true]} />
            </mesh>
            <Flame power={power} length={0.9} radius={0.12} position={[0, -0.14, 0]} glowScale={1} />
          </group>
        ))}
        {children}
      </group>
    </group>
  );
}

/** Pragyan rover: six wheels on rocker-bogies, a tilting solar panel and a camera mast with two "eyes". Faces +X. */
export function Pragyan({ sleep, wheelSpin, panelTilt }: { sleep?: RefObject<number>; wheelSpin?: RefObject<number>; panelTilt?: RefObject<number> }) {
  const wheels = useRef<Group>(null);
  const panel = useRef<Group>(null);
  useFrame(() => {
    const spin = wheelSpin?.current ?? 0;
    const list = wheels.current?.children;
    if (list) for (let i = 0; i < list.length; i++) (list[i] as Group).rotation.z = -spin;
    if (panel.current) panel.current.rotation.z = panelTilt?.current ?? 0.28;
  });
  return (
    <group>
      <group ref={wheels}>
        {[-0.3, 0, 0.3].flatMap((x) =>
          [-0.35, 0.35].map((z) => (
            <group key={`${x}:${z}`} position={[x, 0.11, z]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.metal()}>
                <cylinderGeometry args={[0.11, 0.11, 0.09, 18]} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z > 0 ? 0.048 : -0.048]} material={mats.dark()}>
                <cylinderGeometry args={[0.05, 0.05, 0.01, 12]} />
              </mesh>
              <mesh position={[0.06, 0.06, z > 0 ? 0.05 : -0.05]} material={mats.dark()}>
                <boxGeometry args={[0.06, 0.02, 0.01]} />
              </mesh>
            </group>
          )),
        )}
      </group>
      {[-0.29, 0.29].map((z) => (
        <group key={z}>
          <Strut from={[-0.3, 0.13, z]} to={[0.02, 0.3, z]} radius={0.018} />
          <Strut from={[0.3, 0.13, z]} to={[0.02, 0.3, z]} radius={0.018} />
          <Strut from={[0.0, 0.13, z]} to={[-0.14, 0.22, z]} radius={0.015} />
        </group>
      ))}
      <RoundedBox args={[0.62, 0.2, 0.46]} radius={0.04} smoothness={2} position={[0, 0.36, 0]} material={mats.gold()} />
      <RoundedBox args={[0.5, 0.06, 0.4]} radius={0.02} smoothness={2} position={[-0.02, 0.48, 0]} material={mats.silver()} />
      <group ref={panel} position={[-0.3, 0.5, 0]}>
        <mesh position={[0.32, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.solar()}>
          <planeGeometry args={[0.64, 0.5]} />
        </mesh>
        <mesh position={[0.32, 0, 0]} material={mats.offWhite()}>
          <boxGeometry args={[0.66, 0.02, 0.52]} />
        </mesh>
      </group>
      {/* camera mast + eyes (navigation cameras) */}
      <mesh position={[0.24, 0.62, 0]} material={mats.metal()}>
        <cylinderGeometry args={[0.022, 0.022, 0.3, 8]} />
      </mesh>
      <RoundedBox args={[0.1, 0.12, 0.3]} radius={0.03} smoothness={2} position={[0.26, 0.8, 0]} material={mats.white()} />
      <Eye position={[0.315, 0.8, -0.075]} rotation={[0, Math.PI / 2, 0]} size={0.045} sleep={sleep} />
      <Eye position={[0.315, 0.8, 0.075]} rotation={[0, Math.PI / 2, 0]} size={0.045} sleep={sleep} />
      {/* antenna */}
      <mesh position={[-0.22, 0.66, -0.16]} material={mats.metal()}>
        <cylinderGeometry args={[0.01, 0.01, 0.32, 6]} />
      </mesh>
      <mesh position={[-0.22, 0.83, -0.16]} material={mats.saffron()}>
        <sphereGeometry args={[0.03, 10, 10]} />
      </mesh>
    </group>
  );
}

/** Propulsion Module: the "space tug" with one big solar wing, a dish, the SHAPE box and its main engine. */
export function PropulsionModule({ thrust, panelAngle = 0 }: { thrust?: RefObject<number>; panelAngle?: number }) {
  const zero = useRef(0);
  return (
    <group>
      <RoundedBox args={[1.5, 1.3, 1.5]} radius={0.08} smoothness={3} material={mats.satin()} />
      <RoundedBox args={[1.54, 0.5, 1.54]} radius={0.06} smoothness={2} position={[0, -0.2, 0]} material={mats.gold()} />
      {/* solar wing */}
      <Strut from={[0.75, 0.1, 0]} to={[1.35, 0.1, 0]} radius={0.04} />
      <group position={[1.35, 0.1, 0]} rotation={[panelAngle, 0, 0]}>
        <mesh position={[1.35, 0, 0]} rotation={[0, 0, 0]} material={mats.solar()}>
          <boxGeometry args={[2.6, 1.3, 0.04]} />
        </mesh>
        <mesh position={[1.35, 0, -0.03]} material={mats.offWhite()}>
          <boxGeometry args={[2.66, 1.36, 0.02]} />
        </mesh>
      </group>
      {/* dish */}
      <mesh position={[-0.95, 0.25, 0.2]} rotation={[0, 0, Math.PI / 2 + 0.3]} material={mats.white()}>
        <sphereGeometry args={[0.36, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2.8]} />
      </mesh>
      <Strut from={[-0.75, 0.2, 0.2]} to={[-0.95, 0.25, 0.2]} radius={0.03} />
      {/* SHAPE instrument */}
      <RoundedBox args={[0.3, 0.22, 0.3]} radius={0.04} smoothness={2} position={[0.45, 0.76, 0.45]} material={mats.white()} />
      <mesh position={[0.45, 0.76, 0.61]} rotation={[Math.PI / 2, 0, 0]} material={mats.lens()}>
        <cylinderGeometry args={[0.07, 0.07, 0.04, 14]} />
      </mesh>
      {/* main engine */}
      <mesh position={[0, -0.78, 0]} material={mats.nozzle()}>
        <cylinderGeometry args={[0.12, 0.28, 0.32, 18, 1, true]} />
      </mesh>
      <Flame power={thrust ?? zero} length={1.6} radius={0.26} position={[0, -0.94, 0]} />
    </group>
  );
}

/**
 * Latch positions (angles around the adapter ring, 0 = the side facing the camera) for 1–4 latches. They stay
 * between Vikram's front legs (at ±45°), so no leg ever hides a latch.
 */
export function latchAngles(count: number): number[] {
  if (count <= 1) return [0];
  const spread = count === 2 ? 0.7 : count === 3 ? 1.1 : 1.2;
  return Array.from({ length: count }, (_, i) => -spread / 2 + (spread * i) / (count - 1));
}

/** Latches shrink a little when four have to share the space between the legs. */
export function latchScale(count: number): number {
  return count >= 4 ? 0.74 : count === 3 ? 0.86 : 1;
}

/** The Integrated Module: Propulsion Module + adapter + Vikram (with Pragyan inside), as flown until 17 Aug 2023. */
export function IntegratedModule({ thrust, lander = true }: { thrust?: RefObject<number>; lander?: boolean }) {
  return (
    <group>
      <PropulsionModule thrust={thrust} />
      <mesh position={[0, 1.02, 0]} material={mats.metal()}>
        <cylinderGeometry args={[0.38, 0.5, 0.75, 20]} />
      </mesh>
      {lander && (
        <group position={[0, 0.55, 0]}>
          <Vikram />
        </group>
      )}
    </group>
  );
}
