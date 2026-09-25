import type { WorldContent } from '@/core/types';
import { earth } from './earth';
import { jupiter } from './jupiter';
import { mars } from './mars';
import { mercury } from './mercury';
import { neptune } from './neptune';
import { saturn } from './saturn';
import { sun } from './sun';
import { uranus } from './uranus';
import { venus } from './venus';

export const content: WorldContent = {
  id: 'solar-system',
  guide: { name: 'Cosmo', look: 'astro' },
  intro: {
    tiny: ['Hi {name}! I’m Cosmo! 👋', 'Let’s fly our rocket to the Sun and the planets! 🚀', 'Tap a planet to zoom there! ✨'],
    junior: [
      'Hi {name}! I’m Cosmo, your space buddy.',
      'Our Solar System has one star — the Sun — and eight planets going around it.',
      'Hop in your rocket! Tap a planet to fly there.',
    ],
    senior: [
      'Welcome aboard, Commander {name}. I’m Cosmo, your flight computer.',
      'The Solar System is the Sun plus everything its gravity holds: eight planets, their moons, dwarf planets, asteroids and comets.',
      'Distances on this map are squeezed so everything fits — the real gaps are enormous. Pick a destination to launch.',
    ],
  },
  stops: [sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune],
  outro: {
    tiny: ['You flew to every planet! 🎉', 'You are a super space explorer, {name}! 🚀'],
    junior: ['Mission complete, {name}! You visited the Sun and all eight planets.', 'You are a true Solar System Master!'],
    senior: [
      'Mission complete, Commander {name}. You have surveyed the Sun and all eight planets.',
      'Next time you look up at night, remember: some of those bright “stars” are planets you have now explored.',
    ],
  },
  badge: {
    id: 'solar-system-master',
    name: 'Solar System Master',
    emoji: '🪐',
    description: {
      tiny: 'You visited the Sun and all the planets!',
      junior: 'You explored the Sun and all eight planets.',
      senior: 'Awarded for surveying the Sun and all eight planets of the Solar System.',
    },
  },
};
