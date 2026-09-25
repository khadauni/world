import type { Tiered } from '@/core/types';
import type { ChamberId, SpotId } from '../logic/ids';
import { t } from './tiered';

/** Short spoken cheers and gentle nudges used during tasks (shown as the guide's toast). */

export const MEET_LINES = {
  tap: [t('Hello, heart! 👋', 'Hello!', 'Hello!'), t('Thump! It heard you! 💗', 'Thump!', 'Thump!'), t('Boop! 💗', 'Boop!', 'Boop!')] as readonly Tiered<string>[],
  found: t('You found it! Thump-thump! 💗', 'You found the heart, {name}! It’s in your chest, a little to the left.', 'Spot on — in the chest, just left of centre, with its tip pointing left.'),
  assist: t('Look! It’s sparkling!', 'Psst — follow the sparkle!', 'Hint: look for the brightest glow.'),
  miss: {
    heart: t('Yes!', 'Yes!', 'Yes!'),
    head: t('That’s your head!', 'That’s your head — your brain lives there! Try your chest.', 'That’s the head — home of the brain.'),
    tummy: t('That’s your tummy!', 'That’s your tummy — food goes there! Try a bit higher.', 'That’s the tummy — the stomach and intestines live there.'),
    mirror: t('Almost!', 'Close!', 'Close! That’s the chest’s right side — the heart leans to the body’s LEFT, which is YOUR right.'),
    belly: t('That’s your belly!', 'That’s your belly!', 'That’s the upper belly — the liver and stomach sit there. Go a little higher.'),
  } satisfies Record<SpotId, Tiered<string>>,
};

export const BEAT_LINES = {
  good: [t('BOOM! 🥁', 'Great timing!', 'On the beat!'), t('Yes! Thump!', 'Lub-dub! Perfect!', 'Right on the QRS spike!'), t('Hooray! 💓', 'Nice beat!', 'Perfect timing!')] as readonly Tiered<string>[],
  early: t('Wait for the squeeze!', 'A tiny bit early — wait for the squeeze!', 'Early — wait for the ring to land.'),
  late: t('Next squeeze! Get ready!', 'A little late — catch the next one!', 'Late — anticipate the next spike.'),
  assist: t('I made it slower for you! 🐢', 'I slowed the heart down a little — you’ve got this!', 'Heart rate lowered and timing window widened — try again.'),
  done: t('You found the beat! 🎉', 'You’re a heartbeat drummer!', 'Perfect rhythm — you kept time with the ventricles!'),
};

export const CHAMBER_LINES: Readonly<Record<ChamberId, Tiered<string>>> = {
  ra: t('That’s the blue room on top!', 'That’s the right atrium.', 'That’s the right atrium — it receives blood from the body.'),
  rv: t('That’s the blue room at the bottom!', 'That’s the right ventricle.', 'That’s the right ventricle — it pumps blood to the lungs.'),
  la: t('That’s the red room on top!', 'That’s the left atrium.', 'That’s the left atrium — it receives blood from the lungs.'),
  lv: t('That’s the red room at the bottom!', 'That’s the left ventricle.', 'That’s the left ventricle — the strongest pump.'),
};

export const ROOM_LINES = {
  correct: [t('Yes! That’s it! ⭐', 'Correct!', 'Correct!'), t('You got it! 🎉', 'Well spotted!', 'Exactly right.'), t('Hooray! 🏠', 'Yes!', 'Nailed it.')] as readonly Tiered<string>[],
  assist: t('Look! It’s glowing! ✨', 'Look for the glowing chamber!', 'The right chamber is glowing now.'),
  done: t('You know all the rooms! 🏠', 'You know the four chambers!', 'Chambers mastered — including the mirror trick!'),
};

export const LAB_LINES = {
  rebuild: t('Uh-oh! Let’s put the parts back! Tap them! 🧩', 'Now let’s rebuild! Tap each part in the tray to snap it back.', 'Rebuild time: read each clue and snap the matching part back in.'),
  placed: [t('Click! ✨', 'Snap! Back in place!', 'Locked in.'), t('Clack! 🧩', 'Click! Perfect fit!', 'Correct — it fits.')] as readonly Tiered<string>[],
  wrong: t('Not that one!', 'Not that one — try another!', 'Not that one — read the clue again.'),
  assist: t('Look! It’s glowing!', 'The right part is glowing!', 'The matching part is glowing now.'),
  done: t('The heart is whole again! Thump-thump! ❤️', 'All fixed! Listen — it’s beating again!', 'Rebuilt and beating — nice engineering!'),
};

export const VALVE_LINES = {
  fixed: [t('Fixed! Click-clack! 🔧', 'Fixed! No more leaks!', 'Sealed — blood only flows forward now.'), t('All better! ✨', 'That door shuts tight now!', 'Repaired: no more backflow.')] as readonly Tiered<string>[],
  healthy: t('That door is fine!', 'That door already shuts tight!', 'That valve seals properly — look for drops going backwards.'),
  assist: t('Look! The wobbly door is sparkling!', 'Look for the sparkle — that door is leaking!', 'The leaky valve is highlighted now.'),
  done: t('All the doors work! Hooray! 🚪', 'All the valves are fixed — one-way flow!', 'All valves repaired — the heart is efficient again.'),
};

export const RIDE_LINES = {
  lungs: t('The lungs! Tap the air bubbles! 🫧', 'We’re in the lungs! Tap the oxygen bubbles!', 'Lung capillaries: load the oxygen!'),
  bubble: [t('Pop! 🫧', 'Got one!', 'O₂ loaded!'), t('Yay! 🫧', 'Oxygen!', 'Bound to haemoglobin!')] as readonly Tiered<string>[],
  loaded: t('Full of air! We turned red! Let’s go! 🔴', 'Full of oxygen — look, we turned bright red!', 'Fully loaded — bright red now. Off to the left heart!'),
  muscle: t('A hungry muscle! Tap it! 💪', 'This muscle needs oxygen — tap it to deliver!', 'Working muscle ahead: tap to unload the oxygen.'),
  delivered: t('Yum! The muscle is happy! 💪', 'Delivered! Now the muscle can keep working!', 'Oxygen delivered — now we carry carbon dioxide back to the lungs.'),
};

export const HEALTHY_LINES = {
  done: t('Super happy heart! ❤️', 'Your heart is strong and happy!', 'Fully powered heart — great everyday choices!'),
  assist: t('Look for the sparkly ones! ✨', 'The everyday choices are sparkling!', 'Everyday choices are highlighted now.'),
};

export function pick<T>(list: readonly T[], i: number): T {
  return list[((i % list.length) + list.length) % list.length] as T;
}
