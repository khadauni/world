import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LatheGeometry, Quaternion, Vector2, Vector3, type Group, type MeshStandardMaterial } from 'three';
import { mulberry32 } from '@/core/random';
import { Glow, Tappable } from '@/engine/kit';
import { useDisposable } from '../parts/hooks';
import { puffGeometry } from '../parts/shapes';
import { useSolar } from '../state';
import { Halo, StageGroup, type TaskProps } from './common';
import { tuningFor } from './rules';
import { useTaskKit } from './useTaskKit';

/** Where the cloud window opens: on the upper-right shoulder, so the volcano is seen at an angle (and clear of the HUD). */
const REVEAL = new Vector3(0.5, 0.4, 0.77).normalize();
const VOLCANO_POS = REVEAL.clone().multiplyScalar(0.985);
const Z = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);
const at = new Vector3();

const VOLCANO_LINE = {
  tiny: 'A volcano! Look, it’s hot lava! 🌋',
  junior: 'A volcano! Venus has more volcanoes than any other planet.',
  senior: 'Revealed: a giant shield volcano, like Maat Mons — Venus has more volcanoes than any other planet.',
} as const;

/** Venus: tap the fluffy cloud puffs to blow them away — and uncover a volcano beneath. */
export function VenusClouds({ band, actions, reducedMotion }: TaskProps) {
  const sys = useSolar();
  const t = tuningFor('clear-clouds', band);
  const kit = useTaskKit('clear-clouds', band, actions, t.count, 3200);
  const geo = useDisposable(puffGeometry, []);
  const volcanoGeo = useDisposable(
    () =>
      new LatheGeometry(
        [
          [0.0, 0.25], [0.035, 0.25], [0.05, 0.285], [0.075, 0.275], [0.13, 0.2], [0.21, 0.11], [0.3, 0.045], [0.4, 0.008], [0.46, 0.0],
        ].map(([x, y]) => new Vector2(x, y)),
        48,
      ),
    [],
  );
  const puffs = useMemo(() => {
    const rand = mulberry32(31);
    const tangentX = new Vector3().crossVectors(UP, REVEAL).normalize();
    const tangentY = new Vector3().crossVectors(REVEAL, tangentX).normalize();
    return Array.from({ length: t.count }, (_, i) => {
      const ring = i === 0 ? 0 : i <= 4 ? 0.4 : 0.66;
      const a = i === 0 ? 0 : (i / (i <= 4 ? 4 : 3)) * Math.PI * 2 + (i > 4 ? 0.6 : 0);
      const off = tangentX.clone().multiplyScalar(Math.cos(a) * ring).addScaledVector(tangentY, Math.sin(a) * ring * 0.8);
      const pos = REVEAL.clone().multiplyScalar(1.16 + (i % 2) * 0.05).add(off);
      const away = off.lengthSq() < 1e-4 ? new Vector3(0.6, 0.8, 0.4) : off.clone().normalize().add(new Vector3(0, 0.3, 0.6));
      return { pos, away: away.normalize(), scale: 0.2 + rand() * 0.05, spin: rand() * 6 };
    });
  }, [t.count]);
  const [gone, setGone] = useState<readonly boolean[]>(() => puffs.map(() => false));
  const goneAt = useRef<number[]>(puffs.map(() => -1));
  const refs = useRef<(Group | null)[]>([]);
  const mats = useRef<(MeshStandardMaterial | null)[]>([]);
  const volcano = useRef<Group>(null);
  const clock = useRef(0);
  const lastLava = useRef(0);
  const allGone = gone.every(Boolean);
  const revealAt = useRef(-1);
  const volcanoQuat = useMemo(() => new Quaternion().setFromUnitVectors(UP, REVEAL), []);
  const next = gone.findIndex((g) => !g);

  useEffect(() => {
    sys.venusReveal = 0;
    sys.venusHold = true;
    sys.spinLock.venus = sys.spin.venus;
    return () => {
      sys.venusHold = false;
      delete sys.spinLock.venus;
    };
  }, [sys]);

  useEffect(() => {
    if (allGone && revealAt.current < 0) {
      revealAt.current = clock.current;
      actions.sfx('whoosh');
      const id = setTimeout(() => actions.say(VOLCANO_LINE), 900);
      return () => clearTimeout(id);
    }
  }, [allGone, actions]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    clock.current += dt;
    sys.venusRevealDir.copy(REVEAL).applyQuaternion(sys.stage.quat);
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      if (p === undefined) continue;
      const g = refs.current[i];
      if (!g) continue;
      const t0 = goneAt.current[i] ?? -1;
      if (t0 < 0) {
        const bob = reducedMotion ? 0 : Math.sin(clock.current * 1.6 + p.spin) * 0.015;
        g.position.copy(p.pos).addScaledVector(Z, bob);
        g.scale.setScalar(p.scale * t.size * (1 + (reducedMotion ? 0 : 0.03 * Math.sin(clock.current * 2.2 + i))));
      } else {
        const s = clock.current - t0;
        g.position.copy(p.pos).addScaledVector(p.away, s * 1.6);
        g.scale.setScalar(p.scale * t.size * (1 + s * 1.8));
        const m = mats.current[i];
        if (m) m.opacity = Math.max(0, 1 - s * 2.2);
        g.visible = s < 0.5;
      }
    }
    // Reveal the surface window and raise the volcano.
    const r0 = revealAt.current;
    const reveal = r0 < 0 ? 0 : Math.min(1, (clock.current - r0) / 1.2);
    sys.venusReveal = reveal * (2 - reveal);
    const v = volcano.current;
    if (v) {
      const k = r0 < 0 ? 0 : Math.min(1, Math.max(0, (clock.current - r0 - 0.4) / 0.7));
      const bounce = k < 1 ? Math.sin(k * Math.PI * 0.5) * (1 + 0.25 * Math.sin(k * Math.PI)) : 1;
      v.scale.setScalar(bounce);
      v.visible = k > 0;
      if (k >= 1 && clock.current - lastLava.current > 0.45) {
        lastLava.current = clock.current;
        v.getWorldPosition(at);
        at.addScaledVector(sys.venusRevealDir, sys.stage.unit * 0.48);
        sys.burst(at, '#ff7a1c', 14, sys.stage.unit * 0.6, sys.stage.unit * 0.5);
      }
    }
  });

  return (
    <StageGroup onMiss={() => kit.miss()}>
      <group ref={volcano} position={VOLCANO_POS} quaternion={volcanoQuat} visible={false}>
        <mesh geometry={volcanoGeo} scale={[1.25, 1.6, 1.25]}>
          <meshStandardMaterial color="#7a3f22" roughness={0.85} flatShading />
        </mesh>
        <mesh position={[0, 0.455, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.06, 24]} />
          <meshBasicMaterial color="#ffb03a" toneMapped={false} />
        </mesh>
        <Glow color="#ff6a00" scale={0.55} opacity={0.95} position={[0, 0.48, 0]} />
      </group>
      {puffs.map((p, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
          position={p.pos}
        >
          <Tappable
            hitRadius={0.95}
            disabled={gone[i]}
            hoverScale={1.1}
            onTap={() => {
              if (gone[i]) return;
              goneAt.current[i] = clock.current;
              setGone((prev) => prev.map((v, j) => (j === i ? true : v)));
              refs.current[i]?.getWorldPosition(at);
              kit.hit(at, { color: '#fff1c2', sound: 'pop' });
            }}
          >
            <mesh geometry={geo}>
              <meshStandardMaterial
                ref={(m) => {
                  mats.current[i] = m;
                }}
                color="#f2f4ff"
                emissive="#aab8ff"
                emissiveIntensity={0.16}
                roughness={0.9}
                transparent
              />
            </mesh>
            {kit.helping && i === next && <Halo size={2.6} color="#ffffff" strong />}
          </Tappable>
        </group>
      ))}
    </StageGroup>
  );
}
