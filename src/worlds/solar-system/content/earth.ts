import type { WorldStop } from '@/core/types';

export const earth: WorldStop = {
  id: 'earth',
  title: 'Earth',
  emoji: '🌍',
  color: '#3FA7F5',
  narration: {
    tiny: ['Look! It’s Earth — our home! 🏡', 'Blue is water. Green is land. 💙💚', 'Wave hello to the Moon! 🌙👋'],
    junior: [
      'Welcome home, {name}! This is Earth, the third planet from the Sun.',
      'Most of Earth is covered by water — that is why it looks so blue.',
      'Earth has one Moon, and it goes around us about once a month.',
    ],
    senior: [
      'Earth is the third planet from the Sun and the only place we know of with life.',
      'It orbits in the “Goldilocks zone” — not too hot, not too cold — so water can stay liquid on the surface.',
      'Its atmosphere and magnetic field shield life from harmful radiation from space.',
    ],
  },
  facts: {
    tiny: ['Earth is the only planet with living things! 🐶🌳', 'The Moon goes round and round Earth. 🌙'],
    junior: [
      'About 71% of Earth is covered in water.',
      'Earth is the only planet we know of with life.',
      'Earth takes about 365 days — one year — to go around the Sun.',
    ],
    senior: [
      'About 71% of Earth’s surface is water, and most of it is salty ocean.',
      'Earth spins once about every 24 hours and orbits the Sun in about 365¼ days — that extra quarter day is why we have leap years.',
      'The Moon is about 384,000 km away — roughly 30 Earths lined up in a row.',
    ],
  },
  task: {
    kind: 'find-things',
    instruction: { tiny: 'Find the Moon! Tap it! 🌙', junior: 'Find the Moon and a satellite!', senior: 'Find the Moon, a satellite and a hurricane.' },
    hint: {
      tiny: 'The Moon is round and grey! 🌙',
      junior: 'The satellite has shiny blue solar panels.',
      senior: 'Hurricanes are giant spinning storms — look for a white swirl over the ocean.',
    },
  },
  quiz: [
    {
      id: 'ss-earth-home',
      bands: ['tiny'],
      prompt: 'Which one is our home?',
      choices: [
        { id: 'earth', label: 'Earth', emoji: '🌍' },
        { id: 'sun', label: 'The Sun', emoji: '☀️' },
        { id: 'moon', label: 'The Moon', emoji: '🌙' },
      ],
      answerId: 'earth',
      explain: { tiny: 'Earth is our home! 🏡', junior: 'Earth is our home planet!', senior: 'Earth — the only planet known to have life.' },
    },
    {
      id: 'ss-earth-blue',
      bands: ['tiny', 'junior'],
      prompt: { tiny: 'What makes Earth blue?', junior: 'What makes Earth look blue from space?', senior: 'What makes Earth look blue from space?' },
      choices: [
        { id: 'water', label: 'Water', emoji: '🌊' },
        { id: 'paint', label: 'Paint', emoji: '🎨' },
        { id: 'berries', label: 'Blueberries', emoji: '🫐' },
      ],
      answerId: 'water',
      explain: {
        tiny: 'Water! Lots and lots of water! 🌊',
        junior: 'Oceans! About 71% of Earth is covered in water.',
        senior: 'Oceans cover about 71% of the surface, and the air scatters blue light too.',
      },
    },
    {
      id: 'ss-earth-moons',
      bands: ['junior', 'senior'],
      prompt: 'How many moons does Earth have?',
      choices: [
        { id: '1', label: 'One', emoji: '1️⃣' },
        { id: '2', label: 'Two', emoji: '2️⃣' },
        { id: '0', label: 'None', emoji: '0️⃣' },
      ],
      answerId: '1',
      explain: {
        tiny: 'One Moon!',
        junior: 'Just one — we simply call it the Moon!',
        senior: 'One natural satellite, the Moon — plus thousands of artificial satellites that people have launched.',
      },
    },
    {
      id: 'ss-earth-year',
      bands: ['junior', 'senior'],
      prompt: 'How long does Earth take to go around the Sun?',
      choices: [
        { id: 'year', label: 'About 365 days' },
        { id: 'day', label: 'About 1 day' },
        { id: 'month', label: 'About 30 days' },
      ],
      answerId: 'year',
      explain: {
        tiny: 'One whole year!',
        junior: 'About 365 days — that is one year!',
        senior: 'About 365¼ days. One spin on its axis takes about a day; one lap of the Sun takes a year.',
      },
    },
    {
      id: 'ss-earth-water',
      bands: ['senior'],
      prompt: 'Why can liquid water exist on Earth’s surface?',
      choices: [
        { id: 'distance', label: 'It orbits at just the right distance from the Sun' },
        { id: 'closest', label: 'It is the closest planet to the Sun' },
        { id: 'rings', label: 'Its rings store the water' },
        { id: 'moon', label: 'The Moon makes the water' },
      ],
      answerId: 'distance',
      explain: {
        tiny: 'Not too hot, not too cold!',
        junior: 'Earth is not too hot and not too cold — just right!',
        senior: 'Earth is in the habitable (“Goldilocks”) zone, and its atmosphere keeps temperatures and pressure right for liquid water.',
      },
    },
    {
      id: 'ss-earth-moondist',
      bands: ['senior'],
      prompt: 'Roughly how far away is the Moon?',
      choices: [
        { id: '384k', label: 'About 384,000 km' },
        { id: '3800', label: 'About 3,800 km' },
        { id: '38m', label: 'About 38 million km' },
        { id: '150m', label: 'About 150 million km' },
      ],
      answerId: '384k',
      explain: {
        tiny: 'Very far away!',
        junior: 'About 384,000 km!',
        senior: 'About 384,000 km — light takes just over 1 second to get there. (150 million km is the distance to the Sun.)',
      },
    },
  ],
};
