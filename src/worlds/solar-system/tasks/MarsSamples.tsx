import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Matrix4, Quaternion, Vector3, type Group } from 'three';
import { Glow, Tappable } from '@/engine/kit';
import { useDisposable } from '../parts/hooks';
import { lumpyRock } from '../parts/shapes';
import { MARS_SITE } from '../layout';
import { useSolar } from '../state';
import { StageGroup, popScale, type TaskProps } from './common';
import { marsLayout, slerpDir } from './geometry';
import { tuningFor } from './rules';
import { useTaskKit } from './useTaskKit';

const SITE = new Vector3(...MARS_SITE);
const Y = new Vector3(0, 1, 0);
const tmpDir = new Vector3();
/** When idle the rover faces a little toward the camera, so you see its face. */
const IDLE_HEADING = new Vector3(0.55, -0.2, 1).normalize();
const tangent = new Vector3();
const right = new Vector3();
const basis = new Matrix4();
const qTmp = new Quaternion();
const at = new Vector3();

const SAMPLE_LINES = {
  tiny: 'Got it! A space rock! 🪨',
  junior: 'Sample collected! Scientists study rocks like this for clues.',
  senior: 'Core sample stored — rocks can preserve chemical signs of ancient water.',
} as const;

/** Mars: tap a sparkly rock and the rover trundles over the curved surface to collect it. */
export function MarsSamples({ band, actions, reducedMotion }: TaskProps) {
  const sys = useSolar();
  const t = tuningFor('collect-samples', band);
  const kit = useTaskKit('collect-samples', band, actions, t.count, 1600);
  const rockGeo = useDisposable(() => lumpyRock(12, 0.8, 0.35, 0.75), []);
  const layout = useMemo(() => marsLayout(t.count, SITE), [t.count]);
  const rocks = useMemo(() => layout.rocks.map((dir) => ({ dir, quat: new Quaternion().setFromUnitVectors(Y, dir) })), [layout]);
  const [picked, setPicked] = useState<readonly boolean[]>(() => rocks.map(() => false));
  const queued = useRef<number[]>([]);
  const [queue, setQueue] = useState<readonly number[]>([]);
  const pickedAt = useRef<number[]>(rocks.map(() => -1));
  const drive = useRef({ from: layout.start.clone(), to: layout.start.clone(), t: 1, target: -1, dir: layout.start.clone(), wheel: 0, dust: 0 });
  const rover = useRef<Group>(null);
  const wheels = useRef<(Group | null)[]>([]);
  const rockRefs = useRef<(Group | null)[]>([]);
  const clock = useRef(0);
  const next = picked.findIndex((p, i) => !p && !queue.includes(i));

  useEffect(() => {
    sys.spinLock.mars = sys.spin.mars;
    return () => {
      delete sys.spinLock.mars;
    };
  }, [sys]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    clock.current += dt;
    const d = drive.current;
    // Start the next queued drive.
    if (d.target < 0 && queued.current.length > 0) {
      const i = queued.current[0] as number;
      d.from.copy(d.dir);
      d.to.copy((rocks[i] as { dir: Vector3 }).dir);
      d.t = 0;
      d.target = i;
    }
    if (d.target >= 0) {
      const angle = d.from.angleTo(d.to);
      const speed = (reducedMotion ? 1.4 : 0.75) * t.speed;
      d.t = angle < 1e-3 ? 1 : Math.min(1, d.t + (dt * speed) / Math.max(angle, 0.05));
      // Stop just short of the rock so the arm can "scoop" it.
      slerpDir(d.from, d.to, d.t * 0.9, d.dir);
      d.wheel += dt * 9;
      d.dust += dt;
      if (d.dust > 0.18 && !reducedMotion) {
        d.dust = 0;
        rover.current?.getWorldPosition(at);
        sys.burst(at, '#c8744a', 3, sys.stage.unit * 0.12, sys.stage.unit * 0.35);
      }
      if (d.t >= 1) {
        const i = d.target;
        d.target = -1;
        queued.current.shift();
        setQueue([...queued.current]);
        pickedAt.current[i] = clock.current;
        setPicked((prev) => prev.map((v, j) => (j === i ? true : v)));
        rockRefs.current[i]?.getWorldPosition(at);
        kit.hit(at, { color: '#ffb27a', line: kit.done === 0 ? SAMPLE_LINES : undefined });
      }
    }
    // Place the rover on the surface, wheels down, facing where it drives.
    const r = rover.current;
    if (r) {
      r.position.copy(d.dir).multiplyScalar(1.0);
      tangent.copy(d.target >= 0 ? d.to : IDLE_HEADING).sub(tmpDir.copy(d.dir).multiplyScalar(d.dir.dot(d.target >= 0 ? d.to : IDLE_HEADING)));
      if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0).sub(tmpDir.copy(d.dir).multiplyScalar(d.dir.x));
      tangent.normalize();
      right.crossVectors(d.dir, tangent).normalize();
      basis.makeBasis(right, d.dir, tangent);
      qTmp.setFromRotationMatrix(basis);
      r.quaternion.slerp(qTmp, Math.min(1, dt * 6));
      const bounce = d.target >= 0 && !reducedMotion ? Math.abs(Math.sin(clock.current * 14)) * 0.006 : 0;
      r.position.addScaledVector(d.dir, bounce);
    }
    for (let __i = 0; __i < wheels.current.length; __i++) {
      const w = wheels.current[__i];
      if (w === undefined) continue;
      if (w) w.rotation.x = d.wheel;
    }
    for (let i = 0; i < rocks.length; i++) {
      const g = rockRefs.current[i];
      if (!g) continue;
      const since = (pickedAt.current[i] ?? -1) < 0 ? 0 : clock.current - (pickedAt.current[i] ?? 0);
      g.scale.setScalar(t.size * (since > 0 ? popScale(since) : 1));
      g.visible = since === 0 || since < 0.45;
    }
  });

  return (
    <StageGroup onMiss={() => kit.miss()}>
      {rocks.map((rock, i) => (
        <group
          key={i}
          position={rock.dir}
          quaternion={rock.quat}
          ref={(g) => {
            rockRefs.current[i] = g;
          }}
        >
          <Tappable
            hitRadius={0.13}
            disabled={picked[i] || queue.includes(i)}
            hoverScale={1.15}
            onTap={() => {
              if (picked[i] || queued.current.includes(i)) return;
              queued.current.push(i);
              setQueue([...queued.current]);
              actions.sfx('tap');
            }}
          >
            <mesh geometry={rockGeo} scale={0.05} position={[0, 0.028, 0]}>
              <meshStandardMaterial color="#b0674a" roughness={0.75} flatShading emissive="#5a1c08" emissiveIntensity={0.45} />
            </mesh>
            <mesh position={[0.02, 0.065, 0.02]} scale={0.013}>
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#fff3c4" toneMapped={false} />
            </mesh>
            <Glow color="#ffe08a" scale={0.08} opacity={0.95} position={[0.02, 0.065, 0.02]} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
              <ringGeometry args={[0.075, 0.095, 40]} />
              <meshBasicMaterial color={queue.includes(i) ? '#7dffa8' : kit.helping && i === next ? '#ffffff' : '#ffd36b'} transparent opacity={0.9} toneMapped={false} depthWrite={false} />
            </mesh>
            <Glow color="#ffb35c" scale={0.22} opacity={queue.includes(i) || (kit.helping && i === next) ? 0.8 : 0.35} position={[0, 0.03, 0]} />
          </Tappable>
        </group>
      ))}
      <group ref={rover} scale={0.1}>
        <Rover
          wheelRef={(i, g) => {
            wheels.current[i] = g;
          }}
        />
      </group>
    </StageGroup>
  );
}

