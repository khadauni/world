import type { WorldStop } from '@/core/types';

export const saturn: WorldStop = {
  id: 'saturn',
  title: 'Saturn',
  emoji: '🪐',
  color: '#E8C98A',
  narration: {
    tiny: ['Ooh, Saturn! Look at its rings! 💍', 'The rings are made of ice and rock. 🧊', 'So pretty and sparkly! ✨'],
    junior: [
      'Here is Saturn — famous for its beautiful rings!',
      'The rings are made of billions of chunks of ice and rock.',
      'Saturn is the second-biggest planet, after Jupiter.',
    ],
    senior: [
      'Saturn is the second-largest planet: a gas giant made mostly of hydrogen and helium.',
      'Its main rings are about 270,000 km across, yet mostly only about 10 metres thick.',
      'The rings are mostly water ice, in pieces from tiny grains to chunks as big as a house.',
    ],
  },
  facts: {
    tiny: ['Saturn could float in a giant bathtub! 🛁', 'Saturn has lots and lots of moons! 🌙'],
    junior: [
      'Saturn is so light for its size that it could float in a giant bathtub of water!',
      'Saturn has more moons than any other planet — well over 100!',
      'One year on Saturn lasts about 29 Earth years.',
    ],
    senior: [
      'Saturn’s average density is lower than water’s — in a big enough bathtub, it would float.',
      'Its largest moon, Titan, has a thick atmosphere and lakes of liquid methane.',
      'Saturn has the most known moons of any planet — well over 100 — and the count keeps growing.',
    ],
  },
  task: {
    kind: 'collect-ice',
    instruction: { tiny: 'Tap the shiny ice! 🧊', junior: 'Collect the ice chunks in the rings!', senior: 'Collect the sparkling ice chunks orbiting in the rings.' },
    hint: {
      tiny: 'Tap the sparkly blue ice! ✨',
      junior: 'Look for the twinkly ice bits in the rings.',
      senior: 'Ring particles orbit Saturn like tiny moons — tap the glinting ones.',
    },
  },
  quiz: [
    {
      id: 'ss-saturn-rings',
      bands: ['tiny'],
      prompt: 'Which planet has big, bright rings?',
      choices: [
        { id: 'saturn', label: 'Saturn', emoji: '🪐' },
        { id: 'earth', label: 'Earth', emoji: '🌍' },
        { id: 'mars', label: 'Mars', emoji: '🔴' },
      ],
      answerId: 'saturn',
      explain: {
        tiny: 'Saturn has beautiful rings! 🪐',
        junior: 'Saturn! Its rings are the biggest and brightest.',
        senior: 'Saturn. Jupiter, Uranus and Neptune have rings too, but they are thin and faint.',
      },
    },
    {
      id: 'ss-saturn-ice',
      bands: ['tiny', 'junior'],
      prompt: { tiny: 'What are the rings made of?', junior: 'What are Saturn’s rings made of?', senior: 'What are Saturn’s rings made of?' },
      choices: [
        { id: 'ice', label: 'Ice and rock', emoji: '🧊' },
        { id: 'candy', label: 'Candy', emoji: '🍬' },
        { id: 'gold', label: 'Gold', emoji: '🥇' },
      ],
      answerId: 'ice',
      explain: {
        tiny: 'Ice and rock! Brrr! 🧊',
        junior: 'Billions of chunks of ice and rock, all going around Saturn.',
        senior: 'Mostly water ice, with a little rock and dust.',
      },
    },
    {
      id: 'ss-saturn-float',
      bands: ['junior', 'senior'],
      prompt: 'What would Saturn do in a giant bathtub of water?',
      choices: [
        { id: 'float', label: 'Float', emoji: '🛁' },
        { id: 'sink', label: 'Sink', emoji: '⬇️' },
        { id: 'melt', label: 'Melt', emoji: '🫠' },
      ],
      answerId: 'float',
      explain: {
        tiny: 'It would float!',
        junior: 'It would float! Saturn is huge but very light for its size.',
        senior: 'Float — its average density is only about 0.7 g/cm³, less than water’s 1 g/cm³.',
      },
    },
    {
      id: 'ss-saturn-second',
      bands: ['junior', 'senior'],
      prompt: 'Which planet is the second biggest?',
      choices: [
        { id: 'saturn', label: 'Saturn', emoji: '🪐' },
        { id: 'earth', label: 'Earth', emoji: '🌍' },
        { id: 'uranus', label: 'Uranus', emoji: '🧊' },
      ],
      answerId: 'saturn',
      explain: {
        tiny: 'Saturn!',
        junior: 'Saturn! Only Jupiter is bigger.',
        senior: 'Saturn, about 9 times wider than Earth. Only Jupiter is larger.',
      },
    },
    {
      id: 'ss-saturn-thick',
      bands: ['senior'],
      prompt: 'How thick are most parts of Saturn’s main rings?',
      choices: [
        { id: '10m', label: 'About 10 metres' },
        { id: '10km', label: 'About 10 km' },
        { id: '1000km', label: 'About 1,000 km' },
        { id: '100000km', label: 'About 100,000 km' },
      ],
      answerId: '10m',
      explain: {
        tiny: 'Very thin!',
        junior: 'Only about 10 metres — very thin!',
        senior: 'Mostly about 10 metres — for rings about 270,000 km across, that is far thinner, for its size, than a sheet of paper.',
      },
    },
    {
      id: 'ss-saturn-titan',
      bands: ['senior'],
      prompt: 'Which of Saturn’s moons has lakes of liquid methane?',
      choices: [
        { id: 'titan', label: 'Titan' },
        { id: 'europa', label: 'Europa' },
        { id: 'phobos', label: 'Phobos' },
        { id: 'io', label: 'Io' },
      ],
      answerId: 'titan',
      explain: {
        tiny: 'Titan!',
        junior: 'Titan, Saturn’s biggest moon.',
        senior: 'Titan. It is so cold there (about −180 °C) that methane and ethane are liquid and fill lakes and seas.',
      },
    },
  ],
};
