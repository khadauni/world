import type { WorldStop } from '@/core/types';

export const uranus: WorldStop = {
  id: 'uranus',
  title: 'Uranus',
  emoji: '🧊',
  color: '#7FDBE0',
  narration: {
    tiny: ['Hi, Uranus! It’s blue-green! 🩵', 'Uranus rolls on its side, like a ball! ⚽', 'Brrr! It is very cold here. 🥶'],
    junior: [
      'This is Uranus, an icy blue-green giant.',
      'Uranus is tipped right over on its side, so it rolls around the Sun like a ball.',
      'It is one of the coldest places in the whole Solar System!',
    ],
    senior: [
      'Uranus is an ice giant: beneath its hydrogen-helium air is a deep layer of water, ammonia and methane “ices”.',
      'Its axis is tilted about 98°, so it orbits the Sun lying on its side — scientists think a giant collision knocked it over long ago.',
      'Methane in its atmosphere absorbs red light, which gives Uranus its pale cyan colour.',
    ],
  },
  facts: {
    tiny: ['Uranus has thin, dark rings too! 💍', 'It is so far away, it is very, very cold! ❄️'],
    junior: [
      'Uranus takes about 84 Earth years to go around the Sun.',
      'Uranus has faint rings and more than 25 moons.',
      'Its coldest air can drop to about −224 °C.',
    ],
    senior: [
      'Uranus has the coldest atmosphere measured on any planet: about −224 °C.',
      'Because of its tilt, each pole gets about 42 years of sunlight, then about 42 years of darkness.',
      'Uranus was the first planet discovered with a telescope — by William Herschel in 1781.',
    ],
  },
  task: {
    kind: 'tilt-uranus',
    instruction: {
      tiny: 'Tap the button to roll Uranus over! 🔄',
      junior: 'Tap “Tilt it!” to tip Uranus onto its side!',
      senior: 'Use the controls to tilt Uranus to 98° — its real tilt.',
    },
    hint: {
      tiny: 'Tap the big button! 👇',
      junior: 'Keep tapping until Uranus lies on its side.',
      senior: 'Big tilts get you close fast — then nudge by 2° to land exactly on 98°.',
    },
  },
  quiz: [
    {
      id: 'ss-uranus-side',
      bands: ['tiny'],
      prompt: 'How does Uranus spin?',
      choices: [
        { id: 'side', label: 'Lying on its side', emoji: '🛌' },
        { id: 'up', label: 'Standing up tall', emoji: '🧍' },
      ],
      answerId: 'side',
      explain: { tiny: 'Uranus rolls on its side! 🛌', junior: 'Uranus spins lying on its side!', senior: 'On its side — its axis is tilted about 98°.' },
    },
    {
      id: 'ss-uranus-cold',
      bands: ['tiny', 'junior'],
      prompt: 'Is Uranus hot or cold?',
      choices: [
        { id: 'cold', label: 'Very cold', emoji: '🥶' },
        { id: 'hot', label: 'Very hot', emoji: '🥵' },
      ],
      answerId: 'cold',
      explain: {
        tiny: 'Brrr! Very cold! 🥶',
        junior: 'Very cold! It can drop to about −224 °C.',
        senior: 'Very cold: its atmosphere has reached about −224 °C, the coldest measured on any planet.',
      },
    },
    {
      id: 'ss-uranus-special',
      bands: ['junior', 'senior'],
      prompt: 'What is special about the way Uranus spins?',
      choices: [
        { id: 'side', label: 'It is tipped over on its side', emoji: '🔄' },
        { id: 'fast', label: 'It spins faster than any planet', emoji: '💨' },
        { id: 'none', label: 'It does not spin', emoji: '🛑' },
      ],
      answerId: 'side',
      explain: {
        tiny: 'It lies on its side!',
        junior: 'It is tipped over on its side, so it rolls around the Sun like a ball.',
        senior: 'Its axis is tilted about 98°, probably from a giant collision long ago. (Jupiter is the fastest spinner.)',
      },
    },
    {
      id: 'ss-uranus-colour',
      bands: ['junior', 'senior'],
      prompt: 'What colour is Uranus?',
      choices: [
        { id: 'cyan', label: 'Pale blue-green', emoji: '🩵', color: '#7FDBE0' },
        { id: 'red', label: 'Red', emoji: '🔴', color: '#E0603A' },
        { id: 'yellow', label: 'Yellow', emoji: '🟡', color: '#FFD23F' },
      ],
      answerId: 'cyan',
      explain: {
        tiny: 'Blue-green!',
        junior: 'Pale blue-green, like a frosty mint!',
        senior: 'Pale cyan — methane gas absorbs red light, so mostly blue-green light is reflected back.',
      },
    },
    {
      id: 'ss-uranus-tilt',
      bands: ['senior'],
      prompt: 'About how far is Uranus’s axis tilted?',
      choices: [
        { id: '98', label: 'About 98°' },
        { id: '23', label: 'About 23°, like Earth' },
        { id: '0', label: '0° — perfectly upright' },
        { id: '45', label: 'About 45°' },
      ],
      answerId: '98',
      explain: {
        tiny: 'Way over on its side!',
        junior: 'About 98° — more than tipped right over!',
        senior: 'About 98°. Earth is tilted about 23.4°, which is what gives us our seasons.',
      },
    },
    {
      id: 'ss-uranus-methane',
      bands: ['senior'],
      prompt: 'What gives Uranus its blue-green colour?',
      choices: [
        { id: 'methane', label: 'Methane gas absorbing red light' },
        { id: 'oceans', label: 'Oceans of water on its surface' },
        { id: 'rings', label: 'Light bouncing off its rings' },
        { id: 'neptune', label: 'Light reflected from Neptune' },
      ],
      answerId: 'methane',
      explain: {
        tiny: 'A special gas!',
        junior: 'A gas called methane makes it look blue-green.',
        senior: 'Methane absorbs red light, so the sunlight reflected back to us is mostly blue-green.',
      },
    },
  ],
};
