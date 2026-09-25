import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AdditiveBlending, Vector3, type Group, type Mesh, type SpriteMaterial } from 'three';
import { tier } from '@/core/tier';
import { emojiTexture, glowTexture, Tappable } from '@/engine/kit';
import { ITEM_INFO } from '../content/healthy';
import { HEALTHY_LINES } from '../content/lines';
import { tuning } from '../logic/bands';
import type { Shot } from '../logic/camera';
import { BAND_ITEMS, healthyStart, heartPower, isEveryday, ringOrder, tapItem, type HealthyState, type ItemId } from '../logic/healthy';
import { BeatDriver } from '../parts/BeatDriver';
import { Burst, PopWords, type BurstHandle, type PopWordHandle } from '../parts/Burst';
import { Heart, makeHeartControl } from '../parts/Heart';
import { ShotCamera } from '../parts/ShotCamera';
import { Tag } from '../parts/Tag';
import { useSpin } from '../parts/useSpin';
import { useOnTaskEnd, useOnTaskStart, useSayThrottle, useTimers, type StopProps } from './common';

const SHOT: Shot = { target: [0, 0.45, 0], dir: [0, 0.12, 1], fit: [7.8, 6.7] };
const SHOT_TALL: Shot = { target: [0, 0.35, 0], dir: [0, 0.12, 1], fit: [6.4, 7.4] };
const EXPLORE: Shot = { target: [0, 0.35, 0], dir: [0.05, 0.14, 1], fit: [6.2, 4.6] };
const ENTRY: Shot = { target: [0, 0, 0], dir: [0, 0.4, 1], fit: [12, 10] };
const HEART_AT: [number, number, number] = [0, 0.45, 0];

/** The choice right above the heart gets its tag on top — below it, the tag would cover the heart. */
function tagAbove(p: readonly [number, number, number]): boolean {
  return Math.abs(p[0]) < 1.6 && p[1] > HEART_AT[1] + 1.2;
}

const textures = new Map<string, ReturnType<typeof emojiTexture>>();
function tex(e: string) {
  let t = textures.get(e);
  if (!t) {
    t = emojiTexture(e, 128);
    textures.set(e, t);
  }
  return t;
}

/**
 * Stop 7 — Keep your heart happy. The heart stands in a sunny meadow, surrounded by bubbles of choices.
 * Every everyday choice (play, sleep, water, fruit & veg) zooms into the heart and powers it up — it
 * glows, grins and grows little flexing arms. Treats are never "bad": they're gently marked "sometimes".
 */
