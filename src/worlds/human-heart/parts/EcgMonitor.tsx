import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, DynamicDrawUsage, Shape, SRGBColorSpace, type Mesh } from 'three';
import { glowTexture } from '@/engine/kit';
import { periodFor } from '../logic/beat';
import { ecgValue } from '../logic/ecg';
import { beat } from '../store';
import { useDisposable } from './dispose';

function roundedRect(w: number, h: number, r: number): Shape {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function gridTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#0b3b3f');
    grad.addColorStop(1, '#062226');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 128);
    g.strokeStyle = 'rgba(120,255,220,0.12)';
    g.lineWidth = 1;
    for (let x = 0; x <= 256; x += 16) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 128);
      g.stroke();
    }
    for (let y = 0; y <= 128; y += 16) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(256, y);
      g.stroke();
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

const N = 150;

/**
 * A chunky toy ECG monitor: the glowing trace is computed from the same heartbeat the heart is following,
 * so the tall QRS spike always lines up with the big squeeze. One ribbon mesh updated in place.
 */
export function EcgMonitor({ width = 2.6, height = 1.3, seconds = 3, highlight = 0 }: { width?: number; height?: number; seconds?: number; highlight?: number }) {
  const ribbon = useRef<Mesh>(null);
  const head = useRef<Mesh>(null);
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(N * 2 * 3);
    const idx: number[] = [];
    for (let i = 0; i < N - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const attr = new BufferAttribute(pos, 3);
    attr.setUsage(DynamicDrawUsage);
    g.setAttribute('position', attr);
    g.setIndex(idx);
    return g;
  }, []);
  const ys = useMemo(() => new Float32Array(N), []);
  const panel = useMemo(() => roundedRect(width + 0.36, height + 0.36, 0.22), [width, height]);
  const screen = useMemo(() => roundedRect(width, height, 0.12), [width, height]);
  const grid = useMemo(gridTexture, []);
  const traceW = width * 0.92;
  const amp = height * 0.36;

  useDisposable(geo);
  useDisposable(grid);
  useFrame(() => {
    const cycles = seconds / periodFor(beat.bpm);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      ys[i] = ecgValue(beat.phase - (1 - t) * cycles) * amp - amp * 0.25;
    }
    const pos = geo.getAttribute('position') as BufferAttribute;
    const arr = pos.array as Float32Array;
    const th = 0.028;
    for (let i = 0; i < N; i++) {
      const x = -traceW / 2 + (i / (N - 1)) * traceW;
      const y = ys[i] as number;
      const yPrev = ys[Math.max(0, i - 1)] as number;
      const yNext = ys[Math.min(N - 1, i + 1)] as number;
      const dx = (traceW / (N - 1)) * 2;
      const dy = yNext - yPrev;
      const l = Math.hypot(dx, dy) || 1;
      const nx = (-dy / l) * th;
      const ny = (dx / l) * th;
      arr[i * 6] = x + nx;
      arr[i * 6 + 1] = y + ny;
      arr[i * 6 + 2] = 0;
      arr[i * 6 + 3] = x - nx;
      arr[i * 6 + 4] = y - ny;
      arr[i * 6 + 5] = 0;
    }
    pos.needsUpdate = true;
    if (head.current) head.current.position.set(traceW / 2, ys[N - 1] as number, 0.01);
  });

  return (
    <group>
      <mesh position={[0, 0, -0.08]}>
        <extrudeGeometry args={[panel, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 }]} />
        <meshPhysicalMaterial color="#f4f1ff" roughness={0.35} clearcoat={1} clearcoatRoughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.1]}>
        <shapeGeometry args={[screen]} />
        <meshBasicMaterial map={grid} toneMapped={false} />
      </mesh>
      <group position={[0, 0, 0.12]}>
        <mesh ref={ribbon} geometry={geo} frustumCulled={false}>
          <meshBasicMaterial color={highlight > 0 ? '#fff4b0' : '#7dffcf'} toneMapped={false} />
        </mesh>
        <mesh ref={head}>
          <sphereGeometry args={[0.06, 12, 8]} />
          <meshBasicMaterial color="#e6fff6" toneMapped={false} />
          <sprite scale={0.5} position={[0, 0, 0.02]}>
            <spriteMaterial map={glowTexture()} color="#7dffcf" transparent opacity={0.6} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
          </sprite>
        </mesh>
      </group>
      {/* little status lights */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-width / 2 + 0.1 + i * 0.16, -height / 2 - 0.1, 0.06]} scale={0.045}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color={i === 0 ? '#ff5a7a' : i === 1 ? '#ffc93c' : '#39d98a'} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
