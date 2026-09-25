import type { WorldContent } from '@/core/types';
import { healthyStop } from './content/healthy';
import { heartbeatStop } from './content/heartbeat';
import { labStop } from './content/lab';
import { meetStop } from './content/meet';
import { rideStop } from './content/ride';
import { roomsStop } from './content/rooms';
import { t } from './content/tiered';
import { valvesStop } from './content/valves';

/** Inside the Human Heart — seven stops from "hello, heart" to rebuilding one and keeping it strong. */
export const content: WorldContent = {
  id: 'human-heart',
  guide: { name: 'Dr. Pulse', look: 'doc' },
  intro: t(
    ['Hi {name}! I’m Dr. Pulse! 🩺', 'Shh… listen. Thump-thump! That’s your heart! 💓', 'Let’s go on a heart adventure!'],
    [
      'Hi {name}! I’m Dr. Pulse, a heart doctor.',
      'Your heart is working right now — pumping blood all around your body!',
      'Let’s explore it, ride through it, take it apart and put it back together!',
    ],
    [
      'Welcome, {name}! I’m Dr. Pulse, a cardiologist — that’s a heart doctor.',
      'Your heart is a muscular pump that never takes a day off: it beats about 100,000 times every day.',
      'We’ll explore its four chambers and four valves, ride the bloodstream, and even take a heart apart and rebuild it.',
    ],
  ),
  stops: [meetStop, heartbeatStop, roomsStop, labStop, valvesStop, rideStop, healthyStop],
  outro: t(
    ['You did it, {name}! Heart Hero! ❤️', 'Run, jump and play to keep your heart happy!', 'Thump-thump means thank you!'],
    [
      'Amazing work, {name} — you’re a Heart Hero!',
      'You know the four rooms, the one-way doors and the big blood loop.',
      'Keep your heart strong with active play, good sleep, water, and fruit and veg!',
    ],
    [
      'Outstanding, Dr. {name}! You’ve mastered the heart.',
      'Chambers, valves, double circulation and the SA node — you know how the pump works.',
      'Look after yours: at least 60 minutes of active play a day, plenty of sleep, water, and lots of fruit and vegetables.',
    ],
  ),
  badge: {
    id: 'human-heart-hero',
    name: t('Heart Hero', 'Heart Hero', 'Heart Hero'),
    emoji: '❤️',
    description: t(
      'You met your heart and made it happy!',
      'You explored the heart, took it apart and rebuilt it!',
      'You mastered the heart’s chambers, valves and double circulation.',
    ),
  },
};
