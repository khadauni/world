/**
 * World palette. Teaching colours follow the diagram convention: the oxygen-poor (right) side is
 * blue/purple, the oxygen-rich (left) side is red — real blood is always red; blue is just a code.
 */
export const PALETTE = {
  bgCenter: '#ff9bb8',
  bgMid: '#b83266',
  bgEdge: '#3a0b26',
  canvas: '#3a0b26',

  muscleRight: '#d65a86',
  muscleLeft: '#f0525f',
  muscleCut: '#ffb3bf',
  muscleWall: '#e0475f',

  poor: '#5b72ff',
  poorDeep: '#2d2fa8',
  rich: '#ff3450',
  richDeep: '#b3122e',

  coronary: '#ff8a3d',
  valve: '#fff1dc',
  valveRim: '#ffc93c',

  rimCool: '#9fe4ff',
  rimWarm: '#ffd1e0',
  glow: '#fff4b0',
  good: '#39d98a',
  gold: '#ffc93c',
  ink: '#1d2150',
} as const;

/** Tissue colour per part (chambers carry a hint of their side; vessels carry the full teaching colour). */
export const PART_COLOR = {
  ra: PALETTE.muscleRight,
  rv: PALETTE.muscleRight,
  la: PALETTE.muscleLeft,
  lv: PALETTE.muscleLeft,
  aorta: PALETTE.rich,
  pa: PALETTE.poor,
  svc: PALETTE.poor,
  ivc: PALETTE.poor,
  pv: PALETTE.rich,
  coronary: PALETTE.coronary,
  tricuspid: PALETTE.valve,
  pulmonary: PALETTE.valve,
  mitral: PALETTE.valve,
  aortic: PALETTE.valve,
} as const;
