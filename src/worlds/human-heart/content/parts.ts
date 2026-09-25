import type { Tiered } from '@/core/types';
import type { PartId } from '../logic/ids';
import { t } from './tiered';

/** Everything the Heart Lab says about a part: its name, what goes wrong without it, and a rebuild clue. */
export interface PartInfo {
  readonly name: Tiered<string>;
  /** Short tray label (fits a chip). */
  readonly short: Tiered<string>;
  readonly emoji: string;
  /** "What happens without it?" — said when the part is pulled out. */
  readonly without: Tiered<string>;
  /** Senior rebuild clue: "Snap back … the part that …". */
  readonly clue: string;
}

export const PART_INFO: Readonly<Record<PartId, PartInfo>> = {
  aorta: {
    name: t('Big red tube', 'Aorta', 'Aorta'),
    short: t('Red tube', 'Aorta', 'Aorta'),
    emoji: '🔴',
    without: t(
      'Uh-oh! No big red tube — the body gets no blood!',
      'Without the aorta, your body can’t get oxygen-rich blood!',
      'No aorta: oxygen-rich blood has no way out of the left ventricle to the body.',
    ),
    clue: 'the body’s biggest artery, carrying oxygen-rich blood out of the left ventricle',
  },
  pa: {
    name: t('Blue tube to the lungs', 'Pulmonary artery', 'Pulmonary artery'),
    short: t('Lung tube', 'Pulmonary artery', 'Pulmonary artery'),
    emoji: '🔵',
    without: t(
      'Oh no! Blood can’t go get air!',
      'Without the pulmonary artery, blood can’t travel to the lungs to get oxygen.',
      'No pulmonary artery: the right ventricle can’t send blood to the lungs, so no fresh oxygen gets picked up.',
    ),
    clue: 'the artery that carries oxygen-poor blood to the lungs',
  },
  svc: {
    name: t('Top blue tube', 'Superior vena cava', 'Superior vena cava'),
    short: t('Top tube', 'Top vena cava', 'Superior vena cava'),
    emoji: '⬇️',
    without: t(
      'Blood from your head can’t come home!',
      'Blood from your head and arms can’t get back to the heart.',
      'No superior vena cava: blood from the head, neck and arms has no route back to the right atrium.',
    ),
    clue: 'the big vein bringing blood back from the head and arms',
  },
  ivc: {
    name: t('Bottom blue tube', 'Inferior vena cava', 'Inferior vena cava'),
    short: t('Bottom tube', 'Bottom vena cava', 'Inferior vena cava'),
    emoji: '⬆️',
    without: t(
      'Blood from your legs can’t come home!',
      'Blood from your tummy and legs can’t get back to the heart.',
      'No inferior vena cava: blood from the legs, gut and kidneys can’t return to the right atrium.',
    ),
    clue: 'the big vein bringing blood back from the legs and belly',
  },
  pv: {
    name: t('Red tubes from the lungs', 'Pulmonary veins', 'Pulmonary veins'),
    short: t('Lung veins', 'Pulmonary veins', 'Pulmonary veins'),
    emoji: '🫁',
    without: t(
      'Air-filled blood can’t come in!',
      'Blood full of oxygen can’t come back from the lungs.',
      'No pulmonary veins: freshly oxygenated blood can’t reach the left atrium.',
    ),
    clue: 'the veins that bring oxygen-rich blood back from the lungs',
  },
  coronary: {
    name: t('Heart’s food tubes', 'Coronary arteries', 'Coronary arteries'),
    short: t('Food tubes', 'Coronary arteries', 'Coronary arteries'),
    emoji: '🍽️',
    without: t(
      'The heart gets hungry! It needs its own food tubes!',
      'Without them, the heart muscle itself would run out of oxygen!',
      'No coronary arteries: the heart muscle would be starved of oxygen — they are the heart’s own blood supply.',
    ),
    clue: 'the small arteries that feed the heart muscle itself',
  },
  ra: {
    name: t('Blue top room', 'Right atrium', 'Right atrium'),
    short: t('Blue top', 'Right atrium', 'Right atrium'),
    emoji: '🔷',
    without: t(
      'Tired blood has no room to come home to!',
      'Blood coming back from the body has nowhere to wait!',
      'No right atrium: returning blood can’t collect — and the SA node, the heart’s pacemaker, lives in its wall!',
    ),
    clue: 'the chamber that receives oxygen-poor blood from the body',
  },
  la: {
    name: t('Red top room', 'Left atrium', 'Left atrium'),
    short: t('Red top', 'Left atrium', 'Left atrium'),
    emoji: '🔶',
    without: t(
      'Fresh blood has nowhere to go!',
      'Oxygen-rich blood from the lungs has nowhere to wait.',
      'No left atrium: blood from the pulmonary veins can’t collect and top up the left ventricle.',
    ),
    clue: 'the chamber that receives oxygen-rich blood from the lungs',
  },
  rv: {
    name: t('Blue bottom room', 'Right ventricle', 'Right ventricle'),
    short: t('Blue bottom', 'Right ventricle', 'Right ventricle'),
    emoji: '💙',
    without: t(
      'No push to the lungs! No air for the blood!',
      'Nothing pumps blood to the lungs to pick up oxygen.',
      'No right ventricle: nothing powers the short loop to the lungs, so blood can’t swap carbon dioxide for oxygen.',
    ),
    clue: 'the chamber that pumps blood to the lungs',
  },
  lv: {
    name: t('Red bottom room', 'Left ventricle', 'Left ventricle'),
    short: t('Red bottom', 'Left ventricle', 'Left ventricle'),
    emoji: '❤️',
    without: t(
      'No big push! The body gets no blood!',
      'The strongest pump is gone — blood can’t reach your body!',
      'No left ventricle: nothing generates the pressure to drive blood through the aorta to the whole body.',
    ),
    clue: 'the strongest pump, with the thickest wall',
  },
  tricuspid: {
    name: t('Blue door', 'Tricuspid valve', 'Tricuspid valve'),
    short: t('Blue door', 'Tricuspid valve', 'Tricuspid valve'),
    emoji: '🚪',
    without: t(
      'Oops! Blood sloshes backwards! 🌊',
      'Blood sloshes backwards into the right atrium on every squeeze!',
      'No tricuspid valve: each squeeze pushes blood back into the right atrium instead of only into the lungs.',
    ),
    clue: 'the three-flap door between the right atrium and right ventricle',
  },
  pulmonary: {
    name: t('Lung door', 'Pulmonary valve', 'Pulmonary valve'),
    short: t('Lung door', 'Pulmonary valve', 'Pulmonary valve'),
    emoji: '🚪',
    without: t(
      'Oops! Blood falls back in! 🌊',
      'Blood slips back from the lung artery into the heart!',
      'No pulmonary valve: blood falls back from the pulmonary artery into the right ventricle after every beat.',
    ),
    clue: 'the door between the right ventricle and the pulmonary artery',
  },
  mitral: {
    name: t('Red door', 'Mitral valve', 'Mitral valve'),
    short: t('Red door', 'Mitral valve', 'Mitral valve'),
    emoji: '🚪',
    without: t(
      'Oops! Blood sloshes backwards! 🌊',
      'Blood sloshes back into the left atrium when the heart squeezes!',
      'No mitral valve: blood is pushed back into the left atrium — towards the lungs — on every beat.',
    ),
    clue: 'the two-flap door between the left atrium and left ventricle',
  },
  aortic: {
    name: t('Big red door', 'Aortic valve', 'Aortic valve'),
    short: t('Big door', 'Aortic valve', 'Aortic valve'),
    emoji: '🚪',
    without: t(
      'Oops! Blood falls back in! 🌊',
      'Blood falls back from the aorta into the heart after each beat!',
      'No aortic valve: blood leaks back from the aorta into the left ventricle between beats.',
    ),
    clue: 'the door between the left ventricle and the aorta',
  },
};
