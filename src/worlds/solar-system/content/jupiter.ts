import type { WorldStop } from '@/core/types';

export const jupiter: WorldStop = {
  id: 'jupiter',
  title: 'Jupiter',
  emoji: '🟠',
  color: '#E0A060',
  narration: {
    tiny: ['WOW! Jupiter is SO big! 🤩', 'It has pretty stripes! 🟠⚪🟤', 'See the big red spot? It’s a giant storm! 🌀'],
    junior: [
      'Meet Jupiter — the biggest planet in our Solar System!',
      'Jupiter is a gas giant: no ground to stand on, just swirling clouds.',
      'That Great Red Spot is a giant storm — it is wider than the whole Earth!',
    ],
    senior: [
      'Jupiter is the largest planet: more than 1,300 Earths could fit inside it.',
      'It is a gas giant, mostly hydrogen and helium, striped by bands of cloud blown by winds in opposite directions.',
      'The Great Red Spot is a storm wider than Earth that has been raging for at least 150 years.',
    ],
  },
  facts: {
    tiny: ['Jupiter has lots and lots of moons! 🌙🌙🌙', 'Jupiter spins super fast! 🌀'],
    junior: [
      'Jupiter has more than 90 moons!',
      'A day on Jupiter is only about 10 hours long.',
      'Jupiter’s four biggest moons are Io, Europa, Ganymede and Callisto.',
    ],
    senior: [
      'Jupiter spins faster than any other planet: one day lasts only about 10 hours.',
      'Galileo discovered its four large moons in 1610. One of them, Ganymede, is the biggest moon in the Solar System — even bigger than Mercury!',
      'Jupiter has more than 90 known moons, and astronomers keep finding more.',
    ],
  },
  task: {
    kind: 'jupiter-moons',
    instruction: {
      tiny: 'Tap the big red spot! 🔴',
      junior: 'Find 2 of Jupiter’s moons!',
      senior: 'Find the 4 Galilean moons in order from Jupiter: Io, Europa, Ganymede, Callisto.',
    },
    hint: {
      tiny: 'It looks like a big red eye! 👁️',
      junior: 'The moons are the little balls going around Jupiter.',
      senior: 'Io is the closest (yellow and volcanic); Callisto is the farthest (dark and covered in craters).',
    },
  },
  quiz: [
    {
      id: 'ss-jupiter-biggest-tiny',
      bands: ['tiny'],
      prompt: 'Which planet is the BIGGEST?',
      choices: [
        { id: 'jupiter', label: 'Jupiter', emoji: '🟠' },
        { id: 'mars', label: 'Mars', emoji: '🔴' },
        { id: 'mercury', label: 'Mercury', emoji: '🪨' },
      ],
      answerId: 'jupiter',
      explain: { tiny: 'Jupiter is the biggest! 🤩', junior: 'Jupiter is the biggest planet!', senior: 'Jupiter is the largest planet.' },
    },
    {
      id: 'ss-jupiter-spot',
      bands: ['tiny', 'junior'],
      prompt: { tiny: 'What is the big red spot?', junior: 'What is the Great Red Spot?', senior: 'What is the Great Red Spot?' },
      choices: [
        { id: 'storm', label: 'A giant storm', emoji: '🌀' },
        { id: 'apple', label: 'A giant apple', emoji: '🍎' },
        { id: 'volcano', label: 'A volcano', emoji: '🌋' },
      ],
      answerId: 'storm',
      explain: {
        tiny: 'A giant storm! Whoosh! 🌀',
        junior: 'A giant storm — wider than the whole Earth!',
        senior: 'A giant, long-lived storm (an anticyclone) wider than Earth.',
      },
    },
    {
      id: 'ss-jupiter-gas',
      bands: ['junior', 'senior'],
      prompt: 'What is Jupiter mostly made of?',
      choices: [
        { id: 'gas', label: 'Gas (hydrogen and helium)', emoji: '💨' },
        { id: 'rock', label: 'Rock', emoji: '🪨' },
        { id: 'ice', label: 'Ice', emoji: '🧊' },
      ],
      answerId: 'gas',
      explain: {
        tiny: 'Gas!',
        junior: 'Gas! Jupiter is a gas giant — there is nowhere to land.',
        senior: 'Mostly hydrogen and helium, like the Sun. Deep inside, the pressure squeezes hydrogen into a liquid.',
      },
    },
    {
      id: 'ss-jupiter-moons',
      bands: ['junior', 'senior'],
      prompt: 'About how many moons does Jupiter have?',
      choices: [
        { id: '90', label: 'More than 90' },
        { id: '1', label: 'Just 1' },
        { id: '0', label: 'None' },
      ],
      answerId: '90',
      explain: {
        tiny: 'Lots of moons!',
        junior: 'More than 90 moons — and scientists keep finding more!',
        senior: 'More than 90 known moons. Most are small; the four Galilean moons are the giants.',
      },
    },
    {
      id: 'ss-jupiter-ganymede',
      bands: ['senior'],
      prompt: 'Which is the largest moon in the Solar System?',
      choices: [
        { id: 'ganymede', label: 'Ganymede' },
        { id: 'moon', label: 'Earth’s Moon' },
        { id: 'io', label: 'Io' },
        { id: 'phobos', label: 'Phobos' },
      ],
      answerId: 'ganymede',
      explain: {
        tiny: 'Ganymede!',
        junior: 'Ganymede — it is even bigger than the planet Mercury!',
        senior: 'Ganymede, about 5,270 km across — bigger than the planet Mercury. Saturn’s moon Titan is a close second.',
      },
    },
    {
      id: 'ss-jupiter-fit',
      bands: ['senior'],
      prompt: 'Roughly how many Earths could fit inside Jupiter?',
      choices: [
        { id: '1300', label: 'More than 1,300' },
        { id: '11', label: 'About 11' },
        { id: '100', label: 'About 100' },
        { id: '1m', label: 'About 1 million' },
      ],
      answerId: '1300',
      explain: {
        tiny: 'Lots and lots!',
        junior: 'More than 1,300 Earths!',
        senior: 'More than 1,300 by volume. About 11 Earths would line up across Jupiter — and around a million would fit inside the Sun.',
      },
    },
  ],
};
