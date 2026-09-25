import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { Quaternion, Vector3, type Group } from 'three';
import type { Tiered } from '@/core/types';
import { Tappable } from '@/engine/kit';
import { BODIES, GALILEAN, MOONS, tiltAxis, type GalileanMoon } from '../layout';
import { Pin } from '../parts/Pin';
import { GIANTS } from '../shaders/giant';
import { latLonDir } from '../shaders/mars';
import { moonSlot, useSolar } from '../state';
import { Halo, TargetRing, type TaskProps } from './common';
import { azimuth, easeAngle, spinToFace } from './geometry';
import { MOON_PARADE, OOPS_LINE, isCorrectMoon, jupiterGoal, nextMoon, tuningFor } from './rules';
import { useTaskKit } from './useTaskKit';

const MOON_NAMES: Record<GalileanMoon, string> = { io: 'Io', europa: 'Europa', ganymede: 'Ganymede', callisto: 'Callisto' };
const MOON_HINTS: Record<GalileanMoon, string> = {
  io: 'Io — the closest, covered in volcanoes',
  europa: 'Europa — icy, and thought to hide an ocean under its crust',
  ganymede: 'Ganymede — the biggest moon in the Solar System',
  callisto: 'Callisto — dark and covered in craters',
};

const GRS = GIANTS.jupiter.spot;
const GRS_DIR = latLonDir(GRS.lat, GRS.lon);
const axis = new Vector3();
const tiltQ = new Quaternion();
const spinQ = new Quaternion();
const spot = new Vector3();
const Y = new Vector3(0, 1, 0);
const at = new Vector3();
/** Gentle drift around each parade spot (radians) so the moons still feel alive. */
const DRIFT = 0.07;

/** Jupiter: tiny taps the Great Red Spot; junior finds 2 moons; senior finds all 4 Galilean moons in order. */
export function JupiterMoons(props: TaskProps) {
  return jupiterGoal(props.band).mode === 'spot' ? <RedSpot {...props} /> : <GalileanHunt {...props} />;
}

function RedSpot({ band, actions, reducedMotion }: TaskProps) {
  const sys = useSolar();
  const t = tuningFor('jupiter-moons', band);
  const kit = useTaskKit('jupiter-moons', band, actions, 1, 1800);
  const target = useRef<Group>(null);
  const [got, setGot] = useState(false);
  const R = BODIES.jupiter.radius;

  useEffect(() => {
    const pos = sys.positions.jupiter;
    tiltAxis('jupiter', pos, axis);
    tiltQ.setFromAxisAngle(axis, BODIES.jupiter.tilt);
    // Turn the storm to face the camera, a little below centre.
    sys.spinLock.jupiter = spinToFace(GRS_DIR, sys.stage.fwd, tiltQ);
    return () => {
      delete sys.spinLock.jupiter;
    };
  }, [sys]);

  useFrame(() => {
    const g = target.current;
    if (!g) return;
    const pos = sys.positions.jupiter;
    tiltAxis('jupiter', pos, axis);
    tiltQ.setFromAxisAngle(axis, BODIES.jupiter.tilt);
    spinQ.setFromAxisAngle(Y, sys.spin.jupiter);
    spot.copy(GRS_DIR).applyQuaternion(spinQ).applyQuaternion(tiltQ).multiplyScalar(R * 1.02).add(pos);
    g.position.copy(spot);
  });

  return (
    <group ref={target} onPointerMissed={() => kit.miss(OOPS_LINE)}>
      <Tappable
        hitRadius={R * 0.42 * t.size}
        disabled={got}
        onTap={() => {
          if (got) return;
          setGot(true);
          target.current?.getWorldPosition(at);
          kit.hit(at, { color: '#ff7a4a', line: { tiny: 'You found the giant storm! 🌀', junior: 'The Great Red Spot!', senior: 'The Great Red Spot!' } });
        }}
      >
        <TargetRing size={R * 0.72} color={got ? '#7dffa8' : '#fff3b0'} pulse={!got && !reducedMotion} />
      </Tappable>
      {got && (
        <Pin spec={{ id: 'jupiter-grs', text: 'Great Red Spot', emoji: '🌀', trailing: '✅', variant: 'done', placement: 'above', small: true }} offset={[0, R * 0.42, 0]} />
      )}
    </group>
  );
}

