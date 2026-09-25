import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AdditiveBlending, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import { tier } from '@/core/tier';
import { glowTexture } from '@/engine/kit';
import { LAB_LINES, pick } from '../content/lines';
import { PART_INFO } from '../content/parts';
import { tuning } from '../logic/bands';
import type { Shot } from '../logic/camera';
import { PARTS, PART_SIDE, isValve, type PartId } from '../logic/ids';
import { labFit, labLayout, labProgress, labStart, placePart, pullPart, suggestedPull, type LabState, type PartShape } from '../logic/lab';
import { heartBuild } from '../parts/anatomy';
import { BeatDriver } from '../parts/BeatDriver';
import { Burst, type BurstHandle } from '../parts/Burst';
import { Heart, makeHeartControl } from '../parts/Heart';
import { ShotCamera } from '../parts/ShotCamera';
import { Tag } from '../parts/Tag';
import { useSpin } from '../parts/useSpin';
import { useHeart } from '../store';
import { useCommands, useOnTaskEnd, useOnTaskStart, useSayThrottle, useTimers, type StopProps } from './common';

/** Parts a tiny explorer is nudged towards first (big, obvious ones). */
const TINY_ORDER: readonly PartId[] = ['aorta', 'pa', 'lv', 'ra', 'svc', 'rv', 'la', 'ivc', 'pv', 'coronary', 'tricuspid', 'mitral', 'pulmonary', 'aortic'];

const SHOT_CLOSE: Shot = { target: [0.05, 0.18, 0], dir: [0.12, 0.14, 1], fit: [4.6, 4.3] };
const ENTRY: Shot = { target: [0, 0, 0], dir: [0.3, 0.3, 1], fit: [10, 9] };

/** Reused emitter position (no per-emission allocations). */
const SLOSH_AT: [number, number, number] = [0, 0, 0];

/** Where a pulled vessel was attached: blood spills out there until it's back (heart space + colour). */
const LEAK_AT: Partial<Record<PartId, { at: [number, number, number]; color: string }>> = {
  aorta: { at: [0.08, 0.78, 0.12], color: '#ff3450' },
  pa: { at: [0.14, 0.34, 0.56], color: '#5b72ff' },
  svc: { at: [-0.88, 0.82, 0.08], color: '#5b72ff' },
  ivc: { at: [-0.86, -0.14, 0.02], color: '#5b72ff' },
  pv: { at: [0.64, 0.46, -0.6], color: '#ff3450' },
};

function lineFor(id: PartId) {
  return PART_INFO[id].without;
}

/**
 * Stop 4 — The Heart Lab (the signature feature). The model sits on a glowing lab turntable; every part can
 * be pulled out into an exploded view with its name and "what happens without it?". Then the child rebuilds
 * it with satisfying clicks (tap parts or the tray) and the heart starts beating again.
 */
