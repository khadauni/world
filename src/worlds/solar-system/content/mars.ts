import type { WorldStop } from '@/core/types';

export const mars: WorldStop = {
  id: 'mars',
  title: 'Mars',
  emoji: '🔴',
  color: '#E0603A',
  narration: {
    tiny: ['Hello, Mars! The red planet! 🔴', 'Mars is dusty and rusty. 🏜️', 'Robot rovers drive around here! 🤖'],
    junior: [
      'This is Mars, the Red Planet!',
      'Mars is red because its dust has rust in it — just like an old bike.',
      'Robot rovers drive around Mars looking for clues about its past.',
    ],
    senior: [
      'Mars looks red because its dusty soil is rich in iron oxide — rust.',
      'It has the tallest volcano in the Solar System, Olympus Mons: about 22 km high, roughly 2.5 times the height of Mount Everest.',
      'Dried-up river valleys show that liquid water once flowed here, so rovers search the rocks for signs of ancient life.',
    ],
  },
  facts: {
    tiny: ['Mars has two tiny moons! 🌑🌑', 'Mars has giant dust storms! 🌪️'],
    junior: [
      'Mars has two little moons called Phobos and Deimos.',
      'Mars has the tallest volcano we know of — Olympus Mons.',
      'A day on Mars is only a little longer than a day on Earth.',
    ],
    senior: [
      'Mars has two small, lumpy moons, Phobos and Deimos — they may be captured asteroids.',
      'A Martian day, called a sol, lasts about 24 hours 40 minutes.',
      'Mars is about half as wide as Earth, and its gravity is only about 38% of Earth’s.',
    ],
  },
  task: {
    kind: 'collect-samples',
    instruction: {
      tiny: 'Tap the rocks! The rover will get them! 🤖',
      junior: 'Tap the rock samples — the rover will drive to each one!',
      senior: 'Direct the rover: tap each rock sample to collect it for analysis.',
    },
    hint: {
      tiny: 'Tap a sparkly rock! ✨',
      junior: 'Look for the rocks with sparkles on them.',
      senior: 'Rovers like Perseverance drill rock cores and store them, looking for signs of ancient microbes.',
    },
  },
  quiz: [
    {
      id: 'ss-mars-colour',
      bands: ['tiny'],
      prompt: 'What colour is Mars?',
      choices: [
        { id: 'red', label: 'Red', emoji: '🔴', color: '#E0603A' },
        { id: 'blue', label: 'Blue', emoji: '🔵', color: '#3D6BFF' },
        { id: 'green', label: 'Green', emoji: '🟢', color: '#3CCB7F' },
      ],
      answerId: 'red',
      explain: { tiny: 'Mars is red! 🔴', junior: 'Mars is red — the Red Planet!', senior: 'Red, from iron oxide (rust) in its dust.' },
    },
    {
      id: 'ss-mars-rover',
      bands: ['tiny'],
      prompt: 'Who drives around on Mars?',
      choices: [
        { id: 'rover', label: 'A robot rover', emoji: '🤖' },
        { id: 'cow', label: 'A cow', emoji: '🐄' },
        { id: 'bus', label: 'A bus', emoji: '🚌' },
      ],
      answerId: 'rover',
      explain: { tiny: 'Robot rovers drive on Mars! 🤖', junior: 'Robot rovers explore Mars for us.', senior: 'Robotic rovers such as Curiosity and Perseverance explore Mars.' },
    },
    {
      id: 'ss-mars-why-red',
      bands: ['junior', 'senior'],
      prompt: 'Why is Mars red?',
      choices: [
        { id: 'rust', label: 'Rusty dust (iron oxide)' },
        { id: 'paint', label: 'Red paint' },
        { id: 'lava', label: 'Hot lava everywhere' },
      ],
      answerId: 'rust',
      explain: {
        tiny: 'Rusty dust!',
        junior: 'Its dust has rust in it — iron that reacted with oxygen.',
        senior: 'Iron oxide (rust) in the dust and rocks absorbs blue light and reflects red, giving Mars its colour.',
      },
    },
    {
      id: 'ss-mars-moons',
      bands: ['junior', 'senior'],
      prompt: 'How many moons does Mars have?',
      choices: [
        { id: '2', label: 'Two' },
        { id: '1', label: 'One' },
        { id: '0', label: 'None' },
      ],
      answerId: '2',
      explain: {
        tiny: 'Two moons!',
        junior: 'Two: Phobos and Deimos.',
        senior: 'Two small moons, Phobos and Deimos — only about 22 km and 12 km across.',
      },
    },
    {
      id: 'ss-mars-olympus',
      bands: ['junior', 'senior'],
      prompt: 'What is Olympus Mons?',
      choices: [
        { id: 'volcano', label: 'The tallest volcano we know of', emoji: '🌋' },
        { id: 'ocean', label: 'A big ocean', emoji: '🌊' },
        { id: 'moon', label: 'A moon of Mars', emoji: '🌑' },
      ],
      answerId: 'volcano',
      explain: {
        tiny: 'A giant volcano!',
        junior: 'A giant volcano — the tallest one we know of in the Solar System!',
        senior: 'A giant shield volcano: about 22 km high and about 600 km wide across its base.',
      },
    },
    {
      id: 'ss-mars-height',
      bands: ['senior'],
      prompt: 'About how tall is Olympus Mons?',
      choices: [
        { id: '22', label: 'About 22 km' },
        { id: '9', label: 'About 9 km, the same as Everest' },
        { id: '100', label: 'About 100 km' },
        { id: '2', label: 'About 2 km' },
      ],
      answerId: '22',
      explain: {
        tiny: 'Very, very tall!',
        junior: 'About 22 km — way taller than Mount Everest!',
        senior: 'About 22 km — roughly 2.5 times Everest’s 8.8 km. Low gravity and no moving plates let it grow so big.',
      },
    },
  ],
};