function GalileanHunt({ band, actions, reducedMotion }: TaskProps) {
  const sys = useSolar();
  const goal = jupiterGoal(band);
  const t = tuningFor('jupiter-moons', band);
  const total = goal.mode === 'any' ? goal.need : goal.mode === 'ordered' ? goal.order.length : 1;
  const kit = useTaskKit('jupiter-moons', band, actions, total, 1800);
  const [found, setFound] = useState<readonly GalileanMoon[]>([]);
  const refs = useRef<Partial<Record<GalileanMoon, Group | null>>>({});
  const R = BODIES.jupiter.radius;
  const want = nextMoon(goal, found);

  const clock = useRef(0);
  useEffect(() => {
    // The moons stop orbiting and glide to their parade spots; they orbit again once the mission is over.
    sys.moonSpeed = 0;
    return () => {
      sys.moonSpeed = 1;
    };
  }, [sys]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    clock.current += dt * (reducedMotion ? 0 : 1);
    // Camera direction in Jupiter's (tilted) equatorial frame: parade angles are measured from it.
    tiltAxis('jupiter', sys.positions.jupiter, axis);
    tiltQ.setFromAxisAngle(axis, BODIES.jupiter.tilt).invert();
    const az = azimuth(spot.copy(sys.stage.fwd).applyQuaternion(tiltQ));
    const glide = reducedMotion || delta > 0.5 ? 1 : Math.min(1, dt * 3);
    for (let i = 0; i < GALILEAN.length; i++) {
      const m = GALILEAN[i] as GalileanMoon;
      const spotAngle = az + MOON_PARADE[m] + DRIFT * Math.sin(clock.current * 0.5 * t.speed + i * 1.7);
      const cur = sys.moonAngles[m] ?? spotAngle;
      sys.moonAngles[m] = easeAngle(cur, spotAngle, glide);
      refs.current[m]?.position.copy(moonSlot(sys, m));
    }
  });

  const tap = (m: GalileanMoon) => {
    if (found.includes(m)) return;
    if (!isCorrectMoon(goal, found, m)) {
      const wantNow = nextMoon(goal, found);
      const line: Tiered<string> | null = wantNow
        ? { tiny: 'Oops! Try another one!', junior: `That's ${MOON_NAMES[m]}! Try another.`, senior: `That's ${MOON_NAMES[m]}. Find ${MOON_HINTS[wantNow]}.` }
        : OOPS_LINE;
      kit.miss(line);
      return;
    }
    const nowFound = [...found, m];
    setFound(nowFound);
    refs.current[m]?.getWorldPosition(at);
    const after = nextMoon(goal, nowFound);
    const line: Tiered<string> = after
      ? { tiny: `Yay! ${MOON_NAMES[m]}!`, junior: `You found ${MOON_NAMES[m]}!`, senior: `${MOON_NAMES[m]} ✓ Next: ${MOON_HINTS[after]}.` }
      : { tiny: `Yay! ${MOON_NAMES[m]}!`, junior: `${MOON_NAMES[m]}! Great moon spotting!`, senior: `${MOON_NAMES[m]} ✓ All four Galilean moons found!` };
    kit.hit(at, { color: '#fff1c9', line });
  };

  return (
    <group onPointerMissed={() => kit.miss()}>
      {GALILEAN.map((m) => {
        const d = MOONS.jupiter[m];
        const isFound = found.includes(m);
        const highlight = kit.helping && !isFound && (want ? want === m : found.length < total);
        return (
          <group
            key={m}
            ref={(g) => {
              refs.current[m] = g;
            }}
          >
            <Tappable hitRadius={R * Math.max(0.2, d.radius * 2.4) * t.size} disabled={isFound} onTap={() => tap(m)}>
              <Halo size={R * Math.max(0.3, d.radius * 4.2)} color={isFound ? '#7dffa8' : highlight ? '#fff6c8' : '#9fc3ff'} strong={highlight} opacity={isFound || highlight ? 1 : 0.32} />
            </Tappable>
            {isFound && (
              <Pin spec={{ id: `jupiter-${m}`, text: MOON_NAMES[m], emoji: '🌙', trailing: '✅', variant: 'done', placement: 'above', small: true }} offset={[0, R * d.radius * 2.4, 0]} />
            )}
          </group>
        );
      })}
    </group>
  );
}
