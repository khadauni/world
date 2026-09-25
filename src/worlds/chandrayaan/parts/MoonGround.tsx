import { useMemo } from 'react';
import { Color, type BufferAttribute, Float32BufferAttribute, MeshStandardMaterial, PlaneGeometry } from 'three';
import { SIMPLEX_3D } from '@/engine/kit';
import type { Terrain } from '../logic/terrain';
import { CRATERS, HASH33 } from '../shaders/common';
import { softShadowTexture } from './textures';

/**
 * Regolith material: MeshStandardMaterial (so it lights, shadows and fogs like everything else) with
 * extra shader detail — two layers of small craters bump-mapped from world position, plus dusty grain.
 */
function regolithMaterial(tint: string, bump: number): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: new Color(tint), roughness: 0.97, metalness: 0, vertexColors: true });
  m.onBeforeCompile = (s) => {
    s.uniforms.uBumpK = { value: bump };
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWorldP;\nuniform float uBumpK;\n${SIMPLEX_3D}\n${HASH33}\n${CRATERS}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // World units per pixel: fine layers fade out before they get smaller than a pixel (no sparkly moiré).
        float pxW = length(fwidth(vWorldP));
        float fineW = 1.0 - smoothstep(0.05, 0.25, pxW * 6.0);
        float grain = snoise(vWorldP * 1.3) * 0.5 + snoise(vWorldP * 6.0) * 0.2 * fineW;
        diffuseColor.rgb *= 0.86 + 0.18 * grain;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          vec3 wp = vWorldP;
          float midW = 1.0 - smoothstep(0.06, 0.22, pxW * 2.2);
          float h = craters(wp * 0.7, 0.45) * 0.8 + craters(wp * 2.2 + 3.0, 0.55) * 0.3 * midW + snoise(wp * 5.0) * 0.008 * fineW;
          vec3 dpx = dFdx(-vViewPosition);
          vec3 dpy = dFdy(-vViewPosition);
          float dhx = dFdx(h);
          float dhy = dFdy(h);
          vec3 r1 = cross(dpy, normal);
          vec3 r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
          normal = normalize(abs(det) * normal - uBumpK * grad);
        }`,
      );
  };
  return m;
}

/** Displaced terrain patch with albedo variation (brighter crater rims, darker bowls). */
export function MoonTerrain({ terrain, detail, shadows, tint = '#b9b6b1', bump = 0.9 }: { terrain: Terrain; detail: number; shadows: boolean; tint?: string; bump?: number }) {
  const geo = useMemo(() => {
    const size = terrain.spec.size;
    const seg = Math.max(60, Math.round(170 * detail));
    const g = new PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = terrain.height(x, z);
      pos.setY(i, h);
      const hx = terrain.height(x + 0.5, z) - terrain.height(x - 0.5, z);
      const shade = Math.min(1.12, Math.max(0.72, 0.95 + h * 0.08 + Math.abs(hx) * 0.05));
      col[i * 3] = shade;
      col[i * 3 + 1] = shade;
      col[i * 3 + 2] = shade * 1.02;
    }
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, [terrain, detail]);
  const mat = useMemo(() => regolithMaterial(tint, bump), [tint, bump]);
  return <mesh geometry={geo} material={mat} receiveShadow={shadows} />;
}

/** Direction shadows fall on the surface (away from the low Sun), in the XZ plane. */
const SHADOW_DIR = (() => {
  const x = -1;
  const z = -0.25;
  const l = Math.hypot(x, z);
  return { x: x / l, z: z / l, angle: Math.atan2(-z / l, x / l) };
})();

/**
 * Long, soft shadow stretched away from the low polar Sun — gives every tier the dramatic south-pole look
 * (real shadow maps are only enabled on the high tier).
 */
export function LongShadow({ position, width = 1.6, length = 4, opacity = 0.5 }: { position: [number, number, number]; width?: number; length?: number; opacity?: number }) {
  const cx = position[0] + SHADOW_DIR.x * length * 0.32;
  const cz = position[2] + SHADOW_DIR.z * length * 0.32;
  return (
    <mesh position={[cx, position[1] + 0.035, cz]} rotation={[-Math.PI / 2, 0, SHADOW_DIR.angle]} renderOrder={1}>
      <planeGeometry args={[length, width]} />
      <meshBasicMaterial map={softShadowTexture()} color="#000000" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}