export function HealthySet({ phase, band, task, reducedMotion, quality, actions, arriving, onArrive }: StopProps) {
  const cfg = tuning(band);
  const items = useMemo(() => ringOrder(BAND_ITEMS[band]), [band]);
  const control = useMemo(() => makeHeartControl({ face: { mood: 0.3, squint: 0, lookX: 0, lookY: 0 }, beat: 1.1 }), []);
  const bpm = useRef(72);
  const spinner = useRef<Group>(null);
  const burst = useRef<BurstHandle>(null);
  const words = useRef<PopWordHandle>(null);
  const state = useRef<HealthyState>(healthyStart(cfg.healthy.goal));
  const [picked, setPicked] = useState<readonly ItemId[]>([]);
  const [treats, setTreats] = useState<readonly ItemId[]>([]);
  const [assist, setAssist] = useState(false);
  const power = useRef(0);
  const flex = useRef(0);
  const timers = useTimers();
  const say = useSayThrottle(actions, 600);
  const active = phase === 'task' && task?.kind === 'healthy-choices';
  const activeRef = useRef(active);
  activeRef.current = active;

  useSpin(spinner, phase === 'explore', 0.6);

  // Landscape: a wide oval of choices; portrait tablets: a taller one so labels never collide.
  const portrait = useThree((s) => s.size.width < s.size.height);
  const positions = useMemo(
    () =>
      items.map((_, i) => {
        const a = Math.PI / 2 - (i / items.length) * Math.PI * 2;
        const rx = portrait ? 2.45 : 3.15;
        const ry = portrait ? 2.75 : 1.95;
        return [Math.cos(a) * rx, 0.45 + Math.sin(a) * ry, Math.sin(a) * -0.4 + 0.3] as [number, number, number];
      }),
    [items, portrait],
  );

  useOnTaskStart(phase, () => {
    state.current = healthyStart(cfg.healthy.goal);
    setPicked([]);
    setTreats([]);
    setAssist(false);
    actions.taskProgress(0, cfg.healthy.goal);
  });
  useOnTaskEnd(phase, () => {
    power.current = 1;
    setAssist(false);
  });

  const onItem = (id: ItemId, i: number) => {
    if (!activeRef.current) return;
    const r = tapItem(state.current, id, cfg.assistAfter);
    if (r.event === 'ignored') return;
    state.current = r.state;
    const p = positions[i] as [number, number, number];
    if (r.event === 'treat') {
      setTreats(r.state.treats);
      actions.sfx('pop');
      if (r.state.assist && !assist) {
        setAssist(true);
        actions.say(HEALTHY_LINES.assist);
      } else say(ITEM_INFO[id].line, true);
      return;
    }
    setPicked(r.state.picked);
    flex.current = 1;
    actions.sfx('collect');
    burst.current?.fire(p, '#fff4b0', 16, 2);
    timers(() => burst.current?.fire([HEART_AT[0], HEART_AT[1], 0.8], '#ff9fc0', 22, 2.6), 380);
    words.current?.pop(band === 'tiny' ? 'YAY!' : '+1 ❤️', [HEART_AT[0] + 1.1, HEART_AT[1] + 1.4, 0.8], '#fff4b0');
    actions.taskProgress(r.state.picked.length, cfg.healthy.goal);
    if (r.event === 'done') {
      actions.say(HEALTHY_LINES.done);
      timers(() => {
        actions.sfx('celebrate');
        burst.current?.fire([HEART_AT[0], HEART_AT[1] + 0.4, 0.6], '#ffd970', 60, 4.4);
        flex.current = 1;
      }, 500);
      timers(() => actions.completeTask(), 2100);
    } else say(ITEM_INFO[id].line, true);
  };

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const goal = phase === 'task' ? heartPower(state.current) : phase === 'explore' || phase === 'travel' ? 0.35 : 1;
    power.current += (goal - power.current) * Math.min(1, dt * 3);
    control.power = power.current;
    control.face.mood = 0.2 + power.current * 0.9;
    control.face.lookY = 0.1;
    bpm.current = 70 + power.current * 12;
    control.beat = 1 + power.current * 0.4;
    flex.current = Math.max(0, flex.current - dt * 1.2);
  });

  const showLabels = band !== 'tiny' && (phase === 'explore' || active);
  return (
    <>
      <ShotCamera shot={active ? (portrait ? SHOT_TALL : SHOT) : EXPLORE} entry={ENTRY} reducedMotion={reducedMotion} smooth={1.1} onSettled={() => arriving && onArrive()} />
      <BeatDriver bpm={bpm} />
      <Meadow detail={quality.detail} reducedMotion={reducedMotion} trees={!portrait} />
      <group ref={spinner} position={HEART_AT}>
        <group scale={0.82}>
          <Heart control={control} detail={quality.detail} face reducedMotion={reducedMotion} />
          <Arms power={power} flex={flex} reducedMotion={reducedMotion} />
        </group>
        <PowerHalo power={power} />
      </group>
      {(active || phase === 'explore') &&
        items.map((id, i) => {
          const p = positions[i] as [number, number, number];
          const info = ITEM_INFO[id];
          const gone = picked.includes(id);
          const isTreat = treats.includes(id);
          return (
            <ItemBubble
              key={id}
              position={p}
              emoji={info.emoji}
              gone={gone}
              sometimes={isTreat}
              sparkle={active && assist && isEveryday(id) && !gone}
              onTap={() => onItem(id, i)}
              interactive={active}
              size={band === 'tiny' ? 1.2 : 1}
              reducedMotion={reducedMotion}
              seed={i}
              label={
                <Tag
                  id={`healthy-${id}`}
                  position={tagAbove(p) ? [0, 0.66, 0] : [0, -0.72, 0]}
                  placement={tagAbove(p) ? 'above' : 'below'}
                  text={isTreat ? `${tier(info.label, band)} · sometimes` : tier(info.label, band)}
                  accent={isTreat ? '#ffb020' : '#3ccb7f'}
                  visible={(showLabels || isTreat) && !gone}
                />
              }
            />
          );
        })}
      <PopWords ref={words} reducedMotion={reducedMotion} size={0.9} />
      <Burst ref={burst} count={Math.round(100 * quality.particleScale) + 30} reducedMotion={reducedMotion} />
    </>
  );
}

