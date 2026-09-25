import type { WorldStop } from '@/core/types';
import { TUNING } from '../logic/bands';
import { JUNIOR, SENIOR, TINY, TINY_JUNIOR, t } from './tiered';

export const meetStop: WorldStop = {
  id: 'meet-heart',
  title: t('Hello, Heart!', 'Meet Your Heart', 'Meet Your Heart'),
  emoji: '👋',
  color: '#FF6F91',
  narration: t(
    ['Look! A glowing heart inside! 💗', 'Put your hand on your chest. Feel it? Thump-thump!', 'Make a fist! ✊ Your heart is about that big!'],
    [
      'This is your heart, {name}! It lives in your chest, just a little to the left.',
      'Put your hand on your chest. Can you feel it thumping?',
      'Make a fist — your heart is about that big, and it grows as you grow!',
    ],
    [
      'Your heart sits in the middle of your chest, between your lungs, tilted so its pointy tip aims to your left.',
      'Put your hand on your chest, just left of centre, and feel the beat — or find your pulse on your wrist.',
      'It’s about the size of your fist, and your ribs form a strong cage around it.',
    ],
  ),
  facts: t(
    ['Your heart never sleeps! It beats all day and all night. 🌙', 'When you run, it goes faster! 🏃'],
    [
      'Your heart beats about 100,000 times every day!',
      'Your ribs make a bony cage that protects your heart.',
      'Your heart started beating before you were even born!',
    ],
    [
      'A child’s resting heart rate is roughly 70–110 beats per minute, depending on age; for adults it’s about 60–100.',
      'At about 100,000 beats a day, a heart beats more than 2.5 billion times in a long life.',
      'Your pulse is the push of blood from each heartbeat — you can feel it on your wrist or the side of your neck.',
    ],
  ),
  task: {
    kind: 'find-heart',
    instruction: t(
      `Tap the glowing heart ${TUNING.tiny.meet.taps} times to say hello!`,
      'Where is the heart hiding? Tap the right glowing spot!',
      'Find the heart: tap the glowing spot where it really sits.',
    ),
    hint: t(
      'Tap the pink heart in the chest!',
      'Look in the chest — near the middle, a little to one side.',
      'It’s in the chest, slightly to the body’s left — which is YOUR right when someone faces you.',
    ),
  },
  quiz: [
    {
      id: 'hh-meet-size-tiny',
      bands: TINY,
      prompt: 'How big is your heart?',
      choices: [
        { id: 'fist', label: 'Like my fist', emoji: '✊' },
        { id: 'melon', label: 'Like a watermelon', emoji: '🍉' },
        { id: 'ant', label: 'Like an ant', emoji: '🐜' },
      ],
      answerId: 'fist',
      explain: 'Yes! Your heart is about as big as your fist! ✊',
    },
    {
      id: 'hh-meet-sound-tiny',
      bands: TINY,
      prompt: 'What does your heart say?',
      choices: [
        { id: 'thump', label: 'Thump-thump!', emoji: '💓' },
        { id: 'moo', label: 'Moo!', emoji: '🐮' },
        { id: 'quack', label: 'Quack!', emoji: '🦆' },
      ],
      answerId: 'thump',
      explain: 'Thump-thump! That’s your heart working for you! 💓',
    },
    {
      id: 'hh-meet-run',
      bands: TINY_JUNIOR,
      prompt: t('When you run, your heart goes…', 'When you run and play, your heart beats…', 'When you run and play, your heart beats…'),
      choices: [
        { id: 'fast', label: t('Fast!', 'Faster', 'Faster'), emoji: '🐇' },
        { id: 'slow', label: t('Slow…', 'Slower', 'Slower'), emoji: '🐢' },
        { id: 'stop', label: t('Stops', 'It stops', 'It stops'), emoji: '✋' },
      ],
      answerId: 'fast',
      explain: t(
        'Zoom! Your heart goes fast when you run! 🐇',
        'Your heart beats faster to send more blood to your busy muscles.',
        'Your heart beats faster to send more blood to your busy muscles.',
      ),
    },
    {
      id: 'hh-meet-size',
      bands: JUNIOR,
      prompt: 'About how big is your heart?',
      choices: [
        { id: 'fist', label: 'About the size of your fist', emoji: '✊' },
        { id: 'ball', label: 'As big as a football', emoji: '⚽' },
        { id: 'pea', label: 'As small as a pea', emoji: '🟢' },
      ],
      answerId: 'fist',
      explain: 'Your heart is about the size of your fist — and it grows as you grow!',
    },
    {
      id: 'hh-meet-ribs',
      bands: JUNIOR,
      prompt: 'What protects your heart?',
      choices: [
        { id: 'ribs', label: 'Your ribs', emoji: '🦴' },
        { id: 'teeth', label: 'Your teeth', emoji: '🦷' },
        { id: 'hair', label: 'Your hair', emoji: '💇' },
      ],
      answerId: 'ribs',
      explain: 'Your ribs make a strong, bony cage around your heart and lungs.',
    },
    {
      id: 'hh-meet-where',
      bands: JUNIOR,
      prompt: 'Where does your heart live?',
      choices: [
        { id: 'chest', label: 'In your chest', emoji: '👕' },
        { id: 'tummy', label: 'In your tummy', emoji: '🍽️' },
        { id: 'head', label: 'In your head', emoji: '🧢' },
      ],
      answerId: 'chest',
      explain: 'Your heart is in your chest, between your lungs, a little to the left.',
    },
    {
      id: 'hh-meet-beats',
      bands: SENIOR,
      prompt: 'About how many times does your heart beat in one day?',
      choices: [
        { id: '100k', label: 'About 100,000 times' },
        { id: '1k', label: 'About 1,000 times' },
        { id: '10m', label: 'About 10 million times' },
        { id: '100', label: 'About 100 times' },
      ],
      answerId: '100k',
      explain: 'About 100,000 beats a day: roughly 70 beats a minute × 1,440 minutes in a day.',
    },
    {
      id: 'hh-meet-rate',
      bands: SENIOR,
      prompt: 'Which resting heart rate is typical for a 10-year-old?',
      choices: [
        { id: 'normal', label: 'Roughly 70–110 beats per minute' },
        { id: 'low', label: 'About 10–20 beats per minute' },
        { id: 'high', label: 'About 250–300 beats per minute' },
        { id: 'zero', label: 'It has no beat while resting' },
      ],
      answerId: 'normal',
      explain: 'Children’s resting rates are roughly 70–110 bpm and slowly drop with age; adults are usually about 60–100 bpm.',
    },
    {
      id: 'hh-meet-position',
      bands: SENIOR,
      prompt: 'Where exactly is your heart?',
      choices: [
        { id: 'middle', label: 'Middle of the chest, tilted to the left' },
        { id: 'right', label: 'Far over on the right side of the chest' },
        { id: 'belly', label: 'Just below the belly button' },
        { id: 'neck', label: 'At the bottom of the neck' },
      ],
      answerId: 'middle',
      explain: 'It sits between the lungs, near the middle of the chest, with its tip (the apex) pointing to the left.',
    },
    {
      id: 'hh-meet-pulse',
      bands: SENIOR,
      prompt: 'What is your pulse?',
      choices: [
        { id: 'push', label: 'The push of blood from each heartbeat, felt in an artery' },
        { id: 'air', label: 'Air moving in and out of your lungs' },
        { id: 'twitch', label: 'A muscle twitching in your wrist' },
        { id: 'nerve', label: 'A message from your brain to your hand' },
      ],
      answerId: 'push',
      explain: 'Every beat pushes a surge of blood through your arteries; you feel it where an artery is close to the skin, like your wrist.',
    },
  ],
};
