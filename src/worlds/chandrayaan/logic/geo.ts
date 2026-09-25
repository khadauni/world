/**
 * Longitude/latitude helpers matching three.js SphereGeometry's UV layout
 * (u = 0 at longitude −180°, north up), so equirectangular canvas maps line up with 3D markers.
 */
export function lonLatToVec3(lonDeg: number, latDeg: number, r = 1): [number, number, number] {
  const phi = ((lonDeg + 180) / 360) * Math.PI * 2;
  const lat = (latDeg * Math.PI) / 180;
  const c = Math.cos(lat);
  return [-Math.cos(phi) * c * r, Math.sin(lat) * r, Math.sin(phi) * c * r];
}

/** Y-rotation that turns a sphere so the given longitude faces +Z (towards a default camera). */
export function faceRotationY(lonDeg: number): number {
  const [x, , z] = lonLatToVec3(lonDeg, 0);
  return Math.atan2(-x, z);
}

/** Rotate a vector about +Y (same convention as Object3D.rotation.y). */
export function rotateY(v: readonly [number, number, number], angle: number): [number, number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

/** Equirectangular canvas pixel for a lon/lat. */
export function lonLatToPixel(lonDeg: number, latDeg: number, width: number, height: number): [number, number] {
  return [((lonDeg + 180) / 360) * width, ((90 - latDeg) / 180) * height];
}

/** Where India's launch site sits (Sriharikota, about 13.7°N 80.2°E). */
export const SRIHARIKOTA = { lon: 80.2, lat: 13.7 } as const;
