import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BackSide,
  type BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  LatheGeometry,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Vector2,
  type Group,
  type InstancedMesh,
  type ShaderMaterial,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Glow } from '@/engine/kit';
import { mulberry32 } from '@/core/random';
import { valueNoise } from '../logic/terrain';
import { SEA_FRAG, SEA_VERT, SKY_FRAG, SKY_VERT } from '../shaders/effects';
import { mats } from './materials';

/** East coast of Sriharikota island: x of the waterline for a given z (matches the sea shader). */
export const SHORE_X = 26;
export function shoreLine(z: number): number {
  return SHORE_X + 4 * Math.sin(z * 0.045) + 2 * Math.sin(z * 0.13 + 1);
}

export const SUN_DIR: [number, number, number] = [-0.55, 0.75, 0.38];

/** Afternoon sky dome with puffy cartoon clouds (the "weather" check clears some of them). */
export function SkyDome({ clouds, detail }: { clouds: { current: number }; detail: number }) {
  const mat = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTop: { value: new Color('#2f6fd6') },
      uMid: { value: new Color('#79b8f2') },
      uHorizon: { value: new Color('#ffe2b8') },
      uSunDir: { value: SUN_DIR },
      uSunColor: { value: new Color('#fff1c9') },
      uTime: { value: 0 },
      uClouds: { value: 1 },
    }),
    [],
  );
  useFrame((_, dt) => {
    if (!mat.current) return;
    const u = mat.current.uniforms;
    (u.uTime as { value: number }).value += dt;
    const c = u.uClouds as { value: number };
    c.value += (clouds.current - c.value) * Math.min(1, dt * 1.5);
  });
  // Drawn after the other opaque objects: the depth test then skips every pixel the island, sea and pad cover.
  return (
    <mesh renderOrder={50}>
      <sphereGeometry args={[900, 40, 24]} />
      <shaderMaterial ref={mat} vertexShader={SKY_VERT} fragmentShader={SKY_FRAG} uniforms={uniforms} defines={{ OCTAVES: detail >= 0.95 ? 5 : 4 }} side={BackSide} depthWrite={false} />
    </mesh>
  );
}

export function Sea() {
  const mat = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new Color('#0d5fae') },
      uShallow: { value: new Color('#35d0d6') },
      uSky: { value: new Color('#bfe0ff') },
      uSunDir: { value: SUN_DIR },
      uShoreX: { value: SHORE_X },
    }),
    [],
  );
  useFrame((_, dt) => {
    if (mat.current) (mat.current.uniforms.uTime as { value: number }).value += dt;
  });
  return (
    <mesh position={[260, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[700, 800, 1, 1]} />
      <shaderMaterial ref={mat} vertexShader={SEA_VERT} fragmentShader={SEA_FRAG} uniforms={uniforms} />
    </mesh>
  );
}

