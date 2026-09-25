import type { Tiered } from '@/core/types';

/** Short things Vyom says during tasks (toasts + speech). Kind, never scolding. */
export const LINES = {
  checksDone: { tiny: 'All ready!', junior: 'All checks are GO! Now hold LAUNCH!', senior: 'All systems GO. Hold LAUNCH to start the terminal count.' },
  checkOrder: { tiny: 'Try another one!', junior: 'Try a different check!', senior: 'Not yet — follow the launch order: fuel, spacecraft, weather, clock.' },
  checkAssist: { tiny: 'Tap the glowing one!', junior: 'Tap the glowing card!', senior: 'I’ve highlighted the next check for you.' },
  liftoff: { tiny: 'Whoooosh! Up, up, up! 🚀', junior: 'Liftoff! Chandrayaan-3 is on its way!', senior: 'Liftoff! LVM3-M4 clears the tower.' },

  boostGood: { tiny: 'Whoosh! Bigger! 🎉', junior: 'Great boost! The orbit grew!', senior: 'Clean perigee burn — apogee raised!' },
  boostMiss: { tiny: 'Wait for the sparkles!', junior: 'Wait until the ship is in the glow!', senior: 'That burn was outside the perigee zone — wait for the arc.' },
  boostAssist: { tiny: 'Tap now! Now!', junior: 'I’ll slow it down in the glow for you!', senior: 'Assist on: the craft slows inside the zone.' },
  orbitDone: { tiny: 'Big loops! Off to the Moon!', junior: 'Our orbit is huge now — next stop, the Moon!', senior: 'Orbit raised. Ready for trans-lunar injection.' },

  wayGood: { tiny: 'Yay! Next dot!', junior: 'On course!', senior: 'Waypoint reached.' },
  wayMiss: { tiny: 'Try the bouncing dot!', junior: 'Oops, find the next number!', senior: 'Out of sequence — find the next number.' },
  captured: { tiny: 'Hello, Moon! 🌙', junior: 'Captured! We’re circling the Moon!', senior: 'Lunar orbit insertion complete — captured by the Moon’s gravity.' },

  latchOpen: { tiny: 'Click! Open!', junior: 'Latch open!', senior: 'Latch released.' },
  separated: { tiny: 'Bye-bye, helper! 👋', junior: 'Vikram is free! Off to land!', senior: 'Separation confirmed — Vikram is flying on its own.' },

  holdNow: { tiny: 'NOW! Hold the button!', junior: 'Hold THRUST now!', senior: 'Brake now!' },
  gatePassed: { tiny: 'Good! Slow and soft!', junior: 'Nice and gentle!', senior: 'Descent rate under control.' },
  hard: { tiny: 'Bump! Let’s try again!', junior: 'Whoa, too fast! Vikram bounced. Let’s try again!', senior: 'Hard landing — too fast at touchdown. Resetting the descent.' },
  autopilot: { tiny: 'I’ll help you!', junior: 'Autopilot will help you brake now!', senior: 'Autopilot assist engaged — it will brake if you’re too fast.' },
  noFuel: { tiny: 'Uh-oh!', junior: 'Out of fuel!', senior: 'Fuel exhausted — save fuel by braking later.' },
  touchdown: { tiny: 'Touchdown! Hooray! 🎉', junior: 'Touchdown! India is on the Moon! 🇮🇳', senior: 'Touchdown! India has soft-landed near the lunar south pole!' },

  zap: { tiny: 'Zap! ✨', junior: 'Laser zap!', senior: 'LIBS pulse fired.' },
  roverDone: { tiny: 'Shiny rocks found! 💎', junior: 'Great science, {name}!', senior: 'Sampling complete — sulphur confirmed, just like in August 2023.' },

  roverSleep: { tiny: 'Night night, Pragyan! 😴', junior: 'Pragyan is asleep. Now make Vikram hop!', senior: 'Pragyan parked and asleep (2 Sep). Now the hop test.' },
  hopGood: { tiny: 'Boing! Great hop! 🦘', junior: 'Hop! Vikram jumped to a new spot!', senior: 'Hop successful — about 40 cm up, landed 30–40 cm away.' },
  hopLow: { tiny: 'A bit higher!', junior: 'A bit higher!', senior: 'Too low — aim for about 40 cm.' },
  hopHigh: { tiny: 'A bit lower!', junior: 'A bit lower!', senior: 'Too high — Vikram only needed about 40 cm.' },
  hopAssist: { tiny: 'Tap HOP!', junior: 'Tap HOP!', senior: 'Assist on: the target zone is bigger now.' },
  landerSleep: { tiny: 'Goodnight, Vikram! 🌙', junior: 'Goodnight, Vikram and Pragyan!', senior: 'Vikram in sleep mode (4 Sep). Mission complete.' },
  tapRover: { tiny: 'Tap Pragyan first!', junior: 'Tuck Pragyan in first!', senior: 'Pragyan went to sleep first, on 2 September.' },
} satisfies Record<string, Tiered<string>>;
