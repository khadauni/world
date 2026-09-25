import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type Points,
} from 'three';
import { avatarById } from '@/core/avatars';
import { mulberry32 } from '@/core/random';
import { Glow, emojiTexture } from '@/engine/kit';
import { flameMaterial, sparkleMaterial } from '../shaders/fx';
import { useSolar } from '../state';
import { useDisposable } from './hooks';

const lathe = (pts: readonly [number, number][], segs: number) => new LatheGeometry(pts.map(([x, y]) => new Vector2(x, y)), segs);

const BODY: [number, number][] = [
  [0.0, -0.36], [0.12, -0.36], [0.18, -0.32], [0.21, -0.22], [0.224, -0.08], [0.226, 0.04], [0.215, 0.14], [0.192, 0.215],
];
const NOSE: [number, number][] = [
  [0.194, 0.205], [0.17, 0.29], [0.132, 0.37], [0.082, 0.43], [0.035, 0.465], [0.0, 0.475],
];
const NOZZLE: [number, number][] = [
  [0.085, -0.34], [0.095, -0.39], [0.125, -0.455], [0.142, -0.48], [0.118, -0.48], [0.085, -0.42], [0.07, -0.36],
];

function finShape(): Shape {
  const s = new Shape();
  s.moveTo(0.19, -0.1);
  s.quadraticCurveTo(0.3, -0.18, 0.35, -0.36);
  s.quadraticCurveTo(0.37, -0.45, 0.31, -0.45);
  s.quadraticCurveTo(0.24, -0.4, 0.17, -0.34);
  s.lineTo(0.19, -0.1);
  return s;
}

/** The explorer's toy rocket — the child's own avatar waves from the round window. */
export function Rocket({ avatar, detail }: { avatar: string; detail: number }) {
  const sys = useSolar();
  const root = useRef<Group>(null);
  const flame = useRef<Mesh>(null);
  const glow = useRef<Group>(null);
  const segs = Math.max(16, Math.round(40 * detail));
  const body = useDisposable(() => lathe(BODY, segs), [segs]);
  const nose = useDisposable(() => lathe(NOSE, segs), [segs]);
  const nozzle = useDisposable(() => lathe(NOZZLE, segs), [segs]);
  const fin = useDisposable(() => {
    const g = new ExtrudeGeometry(finShape(), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 3, curveSegments: 12 });
    g.translate(0, 0, -0.015);
    return g;
  }, []);
  const flameGeo = useDisposable(() => {
    const g = new ConeGeometry(0.1, 0.6, 18, 1, true);
    g.rotateX(Math.PI);
    g.translate(0, -0.3, 0);
    return g;
  }, []);
  const flameMat = useDisposable(() => flameMaterial(sys.time, sys.rocket.throttle), [sys.time, sys.rocket.throttle]);
  const a = avatarById(avatar);
  const face = useDisposable(() => emojiTexture(a.emoji, 128, '#cfeaff'), [a.emoji]);

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    const r = sys.rocket;
    g.position.copy(r.pos);
    g.quaternion.copy(r.quat);
    const s = r.scale;
    const side = 1 / Math.sqrt(Math.max(0.2, r.stretch));
    g.scale.set(s * side, s * r.stretch, s * side);
    const th = r.throttle.value;
    const flick = 0.9 + 0.1 * Math.sin(sys.time.value * 40) + 0.06 * Math.sin(sys.time.value * 23);
    if (flame.current) flame.current.scale.set(0.8 + th * 0.4, (0.35 + th * 1.4) * flick, 0.8 + th * 0.4);
    if (glow.current) glow.current.scale.setScalar(0.5 + th * 0.9);
  });

  return (
    <group ref={root}>
      <mesh geometry={body}>
        <meshPhysicalMaterial color="#f8f4ec" roughness={0.32} clearcoat={1} clearcoatRoughness={0.12} sheen={0.4} sheenColor="#fff2d8" />
      </mesh>
      <mesh geometry={nose}>
        <meshPhysicalMaterial color="#ff4f63" roughness={0.3} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.215, 0.022, 10, segs]} />
        <meshPhysicalMaterial color={a.color} roughness={0.3} clearcoat={1} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI * 2) / 3 + Math.PI / 6, 0]}>
          <mesh geometry={fin}>
            <meshPhysicalMaterial color="#ff4f63" roughness={0.3} clearcoat={1} clearcoatRoughness={0.1} />
          </mesh>
        </group>
      ))}
      <mesh geometry={nozzle}>
        <meshStandardMaterial color="#5b6178" metalness={0.8} roughness={0.35} side={DoubleSide} />
      </mesh>
      {/* Porthole with the explorer's avatar */}
      <group position={[0, 0.03, 0.222]}>
        <mesh>
          <torusGeometry args={[0.098, 0.022, 12, 32]} />
          <meshPhysicalMaterial color="#ffc94d" metalness={0.85} roughness={0.22} clearcoat={1} />
        </mesh>
        <mesh position={[0, 0, 0.004]}>
          <circleGeometry args={[0.09, 32]} />
          <meshBasicMaterial map={face} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.012]} scale={[0.09, 0.09, 0.03]}>
          <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.18} roughness={0.05} clearcoat={1} depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={flame} position={[0, -0.47, 0]} geometry={flameGeo} material={flameMat} renderOrder={4} />
      <group ref={glow} position={[0, -0.52, 0]}>
        <Glow color="#ff9a3c" scale={0.9} opacity={0.8} />
      </group>
    </group>
  );
}

