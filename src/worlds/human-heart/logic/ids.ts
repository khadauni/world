/** Stable ids shared by content, rules, the 3D scene and the overlay. */

export const STOP_IDS = ['meet-heart', 'heartbeat', 'four-rooms', 'take-apart', 'valves', 'blood-ride', 'healthy-heart'] as const;

export const CHAMBERS = ['ra', 'rv', 'la', 'lv'] as const;
export type ChamberId = (typeof CHAMBERS)[number];

export const VALVES = ['tricuspid', 'pulmonary', 'mitral', 'aortic'] as const;
export type ValveId = (typeof VALVES)[number];

/** Every piece of the take-apart heart, in a sensible "outside in" pulling order. */
export const PARTS = ['aorta', 'pa', 'svc', 'ivc', 'pv', 'coronary', 'ra', 'la', 'rv', 'lv', 'tricuspid', 'pulmonary', 'mitral', 'aortic'] as const;
export type PartId = (typeof PARTS)[number];

export function isValve(id: PartId): id is ValveId {
  return (VALVES as readonly string[]).includes(id);
}

/** Oxygen-poor (right, "blue" in diagrams) or oxygen-rich (left, red) side of the heart. */
export type Side = 'right' | 'left';

export const PART_SIDE: Readonly<Record<PartId, Side>> = {
  aorta: 'left',
  pa: 'right',
  svc: 'right',
  ivc: 'right',
  pv: 'left',
  coronary: 'left',
  ra: 'right',
  la: 'left',
  rv: 'right',
  lv: 'left',
  tricuspid: 'right',
  pulmonary: 'right',
  mitral: 'left',
  aortic: 'left',
};

/** Places a child might tap when looking for the heart in the body silhouette. */
export const SPOTS = ['heart', 'mirror', 'head', 'tummy', 'belly'] as const;
export type SpotId = (typeof SPOTS)[number];
