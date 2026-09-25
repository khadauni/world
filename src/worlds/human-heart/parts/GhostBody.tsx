import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, CapsuleGeometry, CatmullRomCurve3, Color, Quaternion, SphereGeometry, TubeGeometry, Vector3, type BufferGeometry, type Group, type ShaderMaterial } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { emojiTexture } from '@/engine/kit';
import { GHOST_FRAG, GHOST_VERT } from '../shaders/effects';
import { useDisposable } from './dispose';

type V = [number, number, number];

/** A capsule "limb" between two points. */
function limb(a: V, b: V, r: number, detail: number): { geometry: BufferGeometry; position: V; quaternion: Quaternion } {
  const va = new Vector3(...a);
  const vb = new Vector3(...b);
  const len = va.distanceTo(vb);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return { geometry: new CapsuleGeometry(r, len, Math.max(4, Math.round(8 * detail)), Math.max(10, Math.round(20 * detail))), position: [mid.x, mid.y, mid.z], quaternion: q };
}

/**
 * A friendly, glowing x-ray kid (think "holographic body scanner"): rim-lit translucent shapes with a
 * gentle rising shimmer, a smiling face, breathing, and one arm raised as a fist beside the heart.
 * Units: roughly 1 = 30 cm; the body faces the camera (+z), its LEFT side is the viewer's right.
 */
export function GhostBody({ detail, breathe = true, color = '#ffb3d9', rim = '#8fe9ff' }: { detail: number; breathe?: boolean; color?: string; rim?: string }) {
  const torso = useRef<Group>(null);
  const t = useRef(0);
  const mat = useMemo(() => {
    const m = {
      uColor: { value: new Color(color) },
      uRimColor: { value: new Color(rim) },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    };
    return m;
  }, [color, rim]);
  const shapes = useMemo(() => {
    const d = detail;
    const body: { geometry: BufferGeometry; position: V; quaternion?: Quaternion; scale?: V }[] = [];
    body.push({ geometry: new SphereGeometry(0.6, Math.round(40 * d), Math.round(28 * d)), position: [0, 2.42, 0], scale: [1, 1.04, 0.95] });
    // Torso: a soft rounded shape (capsule squashed wide, narrowing towards the waist).
    body.push({ geometry: new CapsuleGeometry(0.64, 1.3, Math.round(10 * d), Math.round(28 * d)), position: [0, 0.98, 0], scale: [1.16, 1, 0.66] });
    // Viewer's right arm (the body's LEFT arm) hangs relaxed and waves a little.
    body.push(limb([0.84, 1.66, 0], [1.02, 0.92, 0.05], 0.19, d));
    body.push(limb([1.02, 0.92, 0.05], [1.06, 0.26, 0.12], 0.17, d));
    body.push({ geometry: new SphereGeometry(0.21, Math.round(20 * d), Math.round(14 * d)), position: [1.07, 0.06, 0.14] });
    // Viewer's left arm (the body's RIGHT arm) raised: a fist held up beside the heart for size.
    body.push(limb([-0.84, 1.66, 0], [-1.12, 0.98, 0.18], 0.19, d));
    body.push(limb([-1.12, 0.98, 0.18], [-0.82, 1.22, 0.5], 0.17, d));
    // Legs (mostly below frame).
    body.push(limb([-0.32, -0.1, 0], [-0.36, -1.6, 0.02], 0.24, d));
    body.push(limb([0.32, -0.1, 0], [0.36, -1.6, 0.02], 0.24, d));
    return body;
  }, [detail]);
  const fist = useMemo(() => {
    const d = detail;
    // One rounded fist (plus a thumb) — the same size as the heart beside it.
    return [
      { geometry: new SphereGeometry(0.27, Math.round(28 * d), Math.round(20 * d)), position: [-0.7, 1.36, 0.62] as V, scale: [1.05, 0.92, 0.88] as V },
      { ...limb([-0.9, 1.3, 0.72], [-0.66, 1.3, 0.86], 0.075, d) },
    ];
  }, [detail]);
  // Faint ribs: the bony cage that protects the heart (one merged geometry = one draw call).
  const ribs = useMemo(() => {
    const parts: BufferGeometry[] = [];
    for (let level = 0; level < 4; level++) {
      const y = 1.62 - level * 0.2;
      const w = 0.62 + level * 0.03;
      for (const side of [-1, 1]) {
        const pts = Array.from({ length: 9 }, (_, i) => {
          const a = (i / 8) * (Math.PI / 2 - 0.2);
          return new Vector3(side * Math.cos(a) * w, y - Math.sin(a) * 0.12, Math.sin(a) * 0.44);
        });
        parts.push(new TubeGeometry(new CatmullRomCurve3(pts), 16, 0.022, 5, false));
      }
    }
    return mergeGeometries(parts) ?? parts[0];
  }, []);
  const fistTex = useMemo(() => emojiTexture('✊', 128), []);
  const smile = useMemo(() => {
    const pts = Array.from({ length: 9 }, (_, i) => {
      const x = i / 8 - 0.5;
      return new Vector3(x * 0.34, -0.09 * (1 - 4 * x * x), 0);
    });
    return new TubeGeometry(new CatmullRomCurve3(pts), 20, 0.022, 8, false);
  }, []);

  useDisposable(shapes);
  useDisposable(fist);
  useDisposable(ribs);
  useDisposable(smile);
  useDisposable(fistTex);
  useFrame((_, dt) => {
    t.current += dt;
    mat.uTime.value = t.current;
    if (torso.current && breathe) {
      const b = Math.sin(t.current * 1.6) * 0.012;
      torso.current.scale.set(1 + b, 1 + b * 0.6, 1 + b);
    }
  });

  const ghost = (key: string, s: { geometry: BufferGeometry; position: V; quaternion?: Quaternion; scale?: V }) => (
    <mesh key={key} geometry={s.geometry} position={s.position} quaternion={s.quaternion} scale={s.scale} renderOrder={3}>
      <GhostMaterial uniforms={mat} />
    </mesh>
  );

  return (
    <group ref={torso}>
      {shapes.map((s, i) => ghost(`b${i}`, s))}
      {fist.map((s, i) => ghost(`f${i}`, s))}
      {ribs && ghost('ribs', { geometry: ribs, position: [0, 0, 0] })}
      <sprite position={[-0.7, 1.36, 0.8]} scale={0.42} renderOrder={5}>
        <spriteMaterial map={fistTex} transparent opacity={0.85} depthWrite={false} />
      </sprite>
      {/* friendly face */}
      <group position={[0, 2.46, 0.56]}>
        {[-0.2, 0.2].map((x) => (
          <group key={x} position={[x, 0.04, 0]}>
            <mesh scale={[0.085, 0.11, 0.05]} renderOrder={4}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshBasicMaterial color="#2a0f3e" />
            </mesh>
            <mesh position={[0.025, 0.035, 0.05]} scale={0.026} renderOrder={5}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
          </group>
        ))}
        <mesh geometry={smile} position={[0, -0.16, 0.02]} renderOrder={4}>
          <meshBasicMaterial color="#ffe0f0" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function GhostMaterial({ uniforms }: { uniforms: Record<string, { value: unknown }> }) {
  const ref = useRef<ShaderMaterial>(null);
  return <shaderMaterial ref={ref} vertexShader={GHOST_VERT} fragmentShader={GHOST_FRAG} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} />;
}
