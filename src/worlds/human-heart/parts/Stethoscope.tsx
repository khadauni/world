import { useMemo } from 'react';
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import { useDisposable } from './dispose';

type P = readonly [number, number, number];

function tube(points: readonly P[], radius: number, segments: number): TubeGeometry {
  return new TubeGeometry(new CatmullRomCurve3(points.map((p) => new Vector3(p[0], p[1], p[2]))), segments, radius, 10, false);
}

/** Where the rubber tube splits into the two ear tubes (local space) — the tag hangs here. */
export const STETHOSCOPE_Y: P = [-1.22, 1.52, 0.12];

const MAIN: readonly P[] = [[0, 0.08, 0.1], [-0.22, 0.5, 0.3], [-0.72, 0.82, 0.34], [-1.08, 1.18, 0.2], STETHOSCOPE_Y];
const EAR_L: readonly P[] = [STETHOSCOPE_Y, [-1.42, 1.78, 0.2], [-1.62, 2.1, 0.3], [-1.6, 2.42, 0.34]];
const EAR_R: readonly P[] = [STETHOSCOPE_Y, [-1.04, 1.8, 0.02], [-0.9, 2.12, -0.06], [-0.98, 2.44, -0.04]];

/**
 * A complete toy stethoscope resting on the heart: silver chest piece, a soft tube up to a Y, two
 * silver ear tubes with round rubber tips. (Doctors listen to the lub-dub with one of these.)
 */
export function Stethoscope({ detail = 1 }: { detail?: number }) {
  const geo = useMemo(() => {
    const seg = Math.max(12, Math.round(48 * detail));
    return {
      main: tube(MAIN, 0.055, seg),
      earL: tube(EAR_L, 0.035, Math.round(seg / 2)),
      earR: tube(EAR_R, 0.035, Math.round(seg / 2)),
    };
  }, [detail]);
  useDisposable(geo);
  return (
    <group>
      <mesh geometry={geo.main}>
        <meshPhysicalMaterial color="#2ec4b6" roughness={0.4} clearcoat={0.7} />
      </mesh>
      <mesh geometry={geo.earL}>
        <meshPhysicalMaterial color="#e6ebf5" metalness={0.45} roughness={0.22} clearcoat={1} />
      </mesh>
      <mesh geometry={geo.earR}>
        <meshPhysicalMaterial color="#e6ebf5" metalness={0.45} roughness={0.22} clearcoat={1} />
      </mesh>
      {/* the Y junction and the two soft ear tips */}
      <mesh position={[STETHOSCOPE_Y[0], STETHOSCOPE_Y[1], STETHOSCOPE_Y[2]]}>
        <sphereGeometry args={[0.08, 16, 12]} />
        <meshPhysicalMaterial color="#e6ebf5" metalness={0.45} roughness={0.22} clearcoat={1} />
      </mesh>
      {[EAR_L[3] as P, EAR_R[3] as P].map((p) => (
        <mesh key={p[0]} position={[p[0], p[1], p[2]]} scale={[1, 1.15, 1]}>
          <sphereGeometry args={[0.085, 16, 12]} />
          <meshPhysicalMaterial color="#1f9e93" roughness={0.5} clearcoat={0.4} />
        </mesh>
      ))}
      <group rotation={[Math.PI / 2 - 0.35, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.2, 0.22, 0.09, 32]} />
          <meshPhysicalMaterial color="#eef2ff" metalness={0.35} roughness={0.25} clearcoat={1} emissive="#8fa0ff" emissiveIntensity={0.12} />
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.02, 32]} />
          <meshPhysicalMaterial color="#cfd8ff" roughness={0.1} clearcoat={1} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.08, 16]} />
          <meshPhysicalMaterial color="#dfe4f0" metalness={0.4} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}