const TRAIL = 90;
const nozzle = new Vector3();
const down = new Vector3();
const WARM = ['#fff4d6', '#ffd36b', '#ff9f43', '#ff6b8b', '#b89cff'].map((c) => new Color(c));

/** Sparkly exhaust trail (one draw call): particles are emitted at the nozzle while the rocket flies. */
export function Trail({ pixelRatio }: { pixelRatio: number }) {
  const sys = useSolar();
  const pts = useRef<Points>(null);
  const head = useRef(0);
  const acc = useRef(0);
  const rand = useMemo(() => mulberry32(3), []);
  const vel = useMemo(() => new Float32Array(TRAIL * 3), []);
  const geo = useDisposable(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(TRAIL * 3), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(TRAIL * 3), 3));
    g.setAttribute('aSize', new BufferAttribute(new Float32Array(TRAIL), 1));
    g.setAttribute('aLife', new BufferAttribute(new Float32Array(TRAIL), 1));
    return g;
  }, []);
  const mat = useDisposable(() => sparkleMaterial(pixelRatio), [pixelRatio]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const pos = geo.attributes.position as BufferAttribute;
    const col = geo.attributes.color as BufferAttribute;
    const size = geo.attributes.aSize as BufferAttribute;
    const life = geo.attributes.aLife as BufferAttribute;
    const r = sys.rocket;
    let emitted = false;
    if (r.flying) {
      acc.current += dt * 60;
      down.set(0, -1, 0).applyQuaternion(r.quat);
      while (acc.current >= 1) {
        acc.current -= 1;
        const i = head.current;
        head.current = (i + 1) % TRAIL;
        nozzle.copy(r.pos).addScaledVector(down, 0.55 * r.scale * r.stretch);
        pos.setXYZ(i, nozzle.x + (rand() - 0.5) * 0.05 * r.scale, nozzle.y + (rand() - 0.5) * 0.05 * r.scale, nozzle.z + (rand() - 0.5) * 0.05 * r.scale);
        vel[i * 3] = down.x * r.scale * 0.6 + (rand() - 0.5) * r.scale * 0.5;
        vel[i * 3 + 1] = down.y * r.scale * 0.6 + (rand() - 0.5) * r.scale * 0.5;
        vel[i * 3 + 2] = down.z * r.scale * 0.6 + (rand() - 0.5) * r.scale * 0.5;
        const c = WARM[Math.floor(rand() * WARM.length)] as Color;
        col.setXYZ(i, c.r, c.g, c.b);
        size.setX(i, r.scale * (0.1 + rand() * 0.14));
        life.setX(i, 1);
        emitted = true;
      }
    }
    let alive = false;
    for (let i = 0; i < TRAIL; i++) {
      const l = life.getX(i);
      if (l <= 0) continue;
      alive = true;
      life.setX(i, l - dt * 1.3);
      pos.setXYZ(i, pos.getX(i) + (vel[i * 3] ?? 0) * dt, pos.getY(i) + (vel[i * 3 + 1] ?? 0) * dt, pos.getZ(i) + (vel[i * 3 + 2] ?? 0) * dt);
    }
    // Only re-upload while particles live (most of the time the rocket is parked and nothing changes).
    if (alive || emitted) {
      pos.needsUpdate = true;
      life.needsUpdate = true;
    }
    if (emitted) {
      col.needsUpdate = true;
      size.needsUpdate = true;
    }
  });

  return <points ref={pts} geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />;
}

