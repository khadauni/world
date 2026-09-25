import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PlaneGeometry, Quaternion, Vector3, type Group } from 'three';
import type { Tiered } from '@/core/types';
import { Tappable } from '@/engine/kit';
import { useDisposable } from '../parts/hooks';
import { Pin } from '../parts/Pin';
import { tier } from '@/core/tier';
import { hurricaneMaterial } from '../shaders/fx';
import { moonSlot, useSolar } from '../state';
import { Halo, StageGroup, type TaskProps } from './common';
import { easeAngle } from './geometry';
import { assistSpeed, earthThings, tuningFor, type EarthThing } from './rules';
import { useTaskKit } from './useTaskKit';

const NAMES: Record<EarthThing, { emoji: string; name: Tiered<string>; found: Tiered<string> }> = {
  moon: {
    emoji: '🌙',
    name: { tiny: 'Moon', junior: 'The Moon', senior: 'The Moon' },
    found: { tiny: 'The Moon! Hello, Moon! 🌙', junior: 'You found the Moon — Earth’s only natural moon!', senior: 'The Moon: about 384,000 km away, always showing Earth the same face.' },
  },
  satellite: {
    emoji: '🛰️',
    name: 'Satellite',
    found: { tiny: 'A satellite! 🛰️', junior: 'A satellite! People built it to help with maps, phones and weather.', senior: 'An artificial satellite — thousands orbit Earth for navigation, weather, science and communication.' },
  },
  hurricane: {
    emoji: '🌀',
    name: 'Hurricane',
    found: { tiny: 'A big storm! 🌀', junior: 'A hurricane — a giant spinning storm!', senior: 'A hurricane: warm ocean water powers these spinning storms, which can be hundreds of km across.' },
  },
};

const STORM_DIR = new Vector3(0.42, 0.3, 0.86).normalize();
const STORM_POS = STORM_DIR.clone().multiplyScalar(1.03);
const Z = new Vector3(0, 0, 1);
const at = new Vector3();
const ORBITERS = ['moon', 'satellite'] as const;
/** Where the Moon and the satellite hover during the mission: angle from the camera direction ± a slow swing. */
const SWAY = { moon: { base: 1.0, swing: 0.3 }, satellite: { base: -1.25, swing: 0.3 } } as const;

/** Earth: find the Moon (tiny), + a satellite (junior), + a hurricane (senior). */
export function EarthFind({ band, actions, reducedMotion }: TaskProps) {
  const sys = useSolar();
  const things = earthThings(band);
  const t = tuningFor('find-things', band);
  const kit = useTaskKit('find-things', band, actions, things.length, 1800);
  const [found, setFound] = useState<readonly EarthThing[]>([]);
  const followers = useRef<Partial<Record<EarthThing, Group | null>>>({});
  const storm = useRef<Group>(null);
  const plane = useDisposable(() => new PlaneGeometry(1, 1), []);
  const stormMat = useDisposable(() => hurricaneMaterial(sys.time), [sys.time]);
  const stormQuat = useMemo(() => new Quaternion().setFromUnitVectors(Z, STORM_DIR), []);
  const next = things.find((th) => !found.includes(th)) ?? null;

  const clock = useRef(0);
  useEffect(() => {
    sys.spinLock.earth = sys.spin.earth;
    // The Moon and the satellite stop circling (so they never hide behind Earth) and sway gently beside it instead.
    sys.moonSpeed = 0;
    return () => {
      delete sys.spinLock.earth;
      sys.moonSpeed = 1;
    };
  }, [sys]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    clock.current += dt * t.speed * assistSpeed(kit.helpingRef.current) * (reducedMotion ? 0 : 1);
    // Angles are measured around Earth from the camera direction, so both always sit in plain view.
    const az = Math.atan2(-sys.stage.fwd.z, sys.stage.fwd.x);
    const glide = reducedMotion || delta > 0.5 ? 1 : Math.min(1, dt * 2);
    for (let i = 0; i < ORBITERS.length; i++) {
      const th = ORBITERS[i] as (typeof ORBITERS)[number];
      const s = SWAY[th];
      const spotAngle = az + s.base + s.swing * Math.sin(clock.current * 0.45 + i * 2);
      const cur = sys.moonAngles[th] ?? spotAngle;
      sys.moonAngles[th] = easeAngle(cur, spotAngle, glide);
      const g = followers.current[th];
      if (g) g.position.copy(moonSlot(sys, th));
    }
    const u = stormMat.uniforms.uFound;
    if (u) u.value = found.includes('hurricane') ? 1 : 0;
  });

  const tap = (th: EarthThing, obj: Group | null | undefined) => {
    if (found.includes(th)) return;
    setFound((f) => [...f, th]);
    obj?.getWorldPosition(at);
    kit.hit(at, { color: th === 'moon' ? '#e8e4dc' : th === 'satellite' ? '#8fc4ff' : '#ffffff', line: NAMES[th].found });
  };

  const label = (th: EarthThing) => <Pin spec={{ id: `earth-${th}`, text: tier(NAMES[th].name, band), emoji: NAMES[th].emoji, trailing: '✅', variant: 'done', placement: 'above', small: true }} />;

  const R = sys.stage.unit;
  return (
    <>
      {things.includes('moon') && (
        <group
          ref={(g) => {
            followers.current.moon = g;
          }}
        >
          <Tappable hitRadius={R * 0.62 * t.size} disabled={found.includes('moon')} onTap={() => tap('moon', followers.current.moon)}>
            <Halo size={R * 0.95} color={found.includes('moon') ? '#7dffa8' : '#ffffff'} strong={kit.helping && next === 'moon'} opacity={found.includes('moon') ? 1 : 0.55} />
          </Tappable>
          {found.includes('moon') && <group position={[0, R * 0.42, 0]}>{label('moon')}</group>}
        </group>
      )}
      {things.includes('satellite') && (
        <group
          ref={(g) => {
            followers.current.satellite = g;
          }}
        >
          <Tappable hitRadius={R * 0.5 * t.size} disabled={found.includes('satellite')} onTap={() => tap('satellite', followers.current.satellite)}>
            <Halo size={R * 0.7} color={found.includes('satellite') ? '#7dffa8' : '#9fd0ff'} strong={kit.helping && next === 'satellite'} opacity={found.includes('satellite') ? 1 : 0.45} />
          </Tappable>
          {found.includes('satellite') && <group position={[0, R * 0.3, 0]}>{label('satellite')}</group>}
        </group>
      )}
      <StageGroup onMiss={() => kit.miss()}>
        {things.includes('hurricane') && (
          <group ref={storm} position={STORM_POS} quaternion={stormQuat}>
            <Tappable hitRadius={0.3 * t.size} disabled={found.includes('hurricane')} onTap={() => tap('hurricane', storm.current)}>
              <mesh geometry={plane} material={stormMat} scale={0.44} renderOrder={2} />
              {(found.includes('hurricane') || (kit.helping && next === 'hurricane')) && (
                <group position={[0, 0, 0.25]}>
                  {/* Lifted off the surface so the flat ring never cuts into the curved Earth. */}
                  <Halo size={0.72} color={found.includes('hurricane') ? '#7dffa8' : '#ffffff'} strong={!found.includes('hurricane')} />
                </group>
              )}
            </Tappable>
            {found.includes('hurricane') && <group position={[0, 0.3, 0.05]}>{label('hurricane')}</group>}
          </group>
        )}
      </StageGroup>
    </>
  );
}
