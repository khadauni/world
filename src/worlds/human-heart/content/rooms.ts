import type { WorldStop } from '@/core/types';
import { JUNIOR, JUNIOR_SENIOR, SENIOR, TINY, t } from './tiered';

export const roomsStop: WorldStop = {
  id: 'four-rooms',
  title: t('Four Rooms', 'The Four Rooms', 'Four Chambers'),
  emoji: '🏠',
  color: '#8C6BFF',
  narration: t(
    ['Peek inside! The heart has 4 rooms! 🏠', 'Two rooms on top. Two rooms at the bottom!', 'Blue side needs air. Red side is full of air!'],
    [
      'Let’s peek inside with x-ray magic! Your heart has four rooms called chambers.',
      'The two top rooms are the atria. They collect blood coming in.',
      'The two bottom rooms are the ventricles — the strong pumps!',
      'The blue side sends blood to the lungs. The red side sends blood to your body.',
    ],
    [
      'Here’s the heart in cross-section: right and left atria on top, right and left ventricles below.',
      'A muscular wall called the septum keeps oxygen-poor blood (right side) apart from oxygen-rich blood (left side).',
      'The left ventricle has the thickest wall because it pumps blood around the whole body, not just next door to the lungs.',
      'Mirror trick: left and right are the heart owner’s sides — so when you face someone, their left side is on YOUR right.',
    ],
  ),
  facts: t(
    ['The bottom rooms are the strongest! 💪', 'Real blood is always red! ❤️'],
    [
      'Blue is just a diagram colour — real blood is always red!',
      'The left bottom room, the left ventricle, is the strongest pump in your heart.',
      'A wall called the septum keeps the two sides apart.',
    ],
    [
      'Blood is never really blue: oxygen-poor blood is dark red. Diagrams use blue to show it.',
      'Atria are thin-walled receiving rooms; ventricles are the thick-walled pumping rooms.',
      'The left ventricle’s wall is roughly two to three times thicker than the right ventricle’s.',
    ],
  ),
  task: {
    kind: 'name-chambers',
    instruction: t('Tap the room I call! Listen! 👂', 'Tap the chamber Dr. Pulse names!', 'Find each chamber from its name or clue!'),
    hint: t(
      'Look at the colours — blue or red, top or bottom!',
      'Atria are on top, ventricles at the bottom. The right side is blue, on YOUR left.',
      'Right side = oxygen-poor (blue), shown on YOUR left. Ventricles are the bottom pumps.',
    ),
  },
  quiz: [
    {
      id: 'hh-rooms-count-tiny',
      bands: TINY,
      prompt: 'How many rooms does the heart have?',
      choices: [
        { id: 'four', label: 'Four', emoji: '4️⃣' },
        { id: 'two', label: 'Two', emoji: '2️⃣' },
        { id: 'ten', label: 'Ten', emoji: '🔟' },
      ],
      answerId: 'four',
      explain: 'Four rooms! Two on top and two at the bottom! 🏠',
    },
    {
      id: 'hh-rooms-colour-tiny',
      bands: TINY,
      prompt: 'Which colour shows blood full of air?',
      choices: [
        { id: 'red', label: 'Red', color: '#FF3B55' },
        { id: 'blue', label: 'Blue', color: '#4F74FF' },
      ],
      answerId: 'red',
      explain: 'Red! Blood full of fresh air is bright red! ❤️',
    },
    {
      id: 'hh-rooms-count',
      bands: JUNIOR,
      prompt: 'How many chambers does the heart have?',
      choices: [
        { id: 'four', label: 'Four', emoji: '4️⃣' },
        { id: 'two', label: 'Two', emoji: '2️⃣' },
        { id: 'six', label: 'Six', emoji: '6️⃣' },
      ],
      answerId: 'four',
      explain: 'Four chambers: two atria on top and two ventricles below.',
    },
    {
      id: 'hh-rooms-top',
      bands: JUNIOR,
      prompt: 'What are the two top chambers called?',
      choices: [
        { id: 'atria', label: 'Atria', emoji: '⬆️' },
        { id: 'ventricles', label: 'Ventricles', emoji: '⬇️' },
        { id: 'valves', label: 'Valves', emoji: '🚪' },
      ],
      answerId: 'atria',
      explain: 'The top rooms are the atria — they collect blood as it comes in.',
    },
    {
      id: 'hh-rooms-strongest',
      bands: JUNIOR,
      prompt: 'Which chamber is the strongest pump?',
      choices: [
        { id: 'lv', label: 'Left ventricle', emoji: '💪' },
        { id: 'ra', label: 'Right atrium', emoji: '🔵' },
        { id: 'la', label: 'Left atrium', emoji: '🔴' },
      ],
      answerId: 'lv',
      explain: 'The left ventricle pumps blood all the way around your body, so it has the thickest, strongest wall.',
    },
    {
      id: 'hh-rooms-red',
      bands: JUNIOR_SENIOR,
      prompt: t('What colour is real blood?', 'What colour is real blood inside you?', 'What colour is oxygen-poor blood really?'),
      choices: [
        { id: 'red', label: t('Always red', 'Always red', 'Dark red'), color: '#B3122E' },
        { id: 'blue', label: 'Blue', color: '#4F74FF' },
        { id: 'purple', label: 'Purple', color: '#8E44FF' },
      ],
      answerId: 'red',
      explain: t(
        'Real blood is always red! Blue is just a diagram colour.',
        'Real blood is always red — darker red when it needs oxygen. Blue is just a diagram colour.',
        'Oxygen-poor blood is dark red. Veins can look bluish through skin because of how light travels, and diagrams use blue as a code.',
      ),
    },
    {
      id: 'hh-rooms-thick',
      bands: SENIOR,
      prompt: 'Why does the left ventricle have the thickest wall?',
      choices: [
        { id: 'body', label: 'It pumps blood around the whole body' },
        { id: 'store', label: 'It stores the most blood' },
        { id: 'lungs', label: 'It pumps blood to the lungs' },
        { id: 'valves', label: 'It protects the valves' },
      ],
      answerId: 'body',
      explain: 'Pushing blood through the whole body takes much higher pressure than the short trip to the lungs, so the left ventricle is built thicker.',
    },
    {
      id: 'hh-rooms-septum',
      bands: SENIOR,
      prompt: 'What separates the left and right sides of the heart?',
      choices: [
        { id: 'septum', label: 'The septum' },
        { id: 'aorta', label: 'The aorta' },
        { id: 'ribs', label: 'The ribs' },
        { id: 'mitral', label: 'The mitral valve' },
      ],
      answerId: 'septum',
      explain: 'The septum is a muscular wall that keeps oxygen-poor and oxygen-rich blood from mixing.',
    },
    {
      id: 'hh-rooms-mirror',
      bands: SENIOR,
      prompt: 'You face a friend. On which side of YOUR view is their left ventricle?',
      choices: [
        { id: 'my-right', label: 'On my right' },
        { id: 'my-left', label: 'On my left' },
        { id: 'middle', label: 'Exactly in the middle' },
        { id: 'top', label: 'At the very top' },
      ],
      answerId: 'my-right',
      explain: 'Mirror trick: their left is your right when you face them — that’s why heart diagrams show the left side on the right.',
    },
    {
      id: 'hh-rooms-receive',
      bands: SENIOR,
      prompt: 'Which chamber receives oxygen-poor blood from the body?',
      choices: [
        { id: 'ra', label: 'Right atrium' },
        { id: 'la', label: 'Left atrium' },
        { id: 'lv', label: 'Left ventricle' },
        { id: 'rv', label: 'Right ventricle' },
      ],
      answerId: 'ra',
      explain: 'The superior and inferior vena cava empty into the right atrium.',
    },
  ],
};