/** Cute noodle arms with round fists that grow as the heart gets stronger — and flex on every good choice. */
function Arms({ power, flex, reducedMotion }: { power: RefObject<number>; flex: RefObject<number>; reducedMotion: boolean }) {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const p = Math.max(0, Math.min(1, ((power.current ?? 0) - 0.15) / 0.5));
    const f = reducedMotion ? 0 : Math.sin(Math.min(1, flex.current ?? 0) * Math.PI);
    for (let side = -1; side <= 1; side += 2) {
      const g = side < 0 ? left.current : right.current;
      if (!g) continue;
      g.scale.setScalar(p);
      g.visible = p > 0.02;
      g.rotation.z = side * (0.5 + f * 0.9 + Math.sin(t.current * 2 + side) * 0.05);
    }
  });
  return (
    <>
      <group ref={left} position={[-1.05, -0.3, 0.3]}>
        <mesh position={[-0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.09, 0.55, 6, 12]} />
          <meshPhysicalMaterial color="#e24d68" roughness={0.35} clearcoat={1} />
        </mesh>
        <mesh position={[-0.75, 0.05, 0]}>
          <sphereGeometry args={[0.17, 18, 14]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.3} clearcoat={1} />
        </mesh>
      </group>
      <group ref={right} position={[1.15, -0.35, 0.2]}>
        <mesh position={[0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.09, 0.55, 6, 12]} />
          <meshPhysicalMaterial color="#e24d68" roughness={0.35} clearcoat={1} />
        </mesh>
        <mesh position={[0.75, 0.05, 0]}>
          <sphereGeometry args={[0.17, 18, 14]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.3} clearcoat={1} />
        </mesh>
      </group>
    </>
  );
}