export function LabSet({ phase, band, task, reducedMotion, quality, actions, arriving, onArrive }: StopProps) {
  const cfg = tuning(band);
  const control = useMemo(() => makeHeartControl({ hidden: {}, beat: 1 }), []);
  const bpm = useRef(64);
  const paused = useRef(false);
  const spinner = useRef<Group>(null);
  const burst = useRef<BurstHandle>(null);
  const slosh = useRef<BurstHandle>(null);
  const state = useRef<LabState>(labStart(cfg.lab.goal, cfg.lab.rebuild));
  const [out, setOut] = useState<readonly PartId[]>([]);
  const [stage, setStage] = useState<LabState['stage']>('pull');
  const timers = useTimers();
  const say = useSayThrottle(actions, 600);
  const active = phase === 'task' && task?.kind === 'take-apart';
  const activeRef = useRef(active);
  activeRef.current = active;
  const build = useMemo(() => heartBuild(quality.detail), [quality.detail]);
  const shapes = useMemo(() => {
    const m = {} as Record<PartId, PartShape>;
    for (const id of PARTS) m[id] = { side: PART_SIDE[id], center: build.parts[id].center, size: build.parts[id].size };
    return m;
  }, [build]);
  const portrait = useThree((st) => st.size.width < st.size.height);
  const portraitRef = useRef(portrait);
  portraitRef.current = portrait;
  const sloshClock = useRef(0);
  const idle = useRef(0);

  useSpin(spinner, phase === 'explore' || (active && stage === 'pull'), 0.9);

  /** Fly pulled parts to their shelf slots beside the heart (re-flows as parts come and go). */
  const park = (out: readonly PartId[]) => {
    const layout = labLayout(out, shapes, portraitRef.current);
    for (const id of PARTS) {
      const spot = layout[id];
      control.pulled[id] = spot ? 1 : 0;
      if (!spot) continue;
      const part = build.parts[id];
      // Offset of the pivot so the (scaled) part's centre lands exactly on its slot.
      control.explode[id] = [
        spot.slot[0] - spot.scale * (part.center[0] - part.pivot[0]) - part.pivot[0],
        spot.slot[1] - spot.scale * (part.center[1] - part.pivot[1]) - part.pivot[1],
        spot.slot[2] - spot.scale * (part.center[2] - part.pivot[2]) - part.pivot[2],
      ];
      control.park[id] = spot.scale;
    }
  };
  const sync = (s: LabState, last: PartId | null) => {
    state.current = s;
    setOut(s.out);
    setStage(s.stage);
    const cur = useHeart.getState().lab;
    useHeart.getState().patch('lab', { ...s, last: last ?? cur.last, wiggle: cur.wiggle });
    const p = labProgress(s);
    actions.taskProgress(p.done, p.total);
    park(s.out);
    paused.current = s.out.length > 0;
  };

  useEffect(() => {
    park(state.current.out);
    // Re-flow the shelf when the screen turns (portrait ⇄ landscape).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portrait]);

  useOnTaskStart(phase, () => {
    idle.current = 0;
    sync(labStart(cfg.lab.goal, cfg.lab.rebuild), null);
    useHeart.getState().patch('lab', { last: null, wiggle: { id: null, n: 0 } });
  });
  useOnTaskEnd(phase, () => {
    // Completed or skipped: show the heart whole and beating for the reward.
    park([]);
    paused.current = false;
    setOut([]);
    setStage('done');
  });

  const pull = (id: PartId) => {
    const r = pullPart(state.current, id);
    if (r.event === 'ignored') {
      if (state.current.stage === 'pull' && state.current.out.includes(id)) say(lineFor(id));
      return;
    }
    idle.current = 0;
    sync(r.state, id);
    // Pop! Sparkles burst from the spot the part was ripped out of.
    burst.current?.fire(build.parts[id].center, PART_SIDE[id] === 'right' ? '#b8c4ff' : '#ffc2cc', 18, 2.4);
    actions.sfx('pop');
    say(lineFor(id), true);
    if (r.event === 'rebuild-time') {
      timers(() => {
        actions.sfx('unlock');
        actions.say(LAB_LINES.rebuild);
      }, 2600);
    }
  };

  const place = (id: PartId) => {
    const r = placePart(state.current, id, cfg.assistAfter);
    if (r.event === 'ignored') return;
    idle.current = 0;
    if (r.event === 'wrong') {
      const cur = useHeart.getState().lab;
      state.current = r.state;
      useHeart.getState().patch('lab', { misses: r.state.misses, assist: r.state.assist, wiggle: { id, n: cur.wiggle.n + 1 } });
      actions.sfx('wrong');
      say(r.state.assist ? LAB_LINES.assist : LAB_LINES.wrong, true);
      return;
    }
    sync(r.state, id);
    const c = build.parts[id].center;
    burst.current?.fire([c[0], c[1], c[2] + 0.3], '#fff4b0', 22, 2);
    actions.sfx('thud');
    timers(() => actions.sfx('collect'), 90);
    if (r.event === 'done') {
      actions.sfx('celebrate');
      actions.say(LAB_LINES.done);
      timers(() => burst.current?.fire([0, 0.3, 0.6], '#ff9fc0', 60, 4.2), 250);
      timers(() => actions.completeTask(), 1900);
    } else say(pick(LAB_LINES.placed, r.state.placed), true);
  };

  const onPart = (id: PartId) => {
    if (!activeRef.current) return;
    if (state.current.stage === 'pull') pull(id);
    else if (state.current.stage === 'rebuild') place(id);
  };

  useCommands((cmd) => {
    if (!activeRef.current) return;
    if (cmd.type === 'lab-pull') pull(cmd.id);
    if (cmd.type === 'lab-place') place(cmd.id);
  });

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    idle.current += dt;
    const s = state.current;
    // Guidance glows: tiny explorers always see a suggestion; everyone gets one after a quiet spell,
    // and the senior clue target glows after two misses.
    const hint =
      active && s.stage === 'pull' && (band === 'tiny' || idle.current > 9)
        ? suggestedPull(s, band === 'tiny' ? TINY_ORDER : PARTS)
        : active && s.stage === 'rebuild'
          ? s.mode === 'clues'
            ? s.assist || idle.current > 10
              ? s.clue
              : null
            : band === 'tiny' || idle.current > 8
              ? (s.out[0] ?? null)
              : null
          : null;
    const pulse = 0.35 + Math.sin(performance.now() / 200) * 0.25;
    for (const id of PARTS) control.glow[id] = id === hint ? pulse : s.out.includes(id) && active ? 0.12 : 0;
    // What goes wrong without it: blood sloshes back where a valve is missing, and spills out where a
    // big vessel was attached.
    sloshClock.current += dt;
    if (sloshClock.current > 0.55 && !reducedMotion) {
      sloshClock.current = 0;
      // Only the three most recent gaps leak, so a mostly-dismantled heart doesn't turn into a fountain.
      for (let i = Math.max(0, s.out.length - 3); i < s.out.length; i++) {
        const id = s.out[i] as PartId;
        const leak = LEAK_AT[id];
        if (leak) {
          slosh.current?.fire(leak.at, leak.color, 4, 0.8);
          continue;
        }
        if (!isValve(id)) continue;
        const p = build.parts[id];
        SLOSH_AT[0] = p.pivot[0];
        SLOSH_AT[1] = p.pivot[1];
        SLOSH_AT[2] = p.pivot[2] + 0.12;
        slosh.current?.fire(SLOSH_AT, PART_SIDE[id] === 'right' ? '#5b72ff' : '#ff3450', 5, 0.9);
      }
    }
  });

  const shot: Shot = useMemo(() => {
    if (out.length === 0) return SHOT_CLOSE;
    const f = labFit(labLayout(out, shapes, portrait), portrait, shapes);
    return { target: [0.05, f.y, 0.2], dir: [0.06, 0.12, 1], fit: f.fit };
  }, [out, shapes, portrait]);
  const labelsOn = phase === 'explore' || active;
  // With many parts parked (seniors), only the newest two keep their tag — plus the clue part when helping;
  // the tray names every part anyway.
  const clueHelp = useHeart((st) => (st.lab.assist ? st.lab.clue : null));
  const tagged = useMemo(() => new Set<PartId>(out.length <= 4 ? out : [...out.slice(-2), ...(clueHelp ? [clueHelp] : [])]), [out, clueHelp]);
  const partChildren = useMemo(() => {
    const kids: Partial<Record<PartId, ReactNode>> = {};
    for (const id of PARTS) {
      const p = build.parts[id];
      const info = PART_INFO[id];
      // Name tag just above the part (part space, so it rides along and scales with it).
      kids[id] = (
        <Tag
          id={`lab-${id}`}
          position={[p.center[0] - p.pivot[0], p.center[1] - p.pivot[1] + p.size[1] / 2 + 0.06, p.center[2] - p.pivot[2]]}
          text={tier(info.name, band)}
          emoji={info.emoji}
          accent={PART_SIDE[id] === 'right' ? '#5b72ff' : isValve(id) ? '#ffb020' : '#ff3450'}
          visible={labelsOn && tagged.has(id)}
        />
      );
    }
    return kids;
  }, [build, band, labelsOn, tagged]);

  return (
    <>
      <ShotCamera shot={shot} entry={ENTRY} reducedMotion={reducedMotion} smooth={1.1} onSettled={() => arriving && onArrive()} />
      <BeatDriver bpm={bpm} paused={paused} />
      <Pedestal reducedMotion={reducedMotion} />
      <group ref={spinner}>
        <Heart control={control} detail={quality.detail} interactive={active && stage !== 'done'} onPartTap={onPart} reducedMotion={reducedMotion} partChildren={partChildren} ghosts />
        {/* Bursts live in heart space so they follow the turntable. */}
        <Burst ref={burst} count={Math.round(90 * quality.particleScale) + 30} reducedMotion={reducedMotion} />
        <Burst ref={slosh} count={40} reducedMotion={reducedMotion} soft />
      </group>
      {phase === 'explore' && (
        <>
          <Tag id="lab-hint-a" position={[0.1, 2.25, 0.2]} text={band === 'tiny' ? 'Pull me apart!' : 'Every part comes out!'} emoji="🧩" accent="#ffb020" visible />
        </>
      )}
    </>
  );
}

