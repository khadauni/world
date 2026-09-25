import type { WorldContent } from '@/core/types';

/**
 * Chandrayaan Moon Mission — ISRO's Chandrayaan-3 (2023), told in three voices.
 * Key dates (IST): launch 14 Jul 2023 · Earth-bound burns 15–25 Jul · trans-lunar injection 1 Aug ·
 * lunar orbit insertion 5 Aug · separation 17 Aug · landing 23 Aug (~6:04 pm) · rover asleep 2 Sep ·
 * Vikram's hop 3 Sep · Vikram asleep 4 Sep.
 */
export const content: WorldContent = {
  id: 'chandrayaan',
  guide: { name: 'Vyom', look: 'isro' },
  intro: {
    tiny: ['Namaste, {name}! I’m Vyom! 👋', 'Let’s fly India’s rocket to the Moon! 🚀🌙', 'Tap, hold and zoom with me!'],
    junior: [
      'Namaste, {name}! I’m Vyom, your mission buddy from India’s space team.',
      'Together we’ll fly Chandrayaan-3 — the Indian spacecraft that landed on the Moon in 2023!',
      'We’ll launch the rocket, steer to the Moon and land gently. Ready?',
    ],
    senior: [
      'Namaste, {name}! I’m Vyom, your flight director for Chandrayaan-3.',
      'In 2023, ISRO — the Indian Space Research Organisation — sent this spacecraft to the Moon, about 384,000 km away, and landed near its south pole.',
      'You’ll run every phase yourself: launch, orbit-raising, lunar transfer, separation, landing, rover science and the lunar night.',
    ],
  },
  outro: {
    tiny: ['You did it, {name}! 🎉', 'You landed on the Moon! 🌙', 'Moon hero! High five! ✋'],
    junior: [
      'Mission complete, {name}! You flew Chandrayaan-3 all the way to the Moon.',
      'Just like the real team in 2023, you helped India land near the Moon’s south pole!',
    ],
    senior: [
      'Mission accomplished, Commander {name}! From Sriharikota to Shiv Shakti point, you flew every phase of Chandrayaan-3.',
      'India became the fourth country to soft-land on the Moon — and the first near its south pole. What will your mission be?',
    ],
  },
  badge: {
    id: 'chandrayaan-commander',
    name: { tiny: 'Moon Hero', junior: 'Moon Mission Commander', senior: 'Moon Mission Commander' },
    emoji: '🌙',
    description: {
      tiny: 'You flew a rocket to the Moon!',
      junior: 'You launched, landed and explored with Chandrayaan-3.',
      senior: 'You flew Chandrayaan-3 from launch to a soft landing near the lunar south pole.',
    },
  },
  stops: [
    // ------------------------------------------------------------------ 1. Launch
    {
      id: 'launch-pad',
      title: { tiny: 'Rocket Launch!', junior: 'Launch Day', senior: 'Sriharikota Launch' },
      emoji: '🚀',
      color: '#FF9933',
      narration: {
        tiny: ['Look! A giant rocket! 🚀', 'It stands by the sea in India. 🌊', 'Let’s make it zoom up high!'],
        junior: [
          'This is Sriharikota, an island on India’s east coast where ISRO launches its rockets.',
          'Our rocket is called LVM3. Chandrayaan-3 rides inside its round nose.',
          'On 14 July 2023, it blasted off towards the Moon!',
        ],
        senior: [
          'Welcome to the Satish Dhawan Space Centre on Sriharikota island, Andhra Pradesh — India’s main spaceport.',
          'The LVM3-M4 rocket is about 43.5 m tall and weighs around 640 tonnes. Chandrayaan-3 rides inside its bulb-shaped nose fairing.',
          'Liftoff came at 2:35 pm IST on 14 July 2023. LVM3 flew east over the Bay of Bengal: safely out over the sea, with a free push from Earth’s spin.',
        ],
      },
      facts: {
        tiny: ['Fire pushes rockets UP! Whoosh! 🔥', 'The Moon ship hides in the rocket’s nose! 👃'],
        junior: [
          'LVM3 has two giant side boosters that burn solid fuel, a bit like giant firework rockets.',
          'LVM3 is India’s most powerful rocket. Some people nickname it “Bahubali”!',
        ],
        senior: [
          'LVM3 has three stages: two S200 solid boosters, the liquid-fuelled L110 core stage, and the C25 cryogenic upper stage, which burns super-cold liquid hydrogen and liquid oxygen.',
          'Chandrayaan-3 weighed about 3,900 kg at launch: a Propulsion Module plus the Vikram lander, with the Pragyan rover tucked inside.',
          'The spaceport is named after Satish Dhawan, a former chairman of ISRO.',
        ],
      },
      task: {
        kind: 'launch-countdown',
        instruction: {
          tiny: 'Hold the big LAUNCH button! 🚀',
          junior: 'Tap the 3 checks, then hold LAUNCH!',
          senior: 'Run the 4 launch checks in the right order, then hold LAUNCH.',
        },
        hint: {
          tiny: 'Press the orange button and keep holding! 👆',
          junior: 'Tap each check card until it turns green. Then press and hold LAUNCH.',
          senior: 'Fuel first, then the spacecraft check, then weather, and the countdown clock last.',
        },
      },
      quiz: [
        {
          id: 'cy-launch-t1',
          bands: ['tiny'],
          prompt: 'What pushes the rocket up?',
          choices: [
            { id: 'fire', label: 'Fire', emoji: '🔥' },
            { id: 'balloons', label: 'Balloons', emoji: '🎈' },
            { id: 'wind', label: 'Wind', emoji: '🌬️' },
          ],
          answerId: 'fire',
          explain: 'Yes! Hot fire pushes it up! Whoosh! 🔥',
        },
        {
          id: 'cy-launch-t2',
          bands: ['tiny'],
          prompt: 'The rocket stood next to the…',
          choices: [
            { id: 'sea', label: 'Sea', emoji: '🌊' },
            { id: 'snow', label: 'Snow', emoji: '⛄' },
            { id: 'desert', label: 'Desert', emoji: '🐪' },
          ],
          answerId: 'sea',
          explain: 'Yes! Right next to the big blue sea! 🌊',
        },
        {
          id: 'cy-launch-j1',
          bands: ['junior'],
          prompt: 'Which country sent Chandrayaan-3 to the Moon?',
          choices: [
            { id: 'india', label: 'India', emoji: '🐅' },
            { id: 'canada', label: 'Canada', emoji: '🍁' },
            { id: 'egypt', label: 'Egypt', emoji: '🐫' },
          ],
          answerId: 'india',
          explain: 'India! ISRO, India’s space agency, built and launched it.',
        },
        {
          id: 'cy-launch-j2',
          bands: ['junior'],
          prompt: 'What is the name of the rocket that launched Chandrayaan-3?',
          choices: [
            { id: 'lvm3', label: 'LVM3', emoji: '🚀' },
            { id: 'bus', label: 'Sky Bus', emoji: '🚌' },
            { id: 'train', label: 'Star Train', emoji: '🚆' },
          ],
          answerId: 'lvm3',
          explain: 'LVM3 — India’s most powerful rocket!',
        },
        {
          id: 'cy-launch-js',
          bands: ['junior', 'senior'],
          prompt: 'In which year did Chandrayaan-3 launch?',
          choices: [
            { id: '2023', label: '2023', emoji: '📅' },
            { id: '2008', label: '2008', emoji: '🗓️' },
            { id: '2019', label: '2019', emoji: '📆' },
          ],
          answerId: '2023',
          explain: {
            tiny: '2023!',
            junior: '2023! Chandrayaan-1 flew in 2008 and Chandrayaan-2 in 2019.',
            senior: '14 July 2023. Chandrayaan-1 launched in 2008 and Chandrayaan-2 in 2019 — Chandrayaan-3 built on both.',
          },
        },
        {
          id: 'cy-launch-s1',
          bands: ['senior'],
          prompt: 'Why did LVM3 launch Chandrayaan-3 towards the east?',
          choices: [
            { id: 'spin', label: 'Earth spins eastward, giving a free speed boost' },
            { id: 'moon', label: 'The Moon is always in the east' },
            { id: 'wind', label: 'Winds only blow east' },
            { id: 'closer', label: 'Space is closer in the east' },
          ],
          answerId: 'spin',
          explain: 'Earth spins towards the east, so launching east adds Earth’s own motion to the rocket’s speed — and the flight path stays over the Bay of Bengal.',
        },
        {
          id: 'cy-launch-s2',
          bands: ['senior'],
          prompt: 'What is special about LVM3’s C25 upper stage?',
          choices: [
            { id: 'cryo', label: 'It burns super-cold liquid hydrogen and oxygen' },
            { id: 'solar', label: 'It runs on solar panels' },
            { id: 'coal', label: 'It burns coal' },
            { id: 'none', label: 'It has no engine' },
          ],
          answerId: 'cryo',
          explain: '“Cryogenic” means extremely cold: liquid hydrogen must be kept below about −250 °C. Its CE-20 engine gave Chandrayaan-3 its final push into orbit around Earth.',
        },
        {
          id: 'cy-launch-s3',
          bands: ['senior'],
          prompt: 'About how tall is the LVM3 rocket?',
          choices: [
            { id: '43', label: 'About 43.5 m' },
            { id: '4', label: 'About 4.3 m' },
            { id: '435', label: 'About 435 m' },
            { id: '4km', label: 'About 4.3 km' },
          ],
          answerId: '43',
          explain: 'About 43.5 m — roughly as tall as a 14-storey building.',
        },
      ],
    },

    // ------------------------------------------------------------------ 2. Earth orbit
    {
      id: 'earth-orbit',
      title: { tiny: 'Round the Earth', junior: 'Orbit Raising', senior: 'Orbit-Raising Burns' },
      emoji: '🌏',
      color: '#4CC9F0',
      narration: {
        tiny: ['Wow! Look at our Earth! 🌍', 'Our ship goes round and round.', 'Each push makes the loop bigger!'],
        junior: [
          'We’re in space now, looping around Earth on a stretched, egg-shaped path called an orbit.',
          'Firing the engine at the closest point makes the loop grow — like pumping your legs at the bottom of a swing!',
          'Bigger and bigger loops carry us closer to the Moon.',
        ],
        senior: [
          'LVM3 placed Chandrayaan-3 in an elliptical orbit of about 170 km × 36,500 km.',
          'Between 15 and 25 July 2023, controllers fired the Propulsion Module’s engine five times, mostly near perigee — the orbit’s closest point to Earth.',
          'Each perigee burn adds speed, which raises the apogee — the far point. It’s a fuel-saving way to climb towards the Moon.',
        ],
      },
      facts: {
        tiny: ['Space is dark and quiet. Shhh! 🤫', 'Earth looks like a blue marble! 🔵'],
        junior: [
          'An orbit is a path that goes round and round something — like the Moon going around Earth.',
          'Chandrayaan-3 fired its engine five times to grow its loops around Earth.',
        ],
        senior: [
          'Apogee is the farthest point of an orbit and perigee the closest. Burning at perigee, where the craft is fastest, gets the most out of the fuel — engineers call this the Oberth effect.',
          'After the fifth burn, the far point of the orbit reached well over 100,000 km from Earth.',
          'A spacecraft coasting on an ellipse speeds up as it falls towards perigee and slows as it climbs to apogee.',
        ],
      },
      task: {
        kind: 'orbit-boost',
        instruction: {
          tiny: 'Tap BOOST when the ship is in the glow! ✨',
          junior: 'Tap BOOST while the ship is inside the glowing zone. Grow the orbit 3 times!',
          senior: 'Make 4 perigee burns: tap BOOST only while the craft is inside the perigee zone.',
        },
        hint: {
          tiny: 'Wait for the ship to reach the sparkles. Then tap! ✨',
          junior: 'Watch the ship zoom close to Earth. Tap BOOST when it is inside the glowing arc.',
          senior: 'Perigee is the point nearest Earth — the craft moves fastest there, so tap as soon as it enters the arc.',
        },
      },
      quiz: [
        {
          id: 'cy-orbit-t1',
          bands: ['tiny'],
          prompt: 'What shape is our Earth?',
          choices: [
            { id: 'ball', label: 'A ball', emoji: '⚽' },
            { id: 'box', label: 'A box', emoji: '📦' },
            { id: 'star', label: 'A star', emoji: '⭐' },
          ],
          answerId: 'ball',
          explain: 'Yes! Earth is round like a ball! 🌍',
        },
        {
          id: 'cy-orbit-t2',
          bands: ['tiny'],
          prompt: 'Our ship went round and round the…',
          choices: [
            { id: 'earth', label: 'Earth', emoji: '🌍' },
            { id: 'tree', label: 'Tree', emoji: '🌳' },
            { id: 'cake', label: 'Cake', emoji: '🎂' },
          ],
          answerId: 'earth',
          explain: 'Yes! Round and round the Earth! 🌍',
        },
        {
          id: 'cy-orbit-j1',
          bands: ['junior'],
          prompt: 'What do we call the path a spacecraft takes around Earth?',
          choices: [
            { id: 'orbit', label: 'An orbit', emoji: '🔄' },
            { id: 'tunnel', label: 'A tunnel', emoji: '🚇' },
            { id: 'road', label: 'A highway', emoji: '🛣️' },
          ],
          answerId: 'orbit',
          explain: 'An orbit! The Moon is in orbit around Earth too.',
        },
        {
          id: 'cy-orbit-j2',
          bands: ['junior'],
          prompt: 'When should you fire the engine to make the loop bigger?',
          choices: [
            { id: 'close', label: 'At the point closest to Earth', emoji: '🌍' },
            { id: 'far', label: 'At the point farthest away', emoji: '🔭' },
            { id: 'never', label: 'Never — just wait', emoji: '⏳' },
          ],
          answerId: 'close',
          explain: 'At the closest point! A push there makes the far side of the loop swing out further — like pumping a swing at the bottom.',
        },
        {
          id: 'cy-orbit-j3',
          bands: ['junior'],
          prompt: 'How many engine burns did Chandrayaan-3 do while looping around Earth?',
          choices: [
            { id: '5', label: '5', emoji: '✋' },
            { id: '1', label: '1', emoji: '☝️' },
            { id: '100', label: '100', emoji: '💯' },
          ],
          answerId: '5',
          explain: 'Five burns — one for each finger on your hand!',
        },
        {
          id: 'cy-orbit-s1',
          bands: ['senior'],
          prompt: 'What is the “perigee” of an orbit?',
          choices: [
            { id: 'closest', label: 'The point closest to Earth' },
            { id: 'farthest', label: 'The point farthest from Earth' },
            { id: 'speed', label: 'The orbit’s average speed' },
            { id: 'engine', label: 'The name of the main engine' },
          ],
          answerId: 'closest',
          explain: 'Perigee is the closest point; apogee is the farthest.',
        },
        {
          id: 'cy-orbit-s2',
          bands: ['senior'],
          prompt: 'A burn at perigee mainly raises which part of the orbit?',
          choices: [
            { id: 'apogee', label: 'The apogee' },
            { id: 'perigee', label: 'The perigee' },
            { id: 'earth', label: 'Earth’s rotation speed' },
            { id: 'nothing', label: 'Nothing changes' },
          ],
          answerId: 'apogee',
          explain: 'Adding speed at perigee raises the opposite side of the orbit — the apogee.',
        },
        {
          id: 'cy-orbit-s3',
          bands: ['senior'],
          prompt: 'Where does a spacecraft on an elliptical orbit move fastest?',
          choices: [
            { id: 'perigee', label: 'At perigee' },
            { id: 'apogee', label: 'At apogee' },
            { id: 'same', label: 'Same speed everywhere' },
            { id: 'engine', label: 'Only when the engine is on' },
          ],
          answerId: 'perigee',
          explain: 'At perigee. It speeds up as it falls towards Earth and slows as it climbs to apogee — Kepler’s second law.',
        },
        {
          id: 'cy-orbit-s4',
          bands: ['senior'],
          prompt: 'Why reach the Moon with many smaller burns instead of one giant push?',
          choices: [
            { id: 'fuel', label: 'It saves fuel, so a smaller rocket can do the job' },
            { id: 'weekly', label: 'Engines can only fire once a week' },
            { id: 'sun', label: 'The Moon was behind the Sun' },
            { id: 'iss', label: 'To wave at the space station' },
          ],
          answerId: 'fuel',
          explain: 'Sending a 3,900 kg craft straight to the Moon would need a much bigger rocket. Instead, LVM3 put it into Earth orbit and its own engine did the rest with short burns at perigee, where each drop of fuel counts most — the trade-off is a longer trip.',
        },
      ],
    },

    // ------------------------------------------------------------------ 3. To the Moon
    {
      id: 'to-the-moon',
      title: { tiny: 'Zoom to the Moon', junior: 'Journey to the Moon', senior: 'Lunar Transfer' },
      emoji: '🧭',
      color: '#9B7BFF',
      narration: {
        tiny: ['Bye-bye, Earth! 👋', 'Hello, Moon! Here we come! 🌙', 'Follow the shiny dots!'],
        junior: [
          'On 1 August 2023, a big engine burn sent Chandrayaan-3 away from Earth, towards the Moon.',
          'Then it coasted quietly through space for days.',
          'On 5 August, it slowed down near the Moon, and the Moon’s gravity caught it!',
        ],
        senior: [
          'On 1 August 2023, the trans-lunar injection (TLI) burn sent Chandrayaan-3 out of Earth orbit towards the Moon.',
          'After days of coasting, lunar orbit insertion (LOI) on 5 August 2023 slowed it down near the Moon.',
          'LOI is a braking burn: too little and you fly past; just right, and the Moon’s gravity captures you into orbit.',
        ],
      },
      facts: {
        tiny: ['The Moon is SO far away! 🌙', 'The Moon has no air. No wind at all! 🍃'],
        junior: [
          'The Moon is about 384,000 km away. A car driving non-stop at highway speed would take about five months to get there!',
          'The Moon’s gravity is about one-sixth of Earth’s, so you could jump much higher there.',
        ],
        senior: [
          'Launch to landing took about 40 days (14 July → 23 August). Apollo astronauts reached the Moon in about 3 days on the giant Saturn V; Chandrayaan-3’s slower route saved fuel.',
          'Moon gravity is about 1.62 m/s² — roughly one-sixth of Earth’s 9.8 m/s².',
        ],
      },
      task: {
        kind: 'trace-path',
        instruction: {
          tiny: 'Tap the shiny dots! ✨',
          junior: 'Tap the glowing dots 1, 2, 3, 4 in order to fly to the Moon!',
          senior: 'Plot the course: tap navigation waypoints 1 → 5 in order.',
        },
        hint: {
          tiny: 'Tap the bouncing dot! 👆',
          junior: 'Tap the dot with the next number. It glows the brightest!',
          senior: 'Waypoints must be flown in order — find the next number along the curve.',
        },
      },
      quiz: [
        {
          id: 'cy-moon-t1',
          bands: ['tiny'],
          prompt: 'Which one is the Moon?',
          choices: [
            { id: 'moon', label: 'Moon', emoji: '🌙' },
            { id: 'sun', label: 'Sun', emoji: '☀️' },
            { id: 'star', label: 'Star', emoji: '⭐' },
          ],
          answerId: 'moon',
          explain: 'Yes! That’s the Moon! 🌙',
        },
        {
          id: 'cy-moon-t2',
          bands: ['tiny'],
          prompt: 'Is the Moon near or far?',
          choices: [
            { id: 'far', label: 'Far, far away', emoji: '🌌' },
            { id: 'near', label: 'Next door', emoji: '🏠' },
          ],
          answerId: 'far',
          explain: 'Yes! Far, far away! We flew for days and days! 🚀',
        },
        {
          id: 'cy-moon-j1',
          bands: ['junior'],
          prompt: 'What pulled Chandrayaan-3 into orbit around the Moon?',
          choices: [
            { id: 'gravity', label: 'The Moon’s gravity', emoji: '🌙' },
            { id: 'rope', label: 'A giant rope', emoji: '🪢' },
            { id: 'magnet', label: 'A magnet', emoji: '🧲' },
          ],
          answerId: 'gravity',
          explain: 'Gravity! The Moon’s pull caught Chandrayaan-3 once it slowed down.',
        },
        {
          id: 'cy-moon-js',
          bands: ['junior', 'senior'],
          prompt: 'About how far away is the Moon from Earth?',
          choices: [
            { id: '384k', label: 'About 384,000 km' },
            { id: '384', label: 'About 384 km' },
            { id: '38m', label: 'About 38 million km' },
          ],
          answerId: '384k',
          explain: 'About 384,000 km — you could line up about 30 Earths in that gap!',
        },
        {
          id: 'cy-moon-j2',
          bands: ['junior'],
          prompt: 'How long did Chandrayaan-3 take from launch to landing?',
          choices: [
            { id: 'days', label: 'About 40 days', emoji: '📅' },
            { id: 'mins', label: 'About 40 minutes', emoji: '⏱️' },
            { id: 'years', label: 'About 40 years', emoji: '👴' },
          ],
          answerId: 'days',
          explain: 'About 40 days — from 14 July to 23 August 2023.',
        },
        {
          id: 'cy-moon-s1',
          bands: ['senior'],
          prompt: 'What did the trans-lunar injection (TLI) burn do?',
          choices: [
            { id: 'send', label: 'Sent the craft out of Earth orbit towards the Moon' },
            { id: 'land', label: 'Landed it on the Moon' },
            { id: 'rover', label: 'Released the rover' },
            { id: 'camera', label: 'Switched on the cameras' },
          ],
          answerId: 'send',
          explain: 'TLI (1 August 2023) was the burn that left Earth orbit behind and aimed for the Moon.',
        },
        {
          id: 'cy-moon-s2',
          bands: ['senior'],
          prompt: 'Lunar orbit insertion is mainly…',
          choices: [
            { id: 'brake', label: 'A braking burn so the Moon’s gravity can capture the craft' },
            { id: 'escape', label: 'A speed-up burn to escape the Moon' },
            { id: 'chute', label: 'Opening a parachute' },
            { id: 'solar', label: 'A solar panel test' },
          ],
          answerId: 'brake',
          explain: 'A braking burn. Arriving too fast means flying past the Moon; slowing just enough lets gravity capture you.',
        },
        {
          id: 'cy-moon-s3',
          bands: ['senior'],
          prompt: 'On what date did Chandrayaan-3 enter orbit around the Moon?',
          choices: [
            { id: 'aug5', label: '5 August 2023' },
            { id: 'jul14', label: '14 July 2023' },
            { id: 'aug23', label: '23 August 2023' },
            { id: 'aug15', label: '15 August 2023' },
          ],
          answerId: 'aug5',
          explain: 'Lunar orbit insertion was on 5 August 2023 — launch was 14 July and landing 23 August.',
        },
      ],
    },

    // ------------------------------------------------------------------ 4. Separation
    {
      id: 'separation',
      title: { tiny: 'Bye-bye, Helper!', junior: 'Lander Separation', senior: 'Vikram Separates' },
      emoji: '🛰️',
      color: '#FFC93C',
      narration: {
        tiny: ['Two ships are stuck together! 🛰️', 'The lander wants to go to the Moon.', 'Let’s open the clip! Click!'],
        junior: [
          'Chandrayaan-3 is really two craft joined together: the Propulsion Module and the Vikram lander.',
          'The Propulsion Module did the long drive. Now Vikram, with the Pragyan rover inside, must go down on its own.',
          'On 17 August 2023, they said goodbye and separated!',
        ],
        senior: [
          'The Integrated Module had two parts: the Propulsion Module — a “space tug” with a big solar panel — and the Vikram lander carrying the Pragyan rover.',
          'On 17 August 2023, in a nearly circular orbit roughly 150–160 km above the Moon, Vikram separated from the Propulsion Module.',
          'Vikram then lowered its own orbit with two “deboost” burns before starting its landing.',
        ],
      },
      facts: {
        tiny: ['Vikram the lander has 4 legs! 🦵', 'Pragyan the rover hides inside! 🤫'],
        junior: [
          'The lander is named Vikram, after Dr Vikram Sarabhai, who started India’s space programme.',
          'The Propulsion Module stayed in orbit and used an instrument called SHAPE to look back at Earth.',
        ],
        senior: [
          'SHAPE (Spectro-polarimetry of HAbitable Planet Earth) studied Earth’s light from lunar orbit — practice for spotting life-friendly planets around other stars.',
          'Later in 2023, ISRO steered the Propulsion Module out of lunar orbit and back into an orbit around Earth, testing skills for future missions.',
        ],
      },
      task: {
        kind: 'release-latches',
        instruction: {
          tiny: 'Tap the glowing clip! ✨',
          junior: 'Tap all 3 glowing latches to set Vikram free!',
          senior: 'Open all 4 separation latches to release Vikram.',
        },
        hint: {
          tiny: 'Tap the bouncing orange button! 👆',
          junior: 'The latches are the orange glowing clips where the two craft join.',
          senior: 'Look around the joint between Vikram and the Propulsion Module — every latch must open.',
        },
      },
      quiz: [
        {
          id: 'cy-sep-t1',
          bands: ['tiny'],
          prompt: 'What does the lander stand on?',
          choices: [
            { id: 'legs', label: 'Legs', emoji: '🦵' },
            { id: 'wings', label: 'Wings', emoji: '🦋' },
            { id: 'flippers', label: 'Flippers', emoji: '🐧' },
          ],
          answerId: 'legs',
          explain: 'Yes! Four strong legs! 🦵',
        },
        {
          id: 'cy-sep-t2',
          bands: ['tiny'],
          prompt: 'Who hid inside the lander?',
          choices: [
            { id: 'rover', label: 'A robot rover', emoji: '🤖' },
            { id: 'cat', label: 'A cat', emoji: '🐱' },
            { id: 'fish', label: 'A fish', emoji: '🐟' },
          ],
          answerId: 'rover',
          explain: 'Yes! Pragyan the robot rover! 🤖',
        },
        {
          id: 'cy-sep-j1',
          bands: ['junior'],
          prompt: 'What is the name of Chandrayaan-3’s lander?',
          choices: [
            { id: 'vikram', label: 'Vikram', emoji: '🛬' },
            { id: 'pragyan', label: 'Pragyan', emoji: '🤖' },
            { id: 'mangal', label: 'Mangal', emoji: '🔴' },
          ],
          answerId: 'vikram',
          explain: 'Vikram is the lander, and Pragyan is the rover inside it.',
        },
        {
          id: 'cy-sep-js',
          bands: ['junior', 'senior'],
          prompt: 'Which part stayed in orbit after separation?',
          choices: [
            { id: 'pm', label: 'The Propulsion Module' },
            { id: 'rover', label: 'The Pragyan rover' },
            { id: 'rocket', label: 'The LVM3 rocket' },
          ],
          answerId: 'pm',
          explain: {
            tiny: 'The Propulsion Module!',
            junior: 'The Propulsion Module stayed up in orbit while Vikram went down to land.',
            senior: 'The Propulsion Module stayed in orbit, studying Earth with SHAPE, while Vikram prepared to land.',
          },
        },
        {
          id: 'cy-sep-j2',
          bands: ['junior'],
          prompt: 'Who is the lander Vikram named after?',
          choices: [
            { id: 'sarabhai', label: 'Dr Vikram Sarabhai', emoji: '👨‍🔬' },
            { id: 'king', label: 'A famous king', emoji: '👑' },
            { id: 'cricket', label: 'A cricket player', emoji: '🏏' },
          ],
          answerId: 'sarabhai',
          explain: 'Dr Vikram Sarabhai, the scientist who started India’s space programme.',
        },
        {
          id: 'cy-sep-s1',
          bands: ['senior'],
          prompt: 'What was the SHAPE instrument on the Propulsion Module designed to study?',
          choices: [
            { id: 'earth', label: 'Earth, as if it were a distant planet' },
            { id: 'rocks', label: 'Moon rocks' },
            { id: 'sun', label: 'Sunspots' },
            { id: 'mars', label: 'Mars' },
          ],
          answerId: 'earth',
          explain: 'SHAPE looked back at Earth to learn what a life-friendly planet’s light looks like from far away.',
        },
        {
          id: 'cy-sep-s2',
          bands: ['senior'],
          prompt: 'On what date did Vikram separate from the Propulsion Module?',
          choices: [
            { id: 'aug17', label: '17 August 2023' },
            { id: 'jul14', label: '14 July 2023' },
            { id: 'aug1', label: '1 August 2023' },
            { id: 'aug23', label: '23 August 2023' },
          ],
          answerId: 'aug17',
          explain: '17 August 2023 — six days before the landing.',
        },
        {
          id: 'cy-sep-s3',
          bands: ['senior'],
          prompt: 'Why did Vikram do “deboost” burns after separating?',
          choices: [
            { id: 'lower', label: 'To lower its orbit closer to the surface before landing' },
            { id: 'home', label: 'To fly back to Earth' },
            { id: 'charge', label: 'To charge its batteries' },
            { id: 'escape', label: 'To escape the Moon’s gravity' },
          ],
          answerId: 'lower',
          explain: 'Deboosting slows the craft so its orbit dips closer to the Moon — the first step of the descent.',
        },
      ],
    },

    // ------------------------------------------------------------------ 5. Landing
    {
      id: 'landing',
      title: { tiny: 'Soft Landing!', junior: 'Landing Vikram', senior: 'South Pole Landing' },
      emoji: '🌕',
      color: '#FF6B6B',
      narration: {
        tiny: ['Down, down, down we go! ⬇️', 'Slow down, Vikram! Gently!', 'Soft like a feather! 🪶'],
        junior: [
          'Vikram is dropping towards the Moon. There’s no air there, so a parachute can’t help!',
          'Instead, its engines push against the fall, like a gentle brake.',
          'On 23 August 2023, Vikram touched down safely near the Moon’s south pole. India cheered!',
        ],
        senior: [
          'Powered descent: Vikram’s four throttleable engines fired against its motion, cutting its speed from about 1.7 km/s (over 6,000 km/h) to almost zero.',
          'At about 6:04 pm IST on 23 August 2023, it touched down in the south polar region of the Moon.',
          'India became the fourth country to soft-land on the Moon — after the Soviet Union, the USA and China — and the first to land near the south pole.',
        ],
      },
      facts: {
        tiny: ['Vikram landed softly! Hooray! 🎉', 'The Moon has lots of round holes called craters! 🕳️'],
        junior: [
          'India became just the 4th country ever to land gently on the Moon — and the first near its south pole!',
          'Chandrayaan-2’s orbiter, circling the Moon since 2019, made contact with Vikram before landing. ISRO said: “Welcome, buddy!”',
        ],
        senior: [
          'Chandrayaan-2’s lander could not land safely in 2019, so ISRO gave Vikram stronger legs, more fuel and a bigger landing zone. Chandrayaan-2’s orbiter kept working in lunar orbit for years afterwards.',
          'Some craters near the south pole never see sunlight and may hold water ice. Chandrayaan-1 (2008) helped find evidence of water molecules on the Moon.',
          'With no air, the whole landing relied on engines, plus cameras and sensors that picked a safe, flat spot.',
        ],
      },
      task: {
        kind: 'land-vikram',
        instruction: {
          tiny: 'Hold THRUST when Vyom says NOW! 🔥',
          junior: 'Hold THRUST to slow down. Land gently on the glowing spot!',
          senior: 'Hold THRUST to brake. Touch down below the safe speed before the fuel runs out.',
        },
        hint: {
          tiny: 'Press and hold the big orange button! 👆',
          junior: 'Hold to slow down, let go to fall faster. Touch down slowly — keep the dial green!',
          senior: 'Save fuel: fall freely at first, then brake hard in the last 50 m. Stay under the red line at touchdown.',
        },
      },
      quiz: [
        {
          id: 'cy-land-t1',
          bands: ['tiny'],
          prompt: 'How should Vikram land?',
          choices: [
            { id: 'soft', label: 'Soft and slow', emoji: '🪶' },
            { id: 'bump', label: 'Fast and bumpy', emoji: '💥' },
          ],
          answerId: 'soft',
          explain: 'Yes! Soft and slow, like a feather! 🪶',
        },
        {
          id: 'cy-land-t2',
          bands: ['tiny'],
          prompt: 'What is on the Moon’s ground?',
          choices: [
            { id: 'craters', label: 'Round holes', emoji: '🕳️' },
            { id: 'grass', label: 'Grass', emoji: '🌱' },
            { id: 'waves', label: 'Waves', emoji: '🌊' },
          ],
          answerId: 'craters',
          explain: 'Yes! Lots of round holes called craters! 🕳️',
        },
        {
          id: 'cy-land-js',
          bands: ['junior', 'senior'],
          prompt: 'Why can’t Vikram use a parachute on the Moon?',
          choices: [
            { id: 'air', label: 'There is no air to catch it' },
            { id: 'heavy', label: 'Parachutes are too heavy' },
            { id: 'dark', label: 'It is too dark' },
          ],
          answerId: 'air',
          explain: {
            tiny: 'No air!',
            junior: 'The Moon has no air, so a parachute would just flap. Engines do the braking.',
            senior: 'Parachutes need an atmosphere to push against. The Moon has almost none, so every bit of braking had to come from Vikram’s engines.',
          },
        },
        {
          id: 'cy-land-j1',
          bands: ['junior'],
          prompt: 'India was the ___ country ever to land gently on the Moon.',
          choices: [
            { id: '4', label: '4th', emoji: '4️⃣' },
            { id: '1', label: '1st', emoji: '1️⃣' },
            { id: '10', label: '10th', emoji: '🔟' },
          ],
          answerId: '4',
          explain: '4th — and the very first to land near the Moon’s south pole!',
        },
        {
          id: 'cy-land-j2',
          bands: ['junior'],
          prompt: 'Near which part of the Moon did Vikram land?',
          choices: [
            { id: 'south', label: 'The south pole', emoji: '⬇️' },
            { id: 'north', label: 'The north pole', emoji: '⬆️' },
            { id: 'middle', label: 'The middle', emoji: '⏺️' },
          ],
          answerId: 'south',
          explain: 'Near the south pole — no country had landed there before!',
        },
        {
          id: 'cy-land-s1',
          bands: ['senior'],
          prompt: 'Which countries had soft-landed on the Moon before India?',
          choices: [
            { id: 'ussr', label: 'The Soviet Union, the USA and China' },
            { id: 'usa', label: 'Only the USA' },
            { id: 'eu', label: 'France, Germany and the UK' },
            { id: 'jp', label: 'Japan, Brazil and Canada' },
          ],
          answerId: 'ussr',
          explain: 'The Soviet Union and the USA in 1966, and China in 2013. India was fourth, in 2023.',
        },
        {
          id: 'cy-land-s2',
          bands: ['senior'],
          prompt: 'At about what time (IST) did Vikram touch down on 23 August 2023?',
          choices: [
            { id: '604pm', label: 'About 6:04 pm' },
            { id: '604am', label: 'About 6:04 am' },
            { id: 'midnight', label: 'About midnight' },
            { id: '235pm', label: 'About 2:35 pm' },
          ],
          answerId: '604pm',
          explain: 'About 6:04 pm IST. (2:35 pm was the launch time back on 14 July.)',
        },
        {
          id: 'cy-land-s3',
          bands: ['senior'],
          prompt: 'Why are scientists so interested in the Moon’s south pole?',
          choices: [
            { id: 'ice', label: 'Craters in permanent shadow may hold water ice' },
            { id: 'warm', label: 'It is the warmest place on the Moon' },
            { id: 'volcano', label: 'It has the Moon’s tallest active volcano' },
            { id: 'sun', label: 'The Sun is always overhead there' },
          ],
          answerId: 'ice',
          explain: 'Some polar craters never see sunlight, so ice could survive there for billions of years — useful water for future explorers.',
        },
      ],
    },

    // ------------------------------------------------------------------ 6. Pragyan rover
    {
      id: 'pragyan-rover',
      title: { tiny: 'Rover Ride', junior: 'Pragyan Rover', senior: 'Pragyan’s Science Drive' },
      emoji: '🤖',
      color: '#2FBF71',
      narration: {
        tiny: ['Look! A little robot! 🤖', 'Pragyan rolls down the ramp. Wheee!', 'Let’s find shiny Moon rocks! 💎'],
        junior: [
          'Meet Pragyan, a six-wheeled robot rover. Its name means “wisdom”.',
          'It rolled down a ramp from Vikram and drove slowly across the Moon, studying the soil.',
          'It shone a laser at the ground — and confirmed there is sulphur near the south pole!',
        ],
        senior: [
          'Pragyan is a solar-powered, six-wheeled rover of about 26 kg that crawled along at about 1 cm per second.',
          'Its LIBS instrument (Laser-Induced Breakdown Spectroscope) zaps the soil with a laser pulse. The tiny spark of glowing plasma gives off colours that reveal which elements are there.',
          'In August 2023, LIBS confirmed sulphur near the south pole — the first measurement of its kind made on the surface there — and also detected aluminium, calcium, iron, chromium, titanium, manganese, silicon and oxygen.',
        ],
      },
      facts: {
        tiny: ['Pragyan has six wheels! 1, 2, 3, 4, 5, 6! 🛞', 'It moves slowly, like a snail! 🐌'],
        junior: [
          'Pragyan’s back wheels were made to stamp the ISRO logo and India’s national emblem into the Moon dust!',
          'Pragyan drove a little over 100 metres in total — slow and careful.',
        ],
        senior: [
          'Pragyan also carried an Alpha Particle X-ray Spectrometer (APXS) to measure which elements make up the soil and rocks.',
          'Moving at about 1 cm/s, Pragyan travelled a little over 100 m. It could not talk to Earth directly — its data went home through Vikram.',
          'Chandrayaan means “Moon craft” in Sanskrit, and Pragyan means “wisdom”.',
        ],
      },
      task: {
        kind: 'rover-samples',
        instruction: {
          tiny: 'Tap the shiny rocks! 💎',
          junior: 'Tap 3 glowing rocks. Pragyan will zap them with its laser!',
          senior: 'Choose 4 rock targets. Pragyan drives over and runs a LIBS laser test on each.',
        },
        hint: {
          tiny: 'Tap the rock with the sparkles! 👆',
          junior: 'Glowing rocks have a ring around them. Tap one, then wait for Pragyan.',
          senior: 'Tap a ringed rock, watch for the laser spark, then pick the next target.',
        },
      },
      quiz: [
        {
          id: 'cy-rover-t1',
          bands: ['tiny'],
          prompt: 'How many wheels does Pragyan have?',
          choices: [
            { id: '6', label: 'Six', emoji: '6️⃣' },
            { id: '2', label: 'Two', emoji: '2️⃣' },
            { id: '10', label: 'Ten', emoji: '🔟' },
          ],
          answerId: '6',
          explain: 'Yes! Six wheels! Roll, roll, roll! 🛞',
        },
        {
          id: 'cy-rover-t2',
          bands: ['tiny'],
          prompt: 'How does Pragyan move?',
          choices: [
            { id: 'slow', label: 'Slow, like a snail', emoji: '🐌' },
            { id: 'fast', label: 'Fast, like a cheetah', emoji: '🐆' },
          ],
          answerId: 'slow',
          explain: 'Yes! Slow and careful, like a snail! 🐌',
        },
        {
          id: 'cy-rover-j1',
          bands: ['junior'],
          prompt: 'What does the name Pragyan mean?',
          choices: [
            { id: 'wisdom', label: 'Wisdom', emoji: '🦉' },
            { id: 'speed', label: 'Speed', emoji: '⚡' },
            { id: 'moon', label: 'Moon', emoji: '🌙' },
          ],
          answerId: 'wisdom',
          explain: 'Wisdom! A great name for a rover that learns about the Moon.',
        },
        {
          id: 'cy-rover-js',
          bands: ['junior', 'senior'],
          prompt: 'Which element did Pragyan’s laser confirm near the Moon’s south pole?',
          choices: [
            { id: 'sulphur', label: 'Sulphur' },
            { id: 'gold', label: 'Gold' },
            { id: 'uranium', label: 'Uranium' },
          ],
          answerId: 'sulphur',
          explain: {
            tiny: 'Sulphur!',
            junior: 'Sulphur! Pragyan also found aluminium, calcium, iron and more.',
            senior: 'Sulphur — confirmed by LIBS in August 2023, along with aluminium, calcium, iron, chromium, titanium, manganese, silicon and oxygen.',
          },
        },
        {
          id: 'cy-rover-j2',
          bands: ['junior'],
          prompt: 'What were Pragyan’s back wheels made to print in the Moon dust?',
          choices: [
            { id: 'emblem', label: 'The ISRO logo and India’s national emblem', emoji: '🛞' },
            { id: 'smile', label: 'A smiley face', emoji: '🙂' },
            { id: 'phone', label: 'A phone number', emoji: '📞' },
          ],
          answerId: 'emblem',
          explain: 'The ISRO logo and India’s national emblem — a message from India on the Moon!',
        },
        {
          id: 'cy-rover-s1',
          bands: ['senior'],
          prompt: 'How does Pragyan’s LIBS instrument work?',
          choices: [
            { id: 'laser', label: 'A laser makes a tiny spark; its light reveals the elements' },
            { id: 'drill', label: 'It drills a 10 m hole' },
            { id: 'collect', label: 'It collects rocks to fly back to Earth' },
            { id: 'listen', label: 'It listens for moonquakes' },
          ],
          answerId: 'laser',
          explain: 'Each element glows with its own set of colours in the laser-made plasma — like a fingerprint made of light.',
        },
        {
          id: 'cy-rover-s2',
          bands: ['senior'],
          prompt: 'About how fast did Pragyan drive?',
          choices: [
            { id: 'cm', label: 'About 1 cm per second' },
            { id: 'm', label: 'About 1 m per second' },
            { id: 'kmh10', label: 'About 10 km per hour' },
            { id: 'kmh100', label: 'About 100 km per hour' },
          ],
          answerId: 'cm',
          explain: 'About 1 cm per second — slow and safe on unknown ground, far from any help.',
        },
        {
          id: 'cy-rover-s3',
          bands: ['senior'],
          prompt: 'How did Pragyan send its science data to Earth?',
          choices: [
            { id: 'vikram', label: 'Through the Vikram lander' },
            { id: 'direct', label: 'Directly, with a giant dish on the rover' },
            { id: 'cable', label: 'Along a very long cable' },
            { id: 'none', label: 'It never sent any data' },
          ],
          answerId: 'vikram',
          explain: 'Pragyan talked only to Vikram, and Vikram relayed the data to Earth.',
        },
      ],
    },

    // ------------------------------------------------------------------ 7. Moon night
    {
      id: 'moon-night',
      title: { tiny: 'Goodnight, Moon', junior: 'Hop & Sleep', senior: 'Hop Test & Lunar Night' },
      emoji: '😴',
      color: '#6C7BFF',
      narration: {
        tiny: ['The Sun is going down. 🌅', 'Vikram can jump! Boing! 🦘', 'Bedtime, little robots! 😴'],
        junior: [
          'Daytime on the Moon lasts about two Earth weeks. Then comes a long, freezing night.',
          'Before bedtime, Vikram did a surprise hop: it jumped up and landed in a new spot!',
          'Then Pragyan and Vikram were put to sleep to wait out the cold and dark.',
        ],
        senior: [
          'Vikram and Pragyan were built to work for one lunar day — about 14 Earth days of sunlight — before a night just as long and bitterly cold.',
          'On 2 September 2023, Pragyan was parked and put into sleep mode. On 3 September, Vikram fired its engines, rose about 40 cm and landed 30–40 cm away: the “hop” experiment.',
          'On 4 September, Vikram went to sleep too. Its landing site is now called Shiv Shakti point.',
        ],
      },
      facts: {
        tiny: ['Moon nights are very, very cold! 🥶', 'Vikram and Pragyan are still sleeping there! 💤'],
        junior: [
          'India now celebrates 23 August — landing day — as National Space Day.',
          'Vikram’s landing spot was named “Shiv Shakti point”.',
        ],
        senior: [
          'The hop showed Vikram could restart its engines and lift off again — a “kick-start” useful for future missions that may bring Moon samples back to Earth.',
          'Nights there can drop below −170 °C. When sunlight returned, ISRO tried to wake Vikram and Pragyan, but they did not answer. Their mission goals were already achieved.',
          '23 August is now India’s National Space Day, celebrating the landing. In 2024 the International Astronomical Union officially named the site “Statio Shiv Shakti”.',
        ],
      },
      task: {
        kind: 'hop-and-sleep',
        instruction: {
          tiny: 'Help the robots get ready for bed! 😴',
          junior: 'Put Pragyan to sleep, make Vikram hop, then put Vikram to sleep.',
          senior: 'Re-create 2–4 September 2023: park Pragyan, fire Vikram’s ~40 cm hop, then put Vikram into sleep mode.',
        },
        hint: {
          tiny: 'Tap the bouncing picture! 👆',
          junior: 'Tap Pragyan first. Then press HOP. Then tap Vikram.',
          senior: 'Stop the hop gauge between 35 and 45 cm — Vikram really rose about 40 cm.',
        },
      },
      quiz: [
        {
          id: 'cy-night-t1',
          bands: ['tiny'],
          prompt: 'What did Vikram do?',
          choices: [
            { id: 'hop', label: 'A hop!', emoji: '🦘' },
            { id: 'swim', label: 'A swim', emoji: '🏊' },
            { id: 'sing', label: 'A song', emoji: '🎤' },
          ],
          answerId: 'hop',
          explain: 'Yes! Vikram went hop! Boing! 🦘',
        },
        {
          id: 'cy-night-t2',
          bands: ['tiny'],
          prompt: 'What comes after the Moon’s long day?',
          choices: [
            { id: 'night', label: 'Night', emoji: '🌙' },
            { id: 'rain', label: 'Rain', emoji: '🌧️' },
            { id: 'rainbow', label: 'Rainbow', emoji: '🌈' },
          ],
          answerId: 'night',
          explain: 'Yes! A long, dark, cold night. Sleepy time! 🌙',
        },
        {
          id: 'cy-night-j1',
          bands: ['junior'],
          prompt: 'How long does daytime last on the Moon?',
          choices: [
            { id: 'weeks', label: 'About 2 Earth weeks', emoji: '📅' },
            { id: 'hour', label: 'About 1 hour', emoji: '⏰' },
            { id: 'year', label: 'About 1 year', emoji: '🎂' },
          ],
          answerId: 'weeks',
          explain: 'About two Earth weeks of sunshine — and then about two weeks of night!',
        },
        {
          id: 'cy-night-js',
          bands: ['junior', 'senior'],
          prompt: 'What is 23 August now celebrated as in India?',
          choices: [
            { id: 'space', label: 'National Space Day' },
            { id: 'children', label: 'Children’s Day' },
            { id: 'independence', label: 'Independence Day' },
          ],
          answerId: 'space',
          explain: {
            tiny: 'National Space Day!',
            junior: 'National Space Day! (Independence Day is 15 August and Children’s Day is 14 November.)',
            senior: 'National Space Day, marking Vikram’s landing. (Independence Day is 15 August; Children’s Day is 14 November.)',
          },
        },
        {
          id: 'cy-night-j2',
          bands: ['junior'],
          prompt: 'What name was given to Vikram’s landing spot?',
          choices: [
            { id: 'shivshakti', label: 'Shiv Shakti point', emoji: '📍' },
            { id: 'beach', label: 'Sunny Beach', emoji: '🏖️' },
            { id: 'town', label: 'Crater Town', emoji: '🏘️' },
          ],
          answerId: 'shivshakti',
          explain: 'Shiv Shakti point!',
        },
        {
          id: 'cy-night-s1',
          bands: ['senior'],
          prompt: 'In the hop experiment, about how high did Vikram rise?',
          choices: [
            { id: '40cm', label: 'About 40 cm' },
            { id: '40m', label: 'About 40 m' },
            { id: '4km', label: 'About 4 km' },
            { id: 'none', label: 'It could not lift off' },
          ],
          answerId: '40cm',
          explain: 'About 40 cm up, landing 30–40 cm away — small, but it proved the engines could restart on the Moon.',
        },
        {
          id: 'cy-night-s2',
          bands: ['senior'],
          prompt: 'Why was the hop experiment important?',
          choices: [
            { id: 'future', label: 'It showed a lander can lift off again — useful for sample-return missions' },
            { id: 'quake', label: 'To dodge a moonquake' },
            { id: 'water', label: 'To dig for water' },
            { id: 'signal', label: 'To get a better phone signal' },
          ],
          answerId: 'future',
          explain: 'A future craft that brings Moon rocks home must take off from the surface — the hop was a first small test of that.',
        },
        {
          id: 'cy-night-s3',
          bands: ['senior'],
          prompt: 'Why were Vikram and Pragyan put into sleep mode?',
          choices: [
            { id: 'night', label: 'To prepare for the long, freezing night with no sunlight for power' },
            { id: 'bored', label: 'They had nothing left to do' },
            { id: 'eclipse', label: 'Earth was blocking the radio signals' },
            { id: 'storage', label: 'Their memory was full' },
          ],
          answerId: 'night',
          explain: 'Both ran on solar power. With about 14 Earth days of darkness and temperatures below −170 °C ahead, they were put to sleep with batteries charged, in case they could wake up again.',
        },
      ],
    },
  ],
};