/** A warm glow + ring behind the heart that grows with its power. */
function PowerHalo({ power }: { power: RefObject<number> }) {
  const glow = useRef<SpriteMaterial>(null);
  const ring = useRef<Mesh>(null);
  useFrame((_, dt) => {
    const p = power.current ?? 0;
    if (glow.current) glow.current.opacity = 0.25 + p * 0.6;
    if (ring.current) {
      ring.current.scale.setScalar(2.2 + p * 0.5);
      ring.current.rotation.z += Math.min(dt, 0.1) * 0.6;
    }
  });
  return (
    <group position={[0, 0.1, -0.9]}>
      <sprite scale={5.5} renderOrder={0}>
        <spriteMaterial ref={glow} map={glowTexture()} color="#ffd970" transparent opacity={0.3} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </sprite>
      <mesh ref={ring}>
        <ringGeometry args={[0.96, 1, 64, 1, 0, Math.PI * 1.7]} />
        <meshBasicMaterial color="#fff4b0" transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** One choice bubble. Everyday choices fly into the heart; treats stay and show a friendly "sometimes" tag. */
function ItemBubble({
  position,
  emoji,
  gone,
  sometimes,
  sparkle,
  onTap,
  interactive,
  size,
  reducedMotion,
  seed,
  label,
}: {
  position: [number, number, number];
  emoji: string;
  gone: boolean;
  sometimes: boolean;
  sparkle: boolean;
  onTap: () => void;
  interactive: boolean;
  size: number;
  reducedMotion: boolean;
  seed: number;
  label: ReactNode;
}) {
  const g = useRef<Group>(null);
  const halo = useRef<SpriteMaterial>(null);
  const t = useRef(seed * 1.3);
  const fly = useRef(0);
  const home = useMemo(() => new Vector3(...position), [position]);
  const heart = useMemo(() => new Vector3(HEART_AT[0], HEART_AT[1], 0.6), []);
  useFrame((_, dt) => {
    t.current += dt;
    const e = g.current;
    if (!e) return;
    fly.current = gone ? Math.min(1, fly.current + dt * 2.2) : 0;
    const k = fly.current * fly.current;
    e.position.lerpVectors(home, heart, k);
    if (!reducedMotion && !gone) e.position.y += Math.sin(t.current * 1.7) * 0.07;
    const wig = sometimes && !reducedMotion ? Math.sin(t.current * 9) * Math.max(0, 1 - (t.current % 3)) * 0.2 : 0;
    e.rotation.z = wig;
    const pulse = sparkle && !reducedMotion ? 1 + Math.abs(Math.sin(t.current * 5)) * 0.18 : 1;
    e.scale.setScalar(size * pulse * (1 - k));
    e.visible = k < 0.99;
    if (halo.current) halo.current.opacity = sparkle ? 0.95 : sometimes ? 0.2 : 0.45;
  });
  return (
    <group ref={g} position={position}>
      <Tappable onTap={onTap} hitRadius={0.62} disabled={!interactive || gone} hoverScale={1.12}>
        <mesh>
          <sphereGeometry args={[0.5, 28, 20]} />
          <meshPhysicalMaterial color={sometimes ? '#ffe2a8' : '#ffffff'} transparent opacity={0.42} roughness={0.06} clearcoat={1} emissive={sometimes ? '#ffb020' : '#ffd6e6'} emissiveIntensity={0.25} depthWrite={false} />
        </mesh>
        <sprite scale={0.62} renderOrder={6}>
          <spriteMaterial map={tex(emoji)} transparent depthWrite={false} />
        </sprite>
        <mesh position={[-0.18, 0.22, 0.4]} scale={[0.08, 0.05, 0.02]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <sprite scale={1.5} renderOrder={1}>
          <spriteMaterial ref={halo} map={glowTexture()} color={sparkle ? '#fff4b0' : '#ffffff'} transparent opacity={0.45} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </sprite>
      </Tappable>
      {label}
    </group>
  );
}

/** A soft green hill with candy trees and flowers — the heart's playground. */
function Meadow({ detail, reducedMotion, trees: showTrees }: { detail: number; reducedMotion: boolean; trees: boolean }) {
  const trees = useRef<Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const kids = trees.current?.children;
    if (kids && !reducedMotion) for (let i = 0; i < kids.length; i++) (kids[i] as Group).rotation.z = Math.sin(t.current * 1.2 + i) * 0.04;
  });
  const seg = Math.max(24, Math.round(64 * detail));
  return (
    <group position={[0, -3.05, -3.2]}>
      <mesh scale={[1.7, 0.3, 0.6]}>
        <sphereGeometry args={[5.4, seg, Math.round(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#72d98f" roughness={0.85} sheen={1} sheenColor="#e6ffe9" />
      </mesh>
      <group ref={trees} visible={showTrees}>
        {/* Out on the edges of the hill, well clear of the ring of choices. */}
        {[
          [-6.9, 0.85, -1.2, 1],
          [6.9, 0.85, -1.3, 0.92],
        ].map(([x, y, z, s], i) => (
          <group key={i} position={[x as number, y as number, z as number]} scale={s as number}>
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.12, 0.18, 1.1, 10]} />
              <meshStandardMaterial color="#b9795a" roughness={0.7} />
            </mesh>
            <mesh position={[0, 1.35, 0]}>
              <sphereGeometry args={[0.72, 20, 16]} />
              <meshPhysicalMaterial color={i % 2 ? '#3ccb7f' : '#58cc02'} roughness={0.45} clearcoat={0.6} />
            </mesh>
            <mesh position={[0.3, 1.1, 0.5]}>
              <sphereGeometry args={[0.12, 12, 10]} />
              <meshStandardMaterial color="#ff5a7a" roughness={0.3} />
            </mesh>
          </group>
        ))}
      </group>
      {[
        [-1.8, 1.58, 1.2, '#ffd970'],
        [1.6, 1.6, 1.4, '#ff8fb1'],
        [-0.6, 1.62, 1.8, '#b98cff'],
        [2.8, 1.4, 1.5, '#ffffff'],
        [-3.1, 1.35, 1.4, '#ff8fb1'],
      ].map(([x, y, z, c], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]}>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshStandardMaterial color={c as string} emissive={c as string} emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  );
}
