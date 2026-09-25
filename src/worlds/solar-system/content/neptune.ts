import type { WorldStop } from '@/core/types';

export const neptune: WorldStop = {
  id: 'neptune',
  title: 'Neptune',
  emoji: '💨',
  color: '#4C7BFF',
  narration: {
    tiny: ['Hello, Neptune! So blue! 💙', 'Neptune is super windy! Whoosh! 💨', 'It is the farthest planet from the Sun. 🔭'],
    junior: [
      'Neptune is the farthest planet from the Sun.',
      'It has the fastest winds in the Solar System — far faster than any storm on Earth!',
      'Neptune is a blue ice giant, and it is very dark and cold out here.',
    ],
    senior: [
      'Neptune is the eighth and farthest planet — about 30 times farther from the Sun than Earth is.',
      'It has the fastest winds measured in the Solar System: around 2,000 km/h.',
      'When Voyager 2 flew past in 1989, it spotted a huge storm called the Great Dark Spot.',
    ],
  },
  facts: {
    tiny: ['Neptune is very, very far away! 🔭', 'Neptune has thin rings too! 💍'],
    junior: [
      'One trip around the Sun takes Neptune about 165 Earth years!',
      'Neptune was the first planet found by using maths to work out where it should be.',
      'Neptune’s biggest moon, Triton, orbits backwards.',
    ],
    senior: [
      'Neptune takes about 165 Earth years to orbit the Sun — it finished its first orbit since its discovery in 2011.',
      'It was found in 1846, after mathematicians predicted its position from tiny tugs on Uranus’s orbit.',
      'Beyond Neptune lies the Kuiper Belt, home of Pluto, which was reclassified as a dwarf planet in 2006.',
    ],
  },
  task: {
    kind: 'catch-winds',
    instruction: { tiny: 'Catch the zooming clouds! 💨', junior: 'Catch the speedy wind clouds!', senior: 'Catch the high-speed cloud streaks racing around Neptune.' },
    hint: {
      tiny: 'Tap a white cloud! ☁️',
      junior: 'Tap the white clouds as they whizz past.',
      senior: 'Aim a little ahead of each cloud — they move fast!',
    },
  },
  quiz: [
    {
      id: 'ss-neptune-colour',
      bands: ['tiny'],
      prompt: 'What colour is Neptune?',
      choices: [
        { id: 'blue', label: 'Blue', emoji: '🔵', color: '#3D6BFF' },
        { id: 'red', label: 'Red', emoji: '🔴', color: '#E0603A' },
        { id: 'yellow', label: 'Yellow', emoji: '🟡', color: '#FFD23F' },
      ],
      answerId: 'blue',
      explain: { tiny: 'Neptune is blue! 💙', junior: 'Neptune is blue!', senior: 'Blue: methane in its atmosphere absorbs red light.' },
    },
    {
      id: 'ss-neptune-windy',
      bands: ['tiny'],
      prompt: 'What is Neptune like?',
      choices: [
        { id: 'windy', label: 'Super windy', emoji: '💨' },
        { id: 'sunny', label: 'Hot and sunny', emoji: '😎' },
      ],
      answerId: 'windy',
      explain: { tiny: 'Super windy! Whoosh! 💨', junior: 'Super windy!', senior: 'Extremely windy — the fastest winds of any planet.' },
    },
    {
      id: 'ss-neptune-fastest',
      bands: ['junior', 'senior'],
      prompt: 'Which planet has the fastest winds?',
      choices: [
        { id: 'neptune', label: 'Neptune', emoji: '💨' },
        { id: 'earth', label: 'Earth', emoji: '🌍' },
        { id: 'mars', label: 'Mars', emoji: '🔴' },
      ],
      answerId: 'neptune',
      explain: {
        tiny: 'Neptune!',
        junior: 'Neptune! Its winds are much faster than the strongest hurricanes on Earth.',
        senior: 'Neptune — around 2,000 km/h, faster than the speed of sound on Earth.',
      },
    },
    {
      id: 'ss-neptune-farthest',
      bands: ['junior'],
      prompt: 'Which planet is farthest from the Sun?',
      choices: [
        { id: 'neptune', label: 'Neptune', emoji: '💨' },
        { id: 'saturn', label: 'Saturn', emoji: '🪐' },
        { id: 'mercury', label: 'Mercury', emoji: '🪨' },
      ],
      answerId: 'neptune',
      explain: {
        tiny: 'Neptune!',
        junior: 'Neptune is the eighth and farthest planet.',
        senior: 'Neptune, about 4.5 billion km from the Sun.',
      },
    },
    {
      id: 'ss-neptune-year',
      bands: ['junior', 'senior'],
      prompt: 'How long is one year on Neptune?',
      choices: [
        { id: '165', label: 'About 165 Earth years' },
        { id: '1', label: 'About 1 Earth year' },
        { id: '12', label: 'About 12 Earth years' },
      ],
      answerId: '165',
      explain: {
        tiny: 'A very long time!',
        junior: 'About 165 Earth years — longer than any person has ever lived!',
        senior: 'About 165 Earth years: it is so far away that its orbit is huge, and it moves slowly.',
      },
    },
    {
      id: 'ss-neptune-found',
      bands: ['senior'],
      prompt: 'How was Neptune discovered in 1846?',
      choices: [
        { id: 'maths', label: 'Maths predicted where it was, from tugs on Uranus' },
        { id: 'rover', label: 'A space probe landed on it' },
        { id: 'eye', label: 'Someone spotted it without a telescope' },
        { id: 'radio', label: 'It sent out radio signals' },
      ],
      answerId: 'maths',
      explain: {
        tiny: 'With maths!',
        junior: 'With maths! Scientists worked out where it must be.',
        senior: 'Uranus was not moving quite as predicted. Mathematicians calculated where an unseen planet must be pulling it — and astronomers found Neptune there.',
      },
    },
    {
      id: 'ss-neptune-pluto',
      bands: ['senior'],
      prompt: 'What kind of object is Pluto, out beyond Neptune?',
      choices: [
        { id: 'dwarf', label: 'A dwarf planet' },
        { id: 'star', label: 'A star' },
        { id: 'moon', label: 'One of Neptune’s moons' },
        { id: 'comet', label: 'A comet' },
      ],
      answerId: 'dwarf',
      explain: {
        tiny: 'A little dwarf planet!',
        junior: 'Pluto is a dwarf planet.',
        senior: 'A dwarf planet in the Kuiper Belt — reclassified in 2006 because it has not cleared its orbit of other objects.',
      },
    },
  ],
};
