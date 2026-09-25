import type { WorldStop } from '@/core/types';
import { TUNING } from '../logic/bands';
import { JUNIOR, SENIOR, TINY, t } from './tiered';

export const valvesStop: WorldStop = {
  id: 'valves',
  title: t('Magic Doors', 'One-Way Doors', 'The Four Valves'),
  emoji: '🚪',
  color: '#2EC4B6',
  narration: t(
    ['These are the heart’s doors! 🚪', 'Open… and shut! Open… and shut!', 'Blood can only go ONE way! 👉'],
    [
      'Your heart has four little doors called valves.',
      'They open to let blood through, then snap shut so it can’t flow backwards.',
      'Let’s watch them in slow motion!',
    ],
    [
      'Four valves keep blood moving one way: the tricuspid, pulmonary, mitral and aortic valves.',
      'The tricuspid and mitral valves sit between the atria and ventricles; the pulmonary and aortic valves guard the exits into the arteries.',
      'Valves have no muscles of their own — pressure pushes them open and shut, like a door in the wind — about 100,000 times a day.',
    ],
  ),
  facts: t(
    ['The doors go click-clack all day! 🚪', 'One heart has 4 doors! 4️⃣'],
    [
      'The mitral valve has two flaps; the other three valves have three.',
      'The lub-dub sound is made by the valves closing.',
      'Your heart valves open and close about 100,000 times a day!',
    ],
    [
      'The mitral valve is named after a bishop’s mitre (hat), because its two flaps look like one.',
      'Tough cords called chordae tendineae hold the tricuspid and mitral flaps like parachute strings, so they can’t flip backwards.',
      'A leaky valve lets some blood slip backwards (called regurgitation); heart doctors can repair or replace valves.',
    ],
  ),
  task: {
    kind: 'fix-valves',
    instruction: t(
      'One door is wobbly! Tap it to fix it! 🔧',
      `${TUNING.junior.valves.leaky.length} doors are leaky! Tap the flapping doors to fix them.`,
      `${TUNING.senior.valves.leaky.length} valves are leaking backwards — find and repair them all!`,
    ),
    hint: t(
      'Look for the door that wobbles and drips!',
      'Leaky doors wobble and let drops sneak backwards.',
      'Watch for drops flowing the wrong way — backwards through a valve that doesn’t seal.',
    ),
  },
  quiz: [
    {
      id: 'hh-valves-job-tiny',
      bands: TINY,
      prompt: 'What do the heart’s doors do?',
      choices: [
        { id: 'open', label: 'Open and shut', emoji: '🚪' },
        { id: 'sing', label: 'Sing songs', emoji: '🎤' },
        { id: 'eat', label: 'Eat pizza', emoji: '🍕' },
      ],
      answerId: 'open',
      explain: 'Open and shut, open and shut! That keeps blood going the right way! 🚪',
    },
    {
      id: 'hh-valves-way-tiny',
      bands: TINY,
      prompt: 'Which way does blood go?',
      choices: [
        { id: 'one', label: 'One way', emoji: '➡️' },
        { id: 'every', label: 'Every way', emoji: '🔀' },
      ],
      answerId: 'one',
      explain: 'One way! The doors make sure of it! ➡️',
    },
    {
      id: 'hh-valves-name',
      bands: JUNIOR,
      prompt: 'What are the heart’s doors called?',
      choices: [
        { id: 'valves', label: 'Valves', emoji: '🚪' },
        { id: 'ventricles', label: 'Ventricles', emoji: '💪' },
        { id: 'veins', label: 'Veins', emoji: '🔵' },
      ],
      answerId: 'valves',
      explain: 'They’re called valves — one-way doors for blood.',
    },
    {
      id: 'hh-valves-why',
      bands: JUNIOR,
      prompt: 'Why does the heart need valves?',
      choices: [
        { id: 'oneway', label: 'So blood only flows one way', emoji: '➡️' },
        { id: 'red', label: 'To make blood red', emoji: '🔴' },
        { id: 'warm', label: 'To keep the heart warm', emoji: '🔥' },
      ],
      answerId: 'oneway',
      explain: 'Valves snap shut behind the blood so it can’t flow backwards.',
    },
    {
      id: 'hh-valves-count',
      bands: JUNIOR,
      prompt: 'How many valves does your heart have?',
      choices: [
        { id: 'four', label: 'Four', emoji: '4️⃣' },
        { id: 'two', label: 'Two', emoji: '2️⃣' },
        { id: 'eight', label: 'Eight', emoji: '8️⃣' },
      ],
      answerId: 'four',
      explain: 'Four valves — one for each chamber’s exit.',
    },
    {
      id: 'hh-valves-mitral',
      bands: SENIOR,
      prompt: 'Which valve has only two flaps?',
      choices: [
        { id: 'mitral', label: 'Mitral' },
        { id: 'tricuspid', label: 'Tricuspid' },
        { id: 'aortic', label: 'Aortic' },
        { id: 'pulmonary', label: 'Pulmonary' },
      ],
      answerId: 'mitral',
      explain: 'The mitral (bicuspid) valve has two flaps; the tricuspid, aortic and pulmonary valves each have three.',
    },
    {
      id: 'hh-valves-exit',
      bands: SENIOR,
      prompt: 'Which valve does blood pass through as it leaves the left ventricle?',
      choices: [
        { id: 'aortic', label: 'Aortic valve' },
        { id: 'mitral', label: 'Mitral valve' },
        { id: 'pulmonary', label: 'Pulmonary valve' },
        { id: 'tricuspid', label: 'Tricuspid valve' },
      ],
      answerId: 'aortic',
      explain: 'Blood leaves the left ventricle through the aortic valve into the aorta.',
    },
    {
      id: 'hh-valves-dub',
      bands: SENIOR,
      prompt: 'What makes the “dub” sound?',
      choices: [
        { id: 'sl', label: 'The aortic and pulmonary valves closing' },
        { id: 'av', label: 'The tricuspid and mitral valves closing' },
        { id: 'sa', label: 'The SA node firing' },
        { id: 'fill', label: 'Blood entering the atria' },
      ],
      answerId: 'sl',
      explain: 'When the ventricles relax, the aortic and pulmonary valves snap shut — “dub”.',
    },
    {
      id: 'hh-valves-leak',
      bands: SENIOR,
      prompt: 'What happens with a leaky valve?',
      choices: [
        { id: 'back', label: 'Some blood flows backwards' },
        { id: 'blue', label: 'The blood turns blue' },
        { id: 'grow', label: 'The heart grows a new valve' },
        { id: 'oxygen', label: 'The blood gets extra oxygen' },
      ],
      answerId: 'back',
      explain: 'A leaky valve doesn’t seal, so some blood slips backwards and the heart has to work harder.',
    },
  ],
};