/** A friendly six-wheeled rover with big camera eyes on its mast. */
function Rover({ wheelRef }: { wheelRef: (i: number, g: Group | null) => void }) {
  const wheelPos: [number, number, number][] = [
    [-0.62, 0.22, 0.55], [0.62, 0.22, 0.55], [-0.66, 0.22, 0], [0.66, 0.22, 0], [-0.62, 0.22, -0.55], [0.62, 0.22, -0.55],
  ];
  return (
    <group>
      <RoundedBox args={[1.05, 0.38, 1.35]} radius={0.12} smoothness={3} position={[0, 0.58, 0]}>
        <meshPhysicalMaterial color="#f2f0ea" roughness={0.35} clearcoat={0.8} />
      </RoundedBox>
      <mesh position={[0, 0.8, -0.1]}>
        <boxGeometry args={[1.25, 0.05, 1.1]} />
        <meshPhysicalMaterial color="#2c5bd6" metalness={0.4} roughness={0.3} clearcoat={1} emissive="#0b2a8a" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0.28, 1.12, 0.45]}>
        <cylinderGeometry args={[0.05, 0.05, 0.62, 10]} />
        <meshStandardMaterial color="#c9ccd6" metalness={0.6} roughness={0.35} />
      </mesh>
      <group position={[0.28, 1.5, 0.5]}>
        <RoundedBox args={[0.5, 0.26, 0.26]} radius={0.07} smoothness={3}>
          <meshPhysicalMaterial color="#f7f5ef" roughness={0.3} clearcoat={1} />
        </RoundedBox>
        {[-0.12, 0.12].map((x) => (
          <group key={x} position={[x, 0, 0.13]}>
            <mesh>
              <sphereGeometry args={[0.085, 16, 12]} />
              <meshStandardMaterial color="#1b1d2e" roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[0.025, 0.03, 0.07]}>
              <sphereGeometry args={[0.022, 8, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
      </group>
      <mesh position={[-0.35, 1.05, -0.45]}>
        <cylinderGeometry args={[0.015, 0.015, 0.5, 6]} />
        <meshStandardMaterial color="#c9ccd6" />
      </mesh>
      <mesh position={[-0.35, 1.32, -0.45]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshBasicMaterial color="#ff5a6e" toneMapped={false} />
      </mesh>
      {wheelPos.map((p, i) => (
        <group
          key={i}
          position={p}
          ref={(g) => {
            wheelRef(i, g);
          }}
        >
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.22, 0.18, 16]} />
            <meshStandardMaterial color="#3a3d4d" roughness={0.8} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[p[0] > 0 ? 0.095 : -0.095, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.02, 12]} />
            <meshStandardMaterial color="#d8dbe6" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
