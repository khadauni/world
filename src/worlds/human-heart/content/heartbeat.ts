import type { WorldStop } from '@/core/types';
import { TUNING } from '../logic/bands';
import { JUNIOR, SENIOR, TINY, t } from './tiered';

export const heartbeatStop: WorldStop = {
  id: 'heartbeat',
  title: t('Thump-Thump!', 'Lub-Dub Heartbeat', 'The Heartbeat'),
  emoji: '💓',
  color: '#FF4D6D',
  narration: t(
    ['Listen! Lub-dub, lub-dub! 🥁', 'The heart squeezes… and relaxes. Squeeze! Relax!', 'Every squeeze pushes blood! Whoosh! 💨'],
    [
      'Listen: lub-dub! That’s the sound of your heart’s little doors snapping shut.',
      'First the two top rooms squeeze, then the two big bottom rooms squeeze hard.',
      'Every big squeeze pushes blood out to your whole body.',
    ],
    [
      'Each beat starts with an electrical spark from the SA node — the heart’s natural pacemaker, in the wall of the right atrium.',
      'The atria contract first to top up the ventricles; a split second later the ventricles contract and pump blood out.',
      '“Lub” is the tricuspid and mitral valves closing as the ventricles squeeze; “dub” is the aortic and pulmonary valves closing as they relax.',
    ],
  ),
  facts: t(
    ['Doctors listen with a stethoscope! 🩺', 'Dancing makes your heart beat faster! 💃'],
    [
      'A doctor uses a stethoscope to listen to your lub-dub.',
      'Running and dancing make your heart beat faster, to send more blood to your muscles.',
      'Kids’ hearts usually beat a bit faster than grown-ups’ hearts.',
    ],
    [
      'An ECG draws the heart’s electricity: a small P wave (atria), a tall QRS spike (ventricles) and a T wave (ventricles resetting).',
      'At rest, an adult heart pumps about 5 litres of blood a minute — that adds up to about 7,000 litres every day.',
      'Exercise trains the heart: a fitter heart pumps more blood with every beat, so it can beat more slowly at rest.',
    ],
  ),
  task: {
    kind: 'beat-rhythm',
    instruction: t(
      `Tap when the heart squeezes — BOOM! ${TUNING.tiny.beat.goal} times!`,
      `Tap the drum each time the heart squeezes — ${TUNING.junior.beat.goal} good beats!`,
      `Tap in time with each ventricle squeeze — ${TUNING.senior.beat.goal} beats on the QRS spike!`,
    ),
    hint: t(
      'Wait for the big squeeze, then tap!',
      'Watch the glowing ring shrink onto the heart — tap when it lands!',
      'Tap as the ring lands: that’s the big ventricle squeeze and the QRS spike on the ECG.',
    ),
  },
  quiz: [
    {
      id: 'hh-beat-sound-tiny',
      bands: TINY,
      prompt: 'What sound does your heart make?',
      choices: [
        { id: 'lubdub', label: 'Lub-dub!', emoji: '🥁' },
        { id: 'meow', label: 'Meow!', emoji: '🐱' },
        { id: 'ding', label: 'Ding-dong!', emoji: '🔔' },
      ],
      answerId: 'lubdub',
      explain: 'Lub-dub, lub-dub! That’s your heart! 🥁',
    },
    {
      id: 'hh-beat-job-tiny',
      bands: TINY,
      prompt: 'What does your heart do?',
      choices: [
        { id: 'pump', label: 'Squeeze and pump!', emoji: '💪' },
        { id: 'sleep', label: 'Sleep all day', emoji: '😴' },
        { id: 'eat', label: 'Eat food', emoji: '🍝' },
      ],
      answerId: 'pump',
      explain: 'Squeeze! Pump! Your heart pushes blood all around you! 💪',
    },
    {
      id: 'hh-beat-listen-tiny',
      bands: TINY,
      prompt: 'What does a doctor listen with?',
      choices: [
        { id: 'steth', label: 'Stethoscope', emoji: '🩺' },
        { id: 'banana', label: 'Banana', emoji: '🍌' },
        { id: 'sock', label: 'Sock', emoji: '🧦' },
      ],
      answerId: 'steth',
      explain: 'A stethoscope! It helps the doctor hear lub-dub! 🩺',
    },
    {
      id: 'hh-beat-sound',
      bands: JUNIOR,
      prompt: 'What makes the lub-dub sound?',
      choices: [
        { id: 'valves', label: 'Heart doors (valves) closing', emoji: '🚪' },
        { id: 'tummy', label: 'Your tummy rumbling', emoji: '🍔' },
        { id: 'lungs', label: 'Your lungs breathing', emoji: '🌬️' },
      ],
      answerId: 'valves',
      explain: 'The heart’s doors, called valves, snap shut — lub, then dub!',
    },
    {
      id: 'hh-beat-order',
      bands: JUNIOR,
      prompt: 'Which rooms squeeze first in a heartbeat?',
      choices: [
        { id: 'top', label: 'The top rooms', emoji: '⬆️' },
        { id: 'bottom', label: 'The bottom rooms', emoji: '⬇️' },
        { id: 'none', label: 'No rooms squeeze', emoji: '🙅' },
      ],
      answerId: 'top',
      explain: 'The top rooms squeeze first to fill the bottom rooms, then the big bottom rooms pump!',
    },
    {
      id: 'hh-beat-steth',
      bands: JUNIOR,
      prompt: 'What does a doctor use to listen to your heart?',
      choices: [
        { id: 'steth', label: 'A stethoscope', emoji: '🩺' },
        { id: 'scope', label: 'A telescope', emoji: '🔭' },
        { id: 'ruler', label: 'A ruler', emoji: '📏' },
      ],
      answerId: 'steth',
      explain: 'A stethoscope carries the lub-dub sound right to the doctor’s ears.',
    },
    {
      id: 'hh-beat-lub',
      bands: SENIOR,
      prompt: 'What causes the “lub” sound?',
      choices: [
        { id: 'av', label: 'The tricuspid and mitral valves closing' },
        { id: 'sl', label: 'The aortic and pulmonary valves closing' },
        { id: 'ribs', label: 'Blood hitting the ribs' },
        { id: 'air', label: 'Air rushing into the lungs' },
      ],
      answerId: 'av',
      explain: '“Lub” = the tricuspid and mitral valves snapping shut as the ventricles start to squeeze. “Dub” = the aortic and pulmonary valves closing.',
    },
    {
      id: 'hh-beat-sa',
      bands: SENIOR,
      prompt: 'What is the heart’s natural pacemaker?',
      choices: [
        { id: 'sa', label: 'The SA node' },
        { id: 'aorta', label: 'The aorta' },
        { id: 'mitral', label: 'The mitral valve' },
        { id: 'lv', label: 'The left ventricle' },
      ],
      answerId: 'sa',
      explain: 'The sinoatrial (SA) node, a patch of special cells in the right atrium, fires the electrical spark that starts every beat.',
    },
    {
      id: 'hh-beat-first',
      bands: SENIOR,
      prompt: 'Which chambers contract first in each heartbeat?',
      choices: [
        { id: 'atria', label: 'The atria' },
        { id: 'ventricles', label: 'The ventricles' },
        { id: 'same', label: 'All four at exactly the same moment' },
        { id: 'left', label: 'Only the left side' },
      ],
      answerId: 'atria',
      explain: 'The atria squeeze first to top up the ventricles; the signal then pauses briefly at the AV node before the ventricles contract.',
    },
    {
      id: 'hh-beat-qrs',
      bands: SENIOR,
      prompt: 'On an ECG, what does the tall QRS spike show?',
      choices: [
        { id: 'vent', label: 'The electrical signal that makes the ventricles squeeze' },
        { id: 'atria', label: 'The atria relaxing' },
        { id: 'valves', label: 'The sound of the valves' },
        { id: 'breath', label: 'Breathing in' },
      ],
      answerId: 'vent',
      explain: 'The QRS complex is the ventricles being electrically triggered — the big muscles make the biggest spike.',
    },
    {
      id: 'hh-beat-litres',
      bands: SENIOR,
      prompt: 'At rest, about how much blood does an adult heart pump in one day?',
      choices: [
        { id: '7000', label: 'About 7,000 litres' },
        { id: '70', label: 'About 70 litres' },
        { id: '7', label: 'About 7 litres' },
        { id: '700k', label: 'About 700,000 litres' },
      ],
      answerId: '7000',
      explain: 'About 5 litres a minute × 1,440 minutes ≈ 7,200 litres — roughly 7,000 litres a day, even while you rest.',
    },
    {
      id: 'hh-beat-exercise',
      bands: SENIOR,
      prompt: 'Why does your heart rate rise when you exercise?',
      choices: [
        { id: 'oxygen', label: 'Working muscles need more oxygen' },
        { id: 'thick', label: 'Your blood gets thicker' },
        { id: 'tired', label: 'The heart is getting tired' },
        { id: 'cool', label: 'To cool down the lungs' },
      ],
      answerId: 'oxygen',
      explain: 'Busy muscles burn more fuel, so they need more oxygen-rich blood — the heart speeds up to deliver it.',
    },
  ],
};
