import type { WorldStop } from '@/core/types';
import { TUNING } from '../logic/bands';
import { JUNIOR, SENIOR, TINY, t } from './tiered';

export const labStop: WorldStop = {
  id: 'take-apart',
  title: t('Heart Lab', 'Take It Apart!', 'Heart Lab: Take It Apart'),
  emoji: '🔧',
  color: '#FFB020',
  narration: t(
    ['Welcome to the Heart Lab! 🔬', 'We can pull the heart apart… 🧩', '…and click it back together! Click!'],
    [
      'Welcome to my Heart Lab, {name}! This heart model comes apart piece by piece.',
      'Pull out a part to see what it does — and what goes wrong without it!',
      'Then we’ll snap everything back so the heart can beat again.',
    ],
    [
      'Welcome to the Heart Lab. This model breaks down into chambers, great vessels, valves and coronary arteries.',
      'Engineers learn how a machine works by taking it apart — let’s do the same with the body’s hardest-working pump.',
      'For each part, ask: what would fail without it? Then rebuild the heart from the clues.',
    ],
  ),
  facts: t(
    ['Big tubes carry blood in and out! 🚰', 'The heart has tiny tubes to feed itself! 🍽️'],
    [
      'The aorta is the biggest artery in your body.',
      'Coronary arteries are small tubes that feed the heart muscle itself.',
      'Veins bring blood TO the heart. Arteries carry blood AWAY from it.',
    ],
    [
      'The aorta, your largest artery, is about as wide as a garden hose in an adult.',
      'Arteries are named for carrying blood away from the heart, not for their oxygen — so the pulmonary arteries carry oxygen-poor blood.',
      'The coronary arteries branch off the very start of the aorta to supply the heart muscle with oxygen-rich blood.',
    ],
  ),
  task: {
    kind: 'take-apart',
    instruction: t(
      `Tap ${TUNING.tiny.lab.goal} shiny parts to pull them out — then put them back!`,
      `Pull out ${TUNING.junior.lab.goal} parts, then snap them back in!`,
      `Take the heart apart — pull out ${TUNING.senior.lab.goal} parts — then rebuild it from the clues!`,
    ),
    hint: t(
      'Tap a glowing part of the heart!',
      'Tap any part — tubes, rooms or doors. The tray shows the parts to put back.',
      'Tap parts on the model or in the tray. To rebuild, pick the part the clue describes.',
    ),
  },
  quiz: [
    {
      id: 'hh-lab-tubes-tiny',
      bands: TINY,
      prompt: 'What do the big heart tubes carry?',
      choices: [
        { id: 'blood', label: 'Blood', emoji: '🩸' },
        { id: 'cookies', label: 'Cookies', emoji: '🍪' },
        { id: 'rocks', label: 'Rocks', emoji: '🪨' },
      ],
      answerId: 'blood',
      explain: 'Blood! The tubes carry blood in and out of the heart! 🩸',
    },
    {
      id: 'hh-lab-whole-tiny',
      bands: TINY,
      prompt: 'Which heart is ready to pump?',
      choices: [
        { id: 'whole', label: 'All together!', emoji: '❤️' },
        { id: 'pieces', label: 'In pieces', emoji: '🧩' },
      ],
      answerId: 'whole',
      explain: 'The heart needs ALL its parts together to pump! ❤️',
    },
    {
      id: 'hh-lab-aorta',
      bands: JUNIOR,
      prompt: 'What is the biggest artery in your body?',
      choices: [
        { id: 'aorta', label: 'The aorta', emoji: '🔴' },
        { id: 'vc', label: 'The vena cava', emoji: '🔵' },
        { id: 'cor', label: 'A coronary artery', emoji: '🍽️' },
      ],
      answerId: 'aorta',
      explain: 'The aorta! It carries oxygen-rich blood out of the heart to the whole body. (The vena cava is the biggest vein.)',
    },
    {
      id: 'hh-lab-coronary',
      bands: JUNIOR,
      prompt: 'What do the coronary arteries do?',
      choices: [
        { id: 'feed', label: 'Feed the heart muscle with blood', emoji: '🍽️' },
        { id: 'lungs', label: 'Carry blood to the lungs', emoji: '🫁' },
        { id: 'sound', label: 'Make the lub-dub sound', emoji: '🥁' },
      ],
      answerId: 'feed',
      explain: 'The heart is a hard-working muscle, so it needs its own blood supply — the coronary arteries.',
    },
    {
      id: 'hh-lab-without-aorta',
      bands: JUNIOR,
      prompt: 'What would happen without the aorta?',
      choices: [
        { id: 'body', label: 'The body couldn’t get oxygen-rich blood', emoji: '😟' },
        { id: 'faster', label: 'The heart would just beat faster', emoji: '💨' },
        { id: 'nothing', label: 'Nothing at all', emoji: '🤷' },
      ],
      answerId: 'body',
      explain: 'The aorta is the main exit for oxygen-rich blood — without it, the body can’t get the oxygen it needs.',
    },
    {
      id: 'hh-lab-venacava',
      bands: SENIOR,
      prompt: 'Which vessels bring oxygen-poor blood from the body into the right atrium?',
      choices: [
        { id: 'vc', label: 'The superior and inferior vena cava' },
        { id: 'pv', label: 'The pulmonary veins' },
        { id: 'cor', label: 'The coronary arteries' },
        { id: 'aorta', label: 'The aorta' },
      ],
      answerId: 'vc',
      explain: 'The superior vena cava drains the head and arms; the inferior vena cava drains the lower body. Both empty into the right atrium.',
    },
    {
      id: 'hh-lab-pv',
      bands: SENIOR,
      prompt: 'Which vessels bring oxygen-rich blood back from the lungs?',
      choices: [
        { id: 'pv', label: 'The pulmonary veins' },
        { id: 'pa', label: 'The pulmonary artery' },
        { id: 'vc', label: 'The vena cava' },
        { id: 'cor', label: 'The coronary arteries' },
      ],
      answerId: 'pv',
      explain: 'The pulmonary veins carry freshly oxygenated blood from the lungs into the left atrium.',
    },
    {
      id: 'hh-lab-artery',
      bands: SENIOR,
      prompt: 'Arteries are defined as blood vessels that…',
      choices: [
        { id: 'away', label: 'Carry blood away from the heart' },
        { id: 'oxygen', label: 'Always carry oxygen-rich blood' },
        { id: 'towards', label: 'Carry blood towards the heart' },
        { id: 'blue', label: 'Are always blue' },
      ],
      answerId: 'away',
      explain: 'Arteries carry blood away from the heart — which is why the pulmonary arteries count as arteries even though their blood is oxygen-poor.',
    },
    {
      id: 'hh-lab-coronary-why',
      bands: SENIOR,
      prompt: 'Why does the heart need its own coronary arteries?',
      choices: [
        { id: 'oxygen', label: 'Heart muscle needs a steady supply of oxygen too' },
        { id: 'colour', label: 'To make the heart look red' },
        { id: 'air', label: 'To carry air to the lungs' },
        { id: 'store', label: 'To store spare blood' },
      ],
      answerId: 'oxygen',
      explain: 'Blood passing through the chambers can’t reach deep into the thick heart wall, so the coronary arteries deliver oxygen-rich blood to the muscle itself.',
    },
  ],
};