/** Island ground: grass inland, sandy beach sloping under the sea along a wavy shoreline. */
export function Island({ detail }: { detail: number }) {
  const geo = useMemo(() => {
    const seg = Math.round(110 * detail);
    const g = new PlaneGeometry(220, 220, seg, seg);
    g.rotateX(-Math.PI / 2);
    g.translate(-70, 0, 0);
    const pos = g.attributes.position as BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const grass = new Color('#6fbf5a');
    const grass2 = new Color('#4fa04a');
    const sand = new Color('#f2dca6');
    const wet = new Color('#d9bf86');
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const xs = shoreLine(z);
      const n = valueNoise(x * 0.08, z * 0.08, 4) * 0.5 + valueNoise(x * 0.3, z * 0.3, 5) * 0.2;
      let h = 0.05 + n * 0.25 * Math.min(1, Math.max(0, (xs - 6 - x) / 10));
      const t = (x - (xs - 2.2)) / 6;
      if (t > 0) h = 0.05 + (-0.55 - 0.05) * Math.min(1.4, t);
      // keep the pad area level
      if (Math.abs(x) < 10 && Math.abs(z) < 10) h = 0.02;
      pos.setY(i, h);
      const beach = Math.min(1, Math.max(0, (x - (xs - 9)) / 5));
      c.copy(grass).lerp(grass2, Math.min(1, Math.max(0, n + 0.5)));
      c.lerp(sand, beach);
      if (t > 0.25) c.lerp(wet, Math.min(1, (t - 0.25) * 2));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [detail]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------------------------- palms

function paint(g: BufferGeometry, color: Color, tip?: Color): BufferGeometry {
  const pos = g.attributes.position as BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  let maxY = 0;
  for (let i = 0; i < pos.count; i++) maxY = Math.max(maxY, Math.abs(pos.getX(i)) + Math.abs(pos.getZ(i)));
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    c.copy(color);
    if (tip) c.lerp(tip, Math.min(1, (Math.abs(pos.getX(i)) + Math.abs(pos.getZ(i))) / Math.max(0.001, maxY)));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  return g;
}

/** One palm (trunk + drooping V-folded fronds) merged into a single vertex-coloured geometry. */
function palmGeometry(): BufferGeometry {
  const trunkPts = [0, 0.3, 1.2, 2.4, 3.6, 4.6].map((y, i) => new Vector2(0.2 - i * 0.022, y));
  const trunk = new LatheGeometry(trunkPts, 7);
  const tp = trunk.attributes.position as BufferAttribute;
  for (let i = 0; i < tp.count; i++) {
    const y = tp.getY(i);
    tp.setX(i, tp.getX(i) + 0.035 * y * y);
  }
  paint(trunk, new Color('#8b6440'), new Color('#6b4a2e'));
  const crownX = 0.035 * 4.6 * 4.6;
  const leaves: BufferGeometry[] = [];
  const n = 8;
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2 + (k % 2) * 0.2;
    const len = 2.1 + (k % 3) * 0.25;
    const steps = 8;
    const verts: number[] = [];
    const idx: number[] = [];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const r = t * len;
      const y = 4.6 + 0.9 * t - 2.0 * t * t;
      const w = 0.42 * Math.pow(Math.sin(Math.PI * Math.min(0.98, t + 0.05)), 0.8);
      const cx = Math.cos(ang);
      const cz = Math.sin(ang);
      // left, mid (raised midrib), right
      verts.push(crownX + cx * r - cz * w, y - 0.12 * w, cz * r + cx * w);
      verts.push(crownX + cx * r, y + 0.1 * w, cz * r);
      verts.push(crownX + cx * r + cz * w, y - 0.12 * w, cz * r - cx * w);
      if (s > 0) {
        const a = (s - 1) * 3;
        const b = s * 3;
        idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
      }
    }
    const g = new BufferGeometry();
    g.setIndex(idx);
    g.setAttribute('position', new Float32BufferAttribute(verts, 3));
    g.computeVertexNormals();
    leaves.push(paint(g, new Color('#3db35a'), new Color('#1f7a3d')));
  }
  trunk.deleteAttribute('normal');
  trunk.computeVertexNormals();
  const merged = mergeGeometries([trunk, ...leaves]);
  return merged ?? trunk;
}

/** Instanced palms that sway in the sea breeze (vertex shader bend, one draw call). */
export function Palms({ spots }: { spots: readonly [number, number, number, number][] }) {
  const mesh = useRef<InstancedMesh>(null);
  const geo = useMemo(() => palmGeometry(), []);
  const shader = useRef<WebGLProgramParametersWithUniforms | null>(null);
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: DoubleSide });
    m.onBeforeCompile = (s) => {
      s.uniforms.uTime = { value: 0 };
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
          float bend = transformed.y * transformed.y * 0.004;
          transformed.x += sin(uTime * 1.3 + ph) * bend * 1.6;
          transformed.z += cos(uTime * 1.1 + ph) * bend;`,
        );
      shader.current = s;
    };
    return m;
  }, []);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new Object3D();
    spots.forEach(([x, z, s, r], i) => {
      o.position.set(x, 0, z);
      o.rotation.set(0, r, 0);
      o.scale.setScalar(s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [spots]);
  useFrame((_, dt) => {
    const u = shader.current?.uniforms.uTime;
    if (u) u.value += dt;
  });
  return <instancedMesh ref={mesh} args={[geo, mat, spots.length]} castShadow frustumCulled={false} />;
}

/** Palm positions: a line along the beach + a few framing the foreground. */
export function palmSpots(seed = 3): [number, number, number, number][] {
  const rand = mulberry32(seed);
  const out: [number, number, number, number][] = [];
  for (let z = -70; z <= 70; z += 5 + rand() * 4) {
    if (Math.abs(z) < 12) continue;
    out.push([shoreLine(z) - 7 - rand() * 5, z, 0.8 + rand() * 0.5, rand() * 6.28]);
  }
  out.push([-12, -15, 1.25, 0.4], [-15, -18, 1.05, 2.1], [-8, 17, 1.2, 4.2], [-12, 21, 1.0, 1.1], [-3, -19, 1, 3], [9, 17, 1.1, 2]);
  return out;
}

// ---------------------------------------------------------------------------------------------- pad

/** Lattice umbilical tower built from instanced beams (one draw call). */
function Tower({ height = 10.5 }: { height?: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const beams = useMemo(() => {
    const list: { p: [number, number, number]; s: [number, number, number]; r?: number }[] = [];
    const w = 1.3;
    for (const [x, z] of [
      [-w / 2, -w / 2],
      [w / 2, -w / 2],
      [-w / 2, w / 2],
      [w / 2, w / 2],
    ] as const)
      list.push({ p: [x, height / 2, z], s: [0.12, height, 0.12] });
    for (let y = 0.8; y < height; y += 0.9) {
      list.push({ p: [0, y, -w / 2], s: [w, 0.08, 0.08] }, { p: [0, y, w / 2], s: [w, 0.08, 0.08] }, { p: [-w / 2, y, 0], s: [0.08, 0.08, w] }, { p: [w / 2, y, 0], s: [0.08, 0.08, w] });
      list.push({ p: [-w / 2, y + 0.45, 0], s: [0.05, 1.25, 0.05], r: 0.8 }, { p: [w / 2, y + 0.45, 0], s: [0.05, 1.25, 0.05], r: -0.8 });
    }
    return list;
  }, [height]);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new Object3D();
    beams.forEach((b, i) => {
      o.position.set(...b.p);
      o.rotation.set(b.r ?? 0, 0, 0);
      o.scale.set(...b.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [beams]);
  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, mats.towerGrey(), beams.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      {[2.5, 5.2, 7.9].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={mats.towerRed()}>
          <boxGeometry args={[1.45, 0.35, 1.45]} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.25, 0]} material={mats.towerRed()}>
        <boxGeometry args={[1.5, 0.5, 1.5]} />
      </mesh>
    </group>
  );
}

function Mast({ position, height = 15 }: { position: [number, number, number]; height?: number }) {
  return (
    <group position={position}>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0, (i + 0.5) * (height / 6), 0]} material={i % 2 ? mats.white() : mats.towerRed()}>
          <cylinderGeometry args={[0.16 - i * 0.015, 0.18 - i * 0.015, height / 6, 10]} />
        </mesh>
      ))}
      <mesh position={[0, height + 1, 0]} material={mats.metal()}>
        <cylinderGeometry args={[0.03, 0.03, 2, 6]} />
      </mesh>
    </group>
  );
}

/**
 * Second Launch Pad (stylised): concrete deck, mobile launch pedestal, flame trench, umbilical tower
 * with swing arms, lightning masts, and a few service buildings in the distance.
 */
export function LaunchPad({ armsOpen, towerLight }: { armsOpen: { current: number }; towerLight: boolean }) {
  const arms = useRef<Group>(null);
  useFrame((_, dt) => {
    const list = arms.current?.children;
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const a = list[i] as Group;
      const goal = armsOpen.current * (i % 2 ? 1.4 : 1.2);
      a.rotation.y += (goal - a.rotation.y) * Math.min(1, dt * 2.5);
    }
  });
  return (
    <group>
      <mesh position={[0, 0.12, 0]} material={mats.concrete()} receiveShadow>
        <boxGeometry args={[18, 0.24, 18]} />
      </mesh>
      {/* painted pad markings */}
      <mesh position={[0, 0.245, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.6, 4.9, 48]} />
        <meshStandardMaterial color="#f2c53d" roughness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.246, s * 7.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[14, 0.35]} />
          <meshStandardMaterial color="#f2c53d" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.72, 0]} material={mats.towerGrey()} castShadow receiveShadow>
        <boxGeometry args={[3.4, 1, 3.4]} />
      </mesh>
      <mesh position={[0, 1.24, 0]} material={mats.dark()}>
        <boxGeometry args={[2.2, 0.06, 2.2]} />
      </mesh>
      {/* flame trench opening in front of the pedestal */}
      <mesh position={[4.2, 0.245, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.5, 2.6]} />
        <meshStandardMaterial color="#2a2522" roughness={1} />
      </mesh>
      <group position={[0, 0, -2.25]}>
        <Tower />
        <group ref={arms}>
          {[5.6, 7.4].map((y) => (
            <group key={y} position={[0.25, y, 0.7]}>
              <mesh position={[0, 0, 0.55]} material={mats.towerRed()}>
                <boxGeometry args={[0.3, 0.22, 1.1]} />
              </mesh>
            </group>
          ))}
        </group>
        {towerLight && <Glow color="#ff4040" scale={1.2} position={[0, 11.2, 0]} />}
      </group>
      <Mast position={[4, 0, -8]} />
      <Mast position={[7, 0, 6]} height={14} />
      <Mast position={[10, 0, -3]} height={13} />
      {/* distant buildings for scale */}
      {(
        [
          [-40, -30, 8, 14, 10],
          [-52, -20, 5, 6, 8],
          [-35, 28, 6, 5, 6],
        ] as const
      ).map(([x, z, w, h, d]) => (
        <group key={`${x}:${z}`} position={[x, h / 2, z]}>
          <mesh material={mats.offWhite()}>
            <boxGeometry args={[w, h, d]} />
          </mesh>
          <mesh position={[0, h / 2 + 0.2, 0]} material={mats.towerRed()}>
            <boxGeometry args={[w + 0.3, 0.4, d + 0.3]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A weather balloon that floats up when the weather check passes. */
export function Balloon({ launched }: { launched: boolean }) {
  const g = useRef<Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!g.current) return;
    g.current.visible = launched;
    if (!launched) {
      t.current = 0;
      return;
    }
    t.current += dt;
    g.current.position.set(7 + t.current * 0.5 + Math.sin(t.current) * 0.3, 1 + t.current * 1.4, 9 + t.current * 0.2);
  });
  return (
    <group ref={g} visible={false}>
      <mesh>
        <sphereGeometry args={[0.55, 20, 16]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.2} clearcoat={1} transmission={0} />
      </mesh>
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1.4, 4]} />
        <meshBasicMaterial color="#555" />
      </mesh>
      <mesh position={[0, -1.95, 0]} material={mats.saffron()}>
        <boxGeometry args={[0.25, 0.2, 0.25]} />
      </mesh>
    </group>
  );
}
