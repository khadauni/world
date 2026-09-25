import type { WorldStop } from '@/core/types';
import { TUNING } from '../logic/bands';
import { JUNIOR, SENIOR, TINY, t } from './tiered';

export const rideStop: WorldStop = {
  id: 'blood-ride',
  title: t('Blood Cell Ride', 'Ride a Blood Cell', 'The Circulation Ride'),
  emoji: '🩸',
  color: '#E63946',
  narration: t(
    ['Hop on! We’re a red blood cell! 🔴', 'Zoom to the lungs to get air! 🌬️', 'Then zoom to the body to share it! 🏃'],
    [
      'Hop on a red blood cell, {name}! It carries oxygen — the part of air your body needs.',
      'First the heart pumps us to the lungs to pick up oxygen.',
      'Then back to the heart, which pumps us out to the body to deliver it!',
    ],
    [
      'Blood travels a figure-of-eight: a short loop to the lungs and a long loop around the body. That’s double circulation.',
      'Right side: vena cava → right atrium → right ventricle → pulmonary artery → lungs, where the cell loads oxygen.',
      'Left side: pulmonary veins → left atrium → left ventricle → aorta → body, where oxygen is unloaded and carbon dioxide collected.',
      'At rest, a full lap takes only about a minute!',
    ],
  ),
  facts: t(
    ['Blood cells are tiny! Super tiny! 🔬', 'One whole trip takes about one minute! ⏱️'],
    [
      'One drop of blood holds millions of red blood cells!',
      'A blood cell can zoom around your whole body in about a minute.',
      'Red blood cells look like squishy doughnuts without a hole.',
    ],
    [
      'Red blood cells carry oxygen using haemoglobin, an iron-containing protein — it’s what makes blood red.',
      'A red blood cell lives about 120 days; your bone marrow makes millions of new ones every second.',
      'Laid end to end, all your blood vessels would stretch about 100,000 km — more than twice around the Earth.',
    ],
  ),
  task: {
    kind: 'blood-ride',
    instruction: t(
      `Tap ${TUNING.tiny.ride.bubbles} air bubbles! Then feed the muscle!`,
      `In the lungs, tap ${TUNING.junior.ride.bubbles} oxygen bubbles — then deliver them to the hungry muscle!`,
      `Load ${TUNING.senior.ride.bubbles} oxygen molecules in the lungs, then unload them at the working muscle!`,
    ),
    hint: t(
      'Tap the shiny bubbles!',
      'Tap each floating O₂ bubble, then tap the muscle.',
      'Oxygen binds to haemoglobin in the lungs; tap every O₂, then tap the muscle to unload.',
    ),
  },
  quiz: [
    {
      id: 'hh-ride-carry-tiny',
      bands: TINY,
      prompt: 'What do red blood cells carry?',
      choices: [
        { id: 'air', label: 'Air (oxygen)', emoji: '🌬️' },
        { id: 'candy', label: 'Candy', emoji: '🍭' },
        { id: 'toys', label: 'Toys', emoji: '🧸' },
      ],
      answerId: 'air',
      explain: 'Air! The good part of air, called oxygen! 🌬️',
    },
    {
      id: 'hh-ride-lungs-tiny',
      bands: TINY,
      prompt: 'Where does blood get air?',
      choices: [
        { id: 'lungs', label: 'Lungs', emoji: '🫁' },
        { id: 'ears', label: 'Ears', emoji: '👂' },
        { id: 'feet', label: 'Feet', emoji: '🦶' },
      ],
      answerId: 'lungs',
      explain: 'In the lungs! Breathe in… and the blood grabs the air! 🫁',
    },
    {
      id: 'hh-ride-oxygen',
      bands: JUNIOR,
      prompt: 'Where does blood pick up oxygen?',
      choices: [
        { id: 'lungs', label: 'In the lungs', emoji: '🫁' },
        { id: 'stomach', label: 'In the stomach', emoji: '🍽️' },
        { id: 'bones', label: 'In the bones', emoji: '🦴' },
      ],
      answerId: 'lungs',
      explain: 'Every breath fills your lungs with air, and blood passing by picks up the oxygen.',
    },
    {
      id: 'hh-ride-side',
      bands: JUNIOR,
      prompt: 'Which side of the heart pumps blood out to the body?',
      choices: [
        { id: 'left', label: 'The left side', emoji: '🔴' },
        { id: 'right', label: 'The right side', emoji: '🔵' },
        { id: 'top', label: 'Only the top rooms', emoji: '⬆️' },
      ],
      answerId: 'left',
      explain: 'The left side pumps oxygen-rich blood to the body; the right side pumps blood to the lungs.',
    },
    {
      id: 'hh-ride-time',
      bands: JUNIOR,
      prompt: 'About how long does a blood cell take to go all the way around?',
      choices: [
        { id: 'minute', label: 'About a minute', emoji: '⏱️' },
        { id: 'week', label: 'About a week', emoji: '📅' },
        { id: 'year', label: 'About a year', emoji: '🎂' },
      ],
      answerId: 'minute',
      explain: 'At rest, a full lap takes about a minute — even faster when you run!',
    },
    {
      id: 'hh-ride-order',
      bands: SENIOR,
      prompt: 'After the lungs, which order does blood follow?',
      choices: [
        { id: 'right', label: 'Pulmonary veins → left atrium → left ventricle → aorta' },
        { id: 'vc', label: 'Vena cava → right atrium → right ventricle → aorta' },
        { id: 'reverse', label: 'Aorta → left ventricle → left atrium → pulmonary veins' },
        { id: 'mixed', label: 'Pulmonary artery → right atrium → left ventricle → body' },
      ],
      answerId: 'right',
      explain: 'Oxygen-rich blood returns in the pulmonary veins to the left atrium, drops into the left ventricle, and is pumped out through the aorta.',
    },
    {
      id: 'hh-ride-haemoglobin',
      bands: SENIOR,
      prompt: 'Which protein in red blood cells carries oxygen?',
      choices: [
        { id: 'hb', label: 'Haemoglobin' },
        { id: 'insulin', label: 'Insulin' },
        { id: 'keratin', label: 'Keratin' },
        { id: 'chlorophyll', label: 'Chlorophyll' },
      ],
      answerId: 'hb',
      explain: 'Haemoglobin contains iron, which binds oxygen in the lungs and releases it in the tissues.',
    },
    {
      id: 'hh-ride-co2',
      bands: SENIOR,
      prompt: 'What does blood collect from the body’s cells to take to the lungs?',
      choices: [
        { id: 'co2', label: 'Carbon dioxide' },
        { id: 'o2', label: 'Oxygen' },
        { id: 'helium', label: 'Helium' },
        { id: 'salt', label: 'Salt crystals' },
      ],
      answerId: 'co2',
      explain: 'Cells make carbon dioxide as waste; blood carries it to the lungs and you breathe it out.',
    },
    {
      id: 'hh-ride-double',
      bands: SENIOR,
      prompt: 'Why is it called “double circulation”?',
      choices: [
        { id: 'twice', label: 'Blood passes through the heart twice per full lap' },
        { id: 'hearts', label: 'People have two hearts' },
        { id: 'both', label: 'Blood flows both ways in every vessel' },
        { id: 'laps', label: 'Each cell does two laps every heartbeat' },
      ],
      answerId: 'twice',
      explain: 'One loop goes heart → lungs → heart, the other heart → body → heart, so each lap passes through the heart twice.',
    },
    {
      id: 'hh-ride-length',
      bands: SENIOR,
      prompt: 'All your blood vessels laid end to end would stretch about…',
      choices: [
        { id: '100k', label: '100,000 km' },
        { id: '100', label: '100 km' },
        { id: '1k', label: '1,000 km' },
        { id: '10m', label: '10 million km' },
      ],
      answerId: '100k',
      explain: 'About 100,000 km — enough to wrap around the Earth more than twice. Most of that length is tiny capillaries.',
    },
  ],
};
