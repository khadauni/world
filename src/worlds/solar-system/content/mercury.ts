import type { WorldStop } from '@/core/types';

export const mercury: WorldStop = {
  id: 'mercury',
  title: 'Mercury',
  emoji: '🪨',
  color: '#B8AFA6',
  narration: {
    tiny: ['This is Mercury! 👋', 'Mercury is the smallest planet. 🐭', 'It is closest to the Sun. Zoom, zoom! 💨'],
    junior: [
      'Welcome to Mercury, the planet closest to the Sun!',
      'It is the smallest planet — not much bigger than our Moon.',
      'Mercury zooms around the Sun faster than any other planet.',
    ],
    senior: [
      'Mercury is the smallest planet and the closest to the Sun.',
      'With almost no atmosphere to hold heat, it swings from about 430 °C in the day to about −180 °C at night.',
      'Craters from billions of years of impacts cover its surface — there is no wind or rain to wear them away.',
    ],
  },
  facts: {
    tiny: ['Mercury has lots of bumpy holes called craters! 🕳️', 'Mercury has no moon. 🙅'],
    junior: ['A year on Mercury is just 88 Earth days!', 'Mercury has no moons at all.', 'It is burning hot in the day and freezing cold at night.'],
    senior: [
      'Mercury orbits the Sun every 88 Earth days — the shortest year of any planet.',
      'From one sunrise to the next takes about 176 Earth days on Mercury — two whole Mercury years!',
      'Mercury has a huge iron core that fills most of the inside of the planet.',
    ],
  },
  task: {
    kind: 'tap-craters',
    instruction: { tiny: 'Tap the glowing holes! 🕳️', junior: 'Tap the glowing craters!', senior: 'Scan Mercury: tap every glowing crater.' },
    hint: {
      tiny: 'Look for the shiny circles! ✨',
      junior: 'Craters are round holes made when space rocks crashed down.',
      senior: 'Craters form when asteroids and comets hit — look for the glowing rims.',
    },
  },
  quiz: [
    {
      id: 'ss-mercury-closest',
      bands: ['tiny', 'junior'],
      prompt: { tiny: 'Which one is closest to the Sun?', junior: 'Which planet is closest to the Sun?', senior: 'Which planet is closest to the Sun?' },
      choices: [
        { id: 'mercury', label: 'Mercury', emoji: '🪨' },
        { id: 'earth', label: 'Earth', emoji: '🌍' },
        { id: 'saturn', label: 'Saturn', emoji: '🪐' },
      ],
      answerId: 'mercury',
      explain: {
        tiny: 'Mercury! It is right next to the Sun! ☀️',
        junior: 'Mercury is the closest planet to the Sun.',
        senior: 'Mercury — on average about 58 million km from the Sun.',
      },
    },
    {
      id: 'ss-mercury-size',
      bands: ['tiny'],
      prompt: 'Is Mercury big or small?',
      choices: [
        { id: 'small', label: 'Small', emoji: '🐭' },
        { id: 'big', label: 'Big', emoji: '🐘' },
      ],
      answerId: 'small',
      explain: { tiny: 'Mercury is the smallest planet! 🐭', junior: 'Mercury is the smallest planet.', senior: 'Mercury is the smallest planet, about 4,880 km across.' },
    },
    {
      id: 'ss-mercury-craters',
      bands: ['junior', 'senior'],
      prompt: 'What are the round holes on Mercury called?',
      choices: [
        { id: 'craters', label: 'Craters', emoji: '🕳️' },
        { id: 'lakes', label: 'Lakes', emoji: '🏞️' },
        { id: 'tunnels', label: 'Tunnels', emoji: '🚇' },
      ],
      answerId: 'craters',
      explain: {
        tiny: 'Craters! 🕳️',
        junior: 'Craters! They were made when space rocks crashed into Mercury.',
        senior: 'Craters — impact scars. Mercury has almost no air, so there is no wind or rain to wear them away.',
      },
    },
    {
      id: 'ss-mercury-year',
      bands: ['junior', 'senior'],
      prompt: 'How long is a year on Mercury?',
      choices: [
        { id: '88', label: 'About 88 Earth days' },
        { id: '365', label: 'About 365 Earth days' },
        { id: '10y', label: 'About 10 Earth years' },
      ],
      answerId: '88',
      explain: {
        tiny: 'Just 88 days!',
        junior: 'Just 88 days! Mercury is close to the Sun, so it has a short trip around it.',
        senior: 'About 88 Earth days. Closer planets orbit faster and have a shorter path, so their years are shorter.',
      },
    },
    {
      id: 'ss-mercury-cold',
      bands: ['senior'],
      prompt: 'Why does Mercury get so cold at night, even though it is so close to the Sun?',
      choices: [
        { id: 'air', label: 'It has almost no atmosphere to hold in heat' },
        { id: 'ice', label: 'It is covered in thick ice' },
        { id: 'far', label: 'It moves far from the Sun every night' },
        { id: 'clouds', label: 'Thick clouds block the sunlight' },
      ],
      answerId: 'air',
      explain: {
        tiny: 'No blanket of air!',
        junior: 'Mercury has almost no air, so the heat escapes.',
        senior: 'With almost no atmosphere, heat escapes straight to space, so the night side drops to about −180 °C.',
      },
    },
    {
      id: 'ss-mercury-moons',
      bands: ['senior'],
      prompt: 'How many moons does Mercury have?',
      choices: [
        { id: '0', label: 'None' },
        { id: '1', label: '1' },
        { id: '2', label: '2' },
        { id: '4', label: '4' },
      ],
      answerId: '0',
      explain: {
        tiny: 'None!',
        junior: 'None! Mercury has no moons.',
        senior: 'None. Mercury and Venus are the only planets with no moons at all.',
      },
    },
  ],
};
