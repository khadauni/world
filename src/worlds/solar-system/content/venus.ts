import type { WorldStop } from '@/core/types';

export const venus: WorldStop = {
  id: 'venus',
  title: 'Venus',
  emoji: '🌋',
  color: '#F2C66D',
  narration: {
    tiny: ['Say hello to Venus! 👋', 'Venus is the hottest planet. Phew! 🥵', 'Thick yellow clouds cover it up. ☁️'],
    junior: [
      'This is Venus — the hottest planet of all!',
      'Thick clouds trap the heat like a giant, fluffy blanket.',
      'Venus is almost the same size as Earth, so people call it Earth’s twin.',
    ],
    senior: [
      'Venus is the hottest planet: about 465 °C at the surface — hot enough to melt lead.',
      'Its thick carbon dioxide atmosphere traps heat in a runaway greenhouse effect.',
      'Clouds of sulfuric acid hide a surface covered in volcanoes and old lava plains.',
    ],
  },
  facts: {
    tiny: ['Venus spins the other way! 🔄', 'Venus shines bright in the night sky! ✨'],
    junior: [
      'Venus spins backwards compared with most planets.',
      'Venus spins so slowly that one spin takes longer than one trip around the Sun!',
      'Venus is the brightest planet in our night sky.',
    ],
    senior: [
      'Venus spins backwards (retrograde) and very slowly: one spin takes about 243 Earth days.',
      'Its year is only about 225 Earth days, so a single spin lasts longer than a whole orbit of the Sun.',
      'The air pressure on the surface is about 90 times Earth’s — like being about 900 m deep in the ocean.',
    ],
  },
  task: {
    kind: 'clear-clouds',
    instruction: { tiny: 'Tap the clouds! Poof! ☁️', junior: 'Tap the clouds to blow them away!', senior: 'Clear the cloud deck to reveal what is hiding below.' },
    hint: {
      tiny: 'Tap the fluffy clouds! ☁️',
      junior: 'Something is hiding under the clouds…',
      senior: 'Spacecraft use radar to “see” through Venus’s clouds — tap each cloud to clear the view.',
    },
  },
  quiz: [
    {
      id: 'ss-venus-hot',
      bands: ['tiny'],
      prompt: 'Is Venus hot or cold?',
      choices: [
        { id: 'hot', label: 'Hot!', emoji: '🔥' },
        { id: 'cold', label: 'Cold!', emoji: '❄️' },
      ],
      answerId: 'hot',
      explain: { tiny: 'Venus is the hottest planet! 🔥', junior: 'Venus is the hottest planet!', senior: 'Venus is the hottest planet, at about 465 °C.' },
    },
    {
      id: 'ss-venus-clouds',
      bands: ['tiny'],
      prompt: 'What covers Venus?',
      choices: [
        { id: 'clouds', label: 'Clouds', emoji: '☁️' },
        { id: 'trees', label: 'Trees', emoji: '🌳' },
        { id: 'water', label: 'Water', emoji: '🌊' },
      ],
      answerId: 'clouds',
      explain: { tiny: 'Thick clouds cover Venus! ☁️', junior: 'Thick clouds cover all of Venus.', senior: 'A thick deck of sulfuric acid clouds covers the whole planet.' },
    },
    {
      id: 'ss-venus-hottest',
      bands: ['junior', 'senior'],
      prompt: 'Which planet is the hottest?',
      choices: [
        { id: 'venus', label: 'Venus', emoji: '🌋' },
        { id: 'mercury', label: 'Mercury', emoji: '🪨' },
        { id: 'mars', label: 'Mars', emoji: '🔴' },
      ],
      answerId: 'venus',
      explain: {
        tiny: 'Venus!',
        junior: 'Venus! Mercury is closer to the Sun, but Venus’s thick clouds trap the heat.',
        senior: 'Venus, at about 465 °C. Mercury is closer to the Sun, but Venus’s thick CO₂ atmosphere traps heat day and night.',
      },
    },
    {
      id: 'ss-venus-spin',
      bands: ['junior', 'senior'],
      prompt: 'Which way does Venus spin?',
      choices: [
        { id: 'back', label: 'Backwards', emoji: '↩️' },
        { id: 'same', label: 'The same way as Earth', emoji: '🌍' },
        { id: 'none', label: 'It does not spin at all', emoji: '🛑' },
      ],
      answerId: 'back',
      explain: {
        tiny: 'Backwards!',
        junior: 'Backwards! On Venus, the Sun rises in the west.',
        senior: 'Backwards (retrograde) — so on Venus the Sun rises in the west and sets in the east.',
      },
    },
    {
      id: 'ss-venus-twin',
      bands: ['junior'],
      prompt: 'Why is Venus called Earth’s twin?',
      choices: [
        { id: 'size', label: 'It is almost the same size', emoji: '📏' },
        { id: 'rings', label: 'It has the same rings', emoji: '💍' },
        { id: 'moon', label: 'It has the same Moon', emoji: '🌙' },
      ],
      answerId: 'size',
      explain: {
        tiny: 'It is the same size!',
        junior: 'Venus is almost the same size as Earth — but much, much hotter!',
        senior: 'Venus is about 95% of Earth’s width, with a similar mass — but a very different climate.',
      },
    },
    {
      id: 'ss-venus-greenhouse',
      bands: ['senior'],
      prompt: 'What makes Venus so hot?',
      choices: [
        { id: 'greenhouse', label: 'A thick CO₂ atmosphere trapping heat' },
        { id: 'closest', label: 'It is the closest planet to the Sun' },
        { id: 'core', label: 'Its core is hotter than the Sun' },
        { id: 'lava', label: 'Its whole surface is liquid lava' },
      ],
      answerId: 'greenhouse',
      explain: {
        tiny: 'Its clouds keep it hot!',
        junior: 'Its thick air traps heat like a blanket.',
        senior: 'A runaway greenhouse effect: sunlight warms the ground, and the thick carbon dioxide atmosphere stops that heat escaping.',
      },
    },
    {
      id: 'ss-venus-daylong',
      bands: ['senior'],
      prompt: 'On Venus, which takes longer?',
      choices: [
        { id: 'spin', label: 'One spin on its axis (about 243 days)' },
        { id: 'orbit', label: 'One orbit of the Sun (about 225 days)' },
        { id: 'equal', label: 'They take exactly the same time' },
      ],
      answerId: 'spin',
      explain: {
        tiny: 'The spin!',
        junior: 'One spin! Venus spins super slowly.',
        senior: 'One spin: about 243 Earth days, longer than its 225-day year. Venus is the slowest-spinning planet.',
      },
    },
  ],
};
