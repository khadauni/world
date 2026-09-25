import type { WorldStop } from '@/core/types';

export const sun: WorldStop = {
  id: 'sun',
  title: 'The Sun',
  emoji: '☀️',
  color: '#FFB23F',
  narration: {
    tiny: ['Wow! The big, bright Sun! ☀️', 'The Sun is SO hot. Hot, hot, hot! 🔥', 'It gives us light and keeps us warm. 🤗'],
    junior: [
      'Here is the Sun, {name} — the star at the centre of our Solar System!',
      'The Sun is a giant ball of super-hot, glowing gas.',
      'Its light and warmth make life on Earth possible.',
    ],
    senior: [
      'The Sun is a star: a huge sphere of hot plasma, mostly hydrogen and helium.',
      'In its core, nuclear fusion squeezes hydrogen into helium and releases enormous amounts of energy.',
      'Its gravity holds the whole Solar System together, from Mercury out to distant comets.',
    ],
  },
  facts: {
    tiny: ['The Sun is a star! ⭐', 'Never look right at the Sun! 🙈'],
    junior: [
      'About 109 Earths could line up across the Sun!',
      'Sunlight takes about 8 minutes to reach Earth.',
      'Never look straight at the Sun — it can hurt your eyes.',
    ],
    senior: [
      'The Sun is about 109 times wider than Earth and holds about 99.8% of all the mass in the Solar System.',
      'Sunlight takes about 8 minutes 20 seconds to travel the roughly 150 million km to Earth.',
      'Its visible surface is about 5,500 °C, but its core reaches about 15 million °C.',
    ],
  },
  task: {
    kind: 'collect-sparks',
    instruction: { tiny: 'Tap the sparkly sun sparks! ✨', junior: 'Catch the glowing solar sparks!', senior: 'Collect every solar spark orbiting the Sun.' },
    hint: {
      tiny: 'Tap the shiny twinkles! ✨',
      junior: 'Look for the little glowing lights going around the Sun.',
      senior: 'The sparks circle the Sun — tap each one as it passes.',
    },
  },
  quiz: [
    {
      id: 'ss-sun-star',
      bands: ['tiny', 'junior'],
      prompt: { tiny: 'Which one is a star?', junior: 'Which of these is a star?', senior: 'Which of these is a star?' },
      choices: [
        { id: 'sun', label: 'The Sun', emoji: '☀️' },
        { id: 'moon', label: 'The Moon', emoji: '🌙' },
        { id: 'earth', label: 'Earth', emoji: '🌍' },
      ],
      answerId: 'sun',
      explain: {
        tiny: 'Yes! The Sun is a star! ⭐',
        junior: 'The Sun is a star — the closest star to Earth!',
        senior: 'The Sun is a star — the closest one to Earth. The next nearest is more than 4 light-years away.',
      },
    },
    {
      id: 'ss-sun-hot',
      bands: ['tiny'],
      prompt: 'Is the Sun hot or cold?',
      choices: [
        { id: 'hot', label: 'Hot!', emoji: '🔥' },
        { id: 'cold', label: 'Cold!', emoji: '🧊' },
      ],
      answerId: 'hot',
      explain: { tiny: 'The Sun is super hot! 🔥', junior: 'The Sun is super hot!', senior: 'The Sun is extremely hot — about 5,500 °C at its surface.' },
    },
    {
      id: 'ss-sun-light',
      bands: ['junior', 'senior'],
      prompt: 'About how long does sunlight take to reach Earth?',
      choices: [
        { id: '8min', label: 'About 8 minutes', emoji: '⏱️' },
        { id: '1s', label: 'About 1 second', emoji: '⚡' },
        { id: '1day', label: 'About 1 day', emoji: '📅' },
      ],
      answerId: '8min',
      explain: {
        tiny: 'About 8 minutes!',
        junior: 'About 8 minutes! Light is super fast, but the Sun is very far away.',
        senior: 'About 8 minutes 20 seconds: light covers about 300,000 km every second, and the Sun is about 150 million km away.',
      },
    },
    {
      id: 'ss-sun-width',
      bands: ['junior', 'senior'],
      prompt: 'About how many Earths could line up across the Sun?',
      choices: [
        { id: '109', label: 'About 109' },
        { id: '10', label: 'About 10' },
        { id: '2', label: 'About 2' },
      ],
      answerId: '109',
      explain: {
        tiny: 'About 109 Earths!',
        junior: 'About 109 Earths could line up across the Sun. It is enormous!',
        senior: 'About 109 — and by volume, around 1.3 million Earths could fit inside the Sun.',
      },
    },
    {
      id: 'ss-sun-fusion',
      bands: ['senior'],
      prompt: 'What powers the Sun?',
      choices: [
        { id: 'fusion', label: 'Nuclear fusion of hydrogen into helium' },
        { id: 'burning', label: 'Burning, like a giant campfire' },
        { id: 'lightning', label: 'Giant lightning storms' },
        { id: 'magnets', label: 'Spinning magnets' },
      ],
      answerId: 'fusion',
      explain: {
        tiny: 'Fusion makes the Sun shine!',
        junior: 'Fusion! Tiny bits of hydrogen join together and give off lots of energy.',
        senior: 'Fusion: in the core, hydrogen nuclei join to make helium, turning a little mass into a lot of energy (E = mc²). It is not burning — there is no fire.',
      },
    },
    {
      id: 'ss-sun-mass',
      bands: ['senior'],
      prompt: "Roughly how much of the Solar System's mass is in the Sun?",
      choices: [
        { id: '99', label: 'About 99.8%' },
        { id: '75', label: 'About 75%' },
        { id: '50', label: 'About 50%' },
        { id: '10', label: 'About 10%' },
      ],
      answerId: '99',
      explain: {
        tiny: 'Almost all of it!',
        junior: 'Almost all of it! The Sun is by far the heaviest thing in the Solar System.',
        senior: 'About 99.8%. Everything else — planets, moons, asteroids, comets — adds up to only about 0.2%, and most of that is Jupiter.',
      },
    },
  ],
};
