import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BackSide,
  Color,
  Mesh,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  SphereGeometry,
  WebGLRenderTarget,
  type Group,
  type InstancedMesh,
  type MeshStandardMaterial,
  type ShaderMaterial,
  type Texture,
} from 'three';
import { mulberry32 } from '@/core/random';
import type { FlowPhase, QualityProfile } from '@/core/types';
import { Starfield } from '@/engine/kit';
import { BELT, BODIES, STOP_IDS, type BodyId } from '../layout';
import { octaves } from '../shaders/common';
import { nebulaBakeMaterial, orbitMaterial } from '../shaders/fx';
import { useSolar } from '../state';
import type { StopStatus as OrbitStatus } from '../status';
import { useDisposable } from './hooks';
import { lumpyRock } from './shapes';

/** Paint the nebula once into an equirectangular texture — afterwards the sky costs one texture lookup. */
function useNebulaTexture(oct: number): Texture {
  const gl = useThree((s) => s.gl);
  const rt = useDisposable(() => new WebGLRenderTarget(1024, 512, { depthBuffer: false }), []);
  useLayoutEffect(() => {
    const mat = nebulaBakeMaterial(oct);
    const geo = new PlaneGeometry(2, 2);
    const scene = new Scene();
    scene.add(new Mesh(geo, mat));
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(rt);
    gl.render(scene, new OrthographicCamera(-1, 1, 1, -1, 0, 1));
    gl.setRenderTarget(prev);
    geo.dispose();
    mat.dispose();
  }, [gl, rt, oct]);
  return rt.texture;
}

/** Deep-space backdrop: a painterly nebula shell plus the kit's twinkling star points. */
export function Backdrop({ quality, reducedMotion }: { quality: QualityProfile; reducedMotion: boolean }) {
  const sphere = useDisposable(() => new SphereGeometry(1400, 48, 24), []);
  const nebula = useNebulaTexture(octaves(quality.detail, 4));
  return (
    <>
      <mesh geometry={sphere} renderOrder={-10} frustumCulled={false}>
        <meshBasicMaterial map={nebula} side={BackSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <Starfield count={Math.round(3200 * quality.particleScale)} radius={700} depth={400} seed={11} twinkle={!reducedMotion} />
    </>
  );
}

const ORBIT_COLORS: Record<OrbitStatus, { color: string; opacity: number }> = {
  done: { color: '#ffd35a', opacity: 0.55 },
  next: { color: '#8fe3ff', opacity: 0.75 },
  open: { color: '#9aaeff', opacity: 0.32 },
  locked: { color: '#7a86c8', opacity: 0.18 },
};

/** Faint orbit lines — gold once a planet is done, bright for the next stop. Dimmed during close-ups. */
export function OrbitRings({ status, phase }: { status: Readonly<Record<BodyId, OrbitStatus>>; phase: FlowPhase }) {
  const sys = useSolar();
  const planets = STOP_IDS.filter((id) => id !== 'sun');
  const mats = useRef<(ShaderMaterial | null)[]>([]);
  const dim = useRef(1);
  useFrame((_, dt) => {
    const overview = phase === 'map' || phase === 'intro' || phase === 'finale';
    const want = overview ? 1 : Math.max(0.06, 0.4 * (1 - sys.focusMix));
    dim.current += (want - dim.current) * Math.min(1, dt * 3);
    for (let i = 0; i < planets.length; i++) {
      const id = planets[i];
      if (id === undefined) continue;
      const m = mats.current[i];
      if (!m?.uniforms.uOpacity) continue;
      const s = ORBIT_COLORS[status[id]];
      const pulse = status[id] === 'next' ? 0.75 + 0.25 * Math.sin(sys.time.value * 3) : 1;
      m.uniforms.uOpacity.value = s.opacity * dim.current * pulse;
    }
  });
  return (
    <>
      {planets.map((id, i) => (
        <OrbitLine
          key={id}
          radius={BODIES[id].orbit}
          color={ORBIT_COLORS[status[id]].color}
          onMaterial={(m) => {
            mats.current[i] = m;
          }}
        />
      ))}
    </>
  );
}

function OrbitLine({ radius, color, onMaterial }: { radius: number; color: string; onMaterial: (m: ShaderMaterial) => void }) {
  const w = 0.07 + radius * 0.0022;
  const geo = useDisposable(() => new RingGeometry(radius - w, radius + w, 256, 1), [radius, w]);
  const mat = useDisposable(() => orbitMaterial(), []);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    if (u.uInner) u.uInner.value = radius - w;
    if (u.uOuter) u.uOuter.value = radius + w;
    if (u.uColor) (u.uColor.value as Color).set(color);
    onMaterial(mat);
  }, [mat, radius, w, color, onMaterial]);
  return <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1} />;
}

/** Instanced asteroid belt between Mars and Jupiter — one draw call, count scaled by device quality. */
export function AsteroidBelt({ quality, reducedMotion }: { quality: QualityProfile; reducedMotion: boolean }) {
  const sys = useSolar();
  const count = Math.round(720 * quality.particleScale);
  const group = useRef<Group>(null);
  const mesh = useRef<InstancedMesh>(null);
  const geo = useDisposable(() => lumpyRock(5, 0.75, 0.45, 0.8), []);
  const colors = useMemo(() => ['#8a7d70', '#a39382', '#6f655c', '#b8a48c', '#7d6a58'].map((c) => new Color(c)), []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const rand = mulberry32(99);
    const o = new Object3D();
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = BELT.inner + (BELT.outer - BELT.inner) * (0.5 + (rand() + rand() + rand() - 1.5) / 3);
      o.position.set(Math.cos(a) * r, (rand() - 0.5) * BELT.thickness, -Math.sin(a) * r);
      o.rotation.set(rand() * 6.28, rand() * 6.28, rand() * 6.28);
      o.scale.setScalar(0.035 + Math.pow(rand(), 3) * 0.13);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, colors[i % colors.length] as Color);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count, colors]);

  const mat = useRef<MeshStandardMaterial>(null);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    if (!reducedMotion) g.rotation.y += dt * 0.012;
    // Fade out for close-ups (the belt would otherwise crowd Mars and Jupiter).
    const o = 1 - sys.focusMix;
    g.visible = o > 0.02;
    if (mat.current) mat.current.opacity = o;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[geo, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial ref={mat} roughness={0.9} metalness={0.05} flatShading transparent />
      </instancedMesh>
    </group>
  );
}
