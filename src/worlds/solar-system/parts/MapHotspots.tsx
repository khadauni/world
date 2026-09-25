import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { PlaneGeometry, type Color, type ExtrudeGeometry, type Group, type ShaderMaterial } from 'three';
import { tier } from '@/core/tier';
import type { AgeBand, Tiered, WorldActions, WorldStop } from '@/core/types';
import { Tappable } from '@/engine/kit';
import { BODIES, isBodyId, type BodyId } from '../layout';
import { haloMaterial } from '../shaders/fx';
import { useSolar } from '../state';
import type { StopStatus as OrbitStatus } from '../status';
import { useDisposable } from './hooks';
import type { LabelSpec } from '../labels';
import { Pin } from './Pin';
import { puffyStar } from './shapes';
import { Facing } from './Facing';

const LOCKED_LINE: Tiered<string> = {
  tiny: 'Let’s visit the bouncing one first! 👆',
  junior: 'That stop is still locked — try the glowing one first!',
  senior: 'Locked for now: complete the highlighted stop first.',
};

const HALO: Record<OrbitStatus, string> = { done: '#ffd35a', next: '#8fe3ff', open: '#b9c6ff', locked: '#6f7ab8' };

/** Map mode: tappable glowing rings + name tags on every stop; stars on the ones already mastered. */
export function MapHotspots({
  stops,
  status,
  band,
  actions,
  reducedMotion,
}: {
  stops: readonly WorldStop[];
  status: Readonly<Record<BodyId, OrbitStatus>>;
  band: AgeBand;
  actions: WorldActions;
  reducedMotion: boolean;
}) {
  const star = useDisposable(puffyStar, []);
  return (
    <>
      {stops.map((stop, i) =>
        isBodyId(stop.id) ? (
          <Hotspot
            key={stop.id}
            id={stop.id}
            index={i}
            title={tier(stop.title, band)}
            emoji={stop.emoji}
            accent={stop.color}
            status={status[stop.id]}
            star={star}
            reducedMotion={reducedMotion}
            onTap={() => {
              if (status[stop.id as BodyId] === 'locked') {
                actions.sfx('tap');
                actions.say(LOCKED_LINE);
                return;
              }
              actions.sfx('pop');
              actions.selectStop(stop.id);
            }}
          />
        ) : null,
      )}
    </>
  );
}

function Hotspot({
  id,
  index,
  title,
  emoji,
  accent,
  status,
  star,
  reducedMotion,
  onTap,
}: {
  id: BodyId;
  index: number;
  title: string;
  emoji: string;
  accent: string;
  status: OrbitStatus;
  star: ExtrudeGeometry;
  reducedMotion: boolean;
  onTap: () => void;
}) {
  const sys = useSolar();
  const g = useRef<Group>(null);
  const starRef = useRef<Group>(null);
  const R = BODIES[id].radius;
  const ringSize = id === 'sun' ? R * 2.7 : Math.max(R * 2.9, 3.2);
  const plane = useDisposable(() => new PlaneGeometry(ringSize, ringSize), [ringSize]);
  const mat = useDisposable(() => haloMaterial(sys.time), [sys.time]);
  useLayoutEffect(() => {
    const u = (mat as ShaderMaterial).uniforms;
    (u.uColor?.value as Color | undefined)?.set(HALO[status]);
    if (u.uDashes) u.uDashes.value = status === 'next' ? 10 : 0;
    if (u.uPulse) u.uPulse.value = status === 'next' && !reducedMotion ? 1 : 0;
    if (u.uOpacity) u.uOpacity.value = status === 'locked' ? 0.35 : status === 'open' ? 0.7 : 1;
  }, [mat, status, reducedMotion]);

  useFrame(() => {
    g.current?.position.copy(sys.positions[id]);
    const s = starRef.current;
    if (s) {
      s.rotation.y = sys.time.value * 1.4;
      s.position.y = ringSize * 0.5 + 0.55 + (reducedMotion ? 0 : Math.sin(sys.time.value * 2 + index) * 0.15);
    }
  });

  // The line-up zig-zags: far planets get their tag above, near ones below, so neighbours never collide.
  const placement: 'above' | 'below' = id === 'sun' || BODIES[id].phase > 0 ? 'above' : 'below';
  const tagY = placement === 'above' ? ringSize * 0.5 + (status === 'done' ? 1.4 : 0.35) : -ringSize * 0.5 - 0.2;
  const hit = id === 'sun' ? R * 1.15 : Math.max(R * 1.7, 2.1);
  const spec = useMemo<LabelSpec>(
    () => ({
      id: `map-${id}`,
      text: title,
      emoji: status === 'locked' ? '🔒' : emoji,
      trailing: status === 'done' ? '⭐' : undefined,
      variant: status === 'open' ? ('plain' as const) : status,
      placement,
      accent,
    }),
    [id, title, status, emoji, placement, accent],
  );

  return (
    <group ref={g}>
      <Tappable onTap={onTap} hitRadius={hit} hoverScale={1.15} name={`hotspot-${id}`}>
        <Facing>
          <mesh geometry={plane} material={mat} renderOrder={7} />
        </Facing>
      </Tappable>
      {status === 'done' && (
        <group ref={starRef}>
          <mesh geometry={star} scale={0.9}>
            <meshPhysicalMaterial color="#ffc93c" emissive="#ff9d00" emissiveIntensity={0.55} metalness={0.3} roughness={0.25} clearcoat={1} />
          </mesh>
        </group>
      )}
      <Pin spec={spec} offset={[0, tagY, 0]} />
    </group>
  );
}
