import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Quaternion, Vector3, type Group } from 'three';
import { mulberry32 } from '@/core/random';
import { Glow, Tappable } from '@/engine/kit';
import { BODIES, tiltAxis } from '../layout';
import { useSolar } from '../state';
import { Halo, popScale, type TaskProps } from './common';
import { azimuth } from './geometry';
import { assistSpeed, tuningFor } from './rules';
import { useTaskKit } from './useTaskKit';

const axis = new Vector3();
const tiltQ = new Quaternion();
const inv = new Quaternion();
const local = new Vector3();
const at = new Vector3();

/** Saturn: sparkling ice chunks ride around in the rings — tap to collect them. */
export function SaturnIce({ band, actions, reducedMotion }: TaskProps) {
  const sys = useSolar();
  const t = tuningFor('collect-ice', band);
  const kit = useTaskKit('collect-ice', band, actions, t.count);
  const R = BODIES.saturn.radius;
  const chunks = useMemo(() => {
    const rand = mulberry32(44);
    // Spread them across the half of the rings facing the camera (never hidden behind the planet).
    tiltAxis('saturn', sys.positions.saturn, axis);
    tiltQ.setFromAxisAngle(axis, BODIES.saturn.tilt);
    local.copy(sys.stage.fwd).applyQuaternion(inv.copy(tiltQ).invert());
    const az0 = azimuth(local);
    return Array.from({ length: t.count }, (_, i) => ({
      angle: az0 + ((i + 0.5) / t.count - 0.5) * 4.1 + (rand() - 0.5) * 0.15,
      radius: 1.6 + ((i * 0.61) % 1) * 0.62,
      bob: rand() * 6,
      spin: 0.6 + rand(),
    }));
  }, [t.count, sys]);
  const [got, setGot] = useState<readonly boolean[]>(() => chunks.map(() => false));
  const gotAt = useRef<number[]>(chunks.map(() => -1));
  const angles = useRef<number[]>(chunks.map((c) => c.angle));
  const refs = useRef<(Group | null)[]>([]);
  const crystals = useRef<(Group | null)[]>([]);
  const clock = useRef(0);
  const next = got.findIndex((g) => !g);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    clock.current += dt;
    tiltAxis('saturn', sys.positions.saturn, axis);
    tiltQ.setFromAxisAngle(axis, BODIES.saturn.tilt);
    const mul = 0.06 * t.speed * assistSpeed(kit.helpingRef.current) * (reducedMotion ? 0.3 : 1);
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      if (c === undefined) continue;
      const g = refs.current[i];
      if (!g) continue;
      angles.current[i] = (angles.current[i] ?? 0) + dt * mul * (2.1 / c.radius);
      const a = angles.current[i] ?? 0;
      local.set(Math.cos(a) * c.radius * R, (reducedMotion ? 0 : Math.sin(clock.current * 1.5 + c.bob) * 0.04) * R, -Math.sin(a) * c.radius * R);
      g.position.copy(local.applyQuaternion(tiltQ)).add(sys.positions.saturn);
      const since = (gotAt.current[i] ?? -1) < 0 ? 0 : clock.current - (gotAt.current[i] ?? 0);
      g.scale.setScalar(t.size * (since > 0 ? popScale(since) : 1));
      g.visible = since === 0 || since < 0.45;
      const cr = crystals.current[i];
      if (cr) cr.rotation.set(clock.current * c.spin, clock.current * c.spin * 0.7, 0);
    }
  });

  return (
    <group onPointerMissed={() => kit.miss()}>
      {chunks.map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
        >
          <Tappable
            hitRadius={R * 0.26}
            disabled={got[i]}
            hoverScale={1.2}
            onTap={() => {
              if (got[i]) return;
              gotAt.current[i] = clock.current;
              setGot((prev) => prev.map((v, j) => (j === i ? true : v)));
              refs.current[i]?.getWorldPosition(at);
              kit.hit(at, { color: '#bfefff' });
            }}
          >
            <group
              ref={(g) => {
                crystals.current[i] = g;
              }}
            >
              <mesh scale={[R * 0.12, R * 0.18, R * 0.12]}>
                <octahedronGeometry args={[1, 0]} />
                <meshPhysicalMaterial color="#e8f9ff" emissive="#62cfff" emissiveIntensity={0.85} roughness={0.06} metalness={0.1} clearcoat={1} flatShading />
              </mesh>
            </group>
            <Glow color="#8fe2ff" scale={R * 0.5} opacity={0.85} />
            <Glow color="#ffffff" scale={R * 0.18} opacity={0.9} />
            {/* A soft ring marks every chunk as tappable against the bright rings; it pulses when the world helps. */}
            <Halo size={R * 0.6} color={kit.helping && i === next ? '#fff6c8' : '#9fe8ff'} strong={kit.helping && i === next} opacity={kit.helping && i === next ? 1 : 0.55} />
          </Tappable>
        </group>
      ))}
    </group>
  );
}
