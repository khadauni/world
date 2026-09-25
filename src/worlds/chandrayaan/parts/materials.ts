import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from 'three';
import { flagTexture, foilBumpTexture, solarTexture } from './textures';

/**
 * Shared, lazily-created materials for the spacecraft and rocket. Reusing one instance per look keeps
 * shader programs and GPU state to a minimum across stops (and they are never re-created on remount).
 */
const made = new Map<string, Material>();

function once<T extends Material>(key: string, make: () => T): T {
  const hit = made.get(key);
  if (hit) return hit as T;
  const m = make();
  made.set(key, m);
  return m;
}

export const mats = {
  gold: () =>
    once('gold', () => {
      const bump = foilBumpTexture();
      return new MeshStandardMaterial({ color: new Color('#f0b93a'), metalness: 1, roughness: 0.32, bumpMap: bump, bumpScale: 3, envMapIntensity: 1.3 });
    }),
  goldDark: () => once('goldDark', () => new MeshStandardMaterial({ color: new Color('#c98a1c'), metalness: 1, roughness: 0.38, bumpMap: foilBumpTexture(), bumpScale: 3 })),
  silver: () => once('silver', () => new MeshStandardMaterial({ color: new Color('#dfe3ea'), metalness: 1, roughness: 0.26, bumpMap: foilBumpTexture(), bumpScale: 2, envMapIntensity: 1.2 })),
  /** Satin silver foil for big flat panels (a full mirror reads as black when it reflects empty space). */
  satin: () =>
    once('satin', () => new MeshStandardMaterial({ color: new Color('#e4e8f0'), metalness: 0.45, roughness: 0.34, bumpMap: foilBumpTexture(), bumpScale: 2 })),
  metal: () => once('metal', () => new MeshStandardMaterial({ color: new Color('#aab1bf'), metalness: 0.85, roughness: 0.35 })),
  dark: () => once('dark', () => new MeshStandardMaterial({ color: new Color('#2a2e3b'), metalness: 0.4, roughness: 0.5 })),
  white: () => once('white', () => new MeshPhysicalMaterial({ color: new Color('#f5f6fa'), roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.2 })),
  offWhite: () => once('offWhite', () => new MeshPhysicalMaterial({ color: new Color('#e3e6ee'), roughness: 0.45, clearcoat: 0.6 })),
  saffron: () => once('saffron', () => new MeshPhysicalMaterial({ color: new Color('#ff9933'), roughness: 0.4, clearcoat: 1 })),
  green: () => once('green', () => new MeshPhysicalMaterial({ color: new Color('#1f9a3a'), roughness: 0.4, clearcoat: 1 })),
  nozzle: () => once('nozzle', () => new MeshStandardMaterial({ color: new Color('#3b3f4c'), metalness: 0.9, roughness: 0.3, side: DoubleSide })),
  solar: () =>
    once('solar', () => new MeshStandardMaterial({ map: solarTexture(), metalness: 0.55, roughness: 0.28, emissive: new Color('#12205a'), emissiveIntensity: 0.35, envMapIntensity: 1.4 })),
  flag: () => once('flag', () => new MeshStandardMaterial({ map: flagTexture(), roughness: 0.55, side: DoubleSide })),
  lens: () => once('lens', () => new MeshPhysicalMaterial({ color: new Color('#0d1022'), roughness: 0.08, clearcoat: 1, metalness: 0.2 })),
  glint: () => once('glint', () => new MeshStandardMaterial({ color: new Color('#ffffff'), emissive: new Color('#ffffff'), emissiveIntensity: 1.5, toneMapped: false })),
  latch: () => once('latch', () => new MeshStandardMaterial({ color: new Color('#ff8a1f'), emissive: new Color('#ff7a00'), emissiveIntensity: 1.2, roughness: 0.35, toneMapped: false })),
  concrete: () => once('concrete', () => new MeshStandardMaterial({ color: new Color('#b9b3a9'), roughness: 0.9 })),
  towerRed: () => once('towerRed', () => new MeshStandardMaterial({ color: new Color('#e2584a'), roughness: 0.6, metalness: 0.2 })),
  towerGrey: () => once('towerGrey', () => new MeshStandardMaterial({ color: new Color('#8e97a8'), roughness: 0.55, metalness: 0.5 })),
};