/** The glowing lab turntable under the heart. */
function Pedestal({ reducedMotion }: { reducedMotion: boolean }) {
  const ring = useRef<Mesh>(null);
  const ring2 = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (reducedMotion) return;
    if (ring.current) ring.current.rotation.z += dt * 0.4;
    if (ring2.current) {
      ring2.current.rotation.z -= dt * 0.25;
      (ring2.current.material as MeshBasicMaterial).opacity = 0.45 + Math.sin(performance.now() / 500) * 0.15;
    }
  });
  return (
    <group position={[0.05, -1.72, 0]}>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[1.65, 1.8, 0.24, 64]} />
        <meshPhysicalMaterial color="#fff4f7" roughness={0.3} clearcoat={1} clearcoatRoughness={0.15} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.62, 64]} />
        <meshPhysicalMaterial color="#ffd9e4" roughness={0.2} clearcoat={1} emissive="#ff8fb1" emissiveIntensity={0.15} />
      </mesh>
      <mesh ref={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.28, 64, 1, 0, Math.PI * 1.6]} />
        <meshBasicMaterial color="#ffc93c" transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh ref={ring2} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 0.86, 64, 1, 0, Math.PI * 1.2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <sprite position={[0, 0.2, 0]} scale={[4.6, 1.4, 1]}>
        <spriteMaterial map={glowTexture()} color="#ff9fc0" transparent opacity={0.45} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}
