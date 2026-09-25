import type { Tiered, WorldStop } from '@/core/types';
import { TUNING } from '../logic/bands';
import type { ItemId } from '../logic/healthy';
import { JUNIOR, SENIOR, TINY, t } from './tiered';

export interface ItemInfo {
  readonly emoji: string;
  readonly label: Tiered<string>;
  /** Said when tapped. Treats are never "bad" — they're for sometimes. */
  readonly line: Tiered<string>;
}

export const ITEM_INFO: Readonly<Record<ItemId, ItemInfo>> = {
  run: {
    emoji: '🏃',
    label: t('Run!', 'Running & playing', 'Active play'),
    line: t('Zoom zoom! Strong heart! 💪', 'Running and playing make your heart muscle stronger!', 'Active play is exercise for your heart muscle — it pumps more with every beat.'),
  },
  bike: {
    emoji: '🚲',
    label: t('Bike', 'Bike ride', 'Cycling'),
    line: t('Pedal pedal! Strong heart!', 'Bike rides get your heart pumping!', 'Cycling is aerobic exercise: it trains your heart and lungs to deliver oxygen.'),
  },
  sleep: {
    emoji: '😴',
    label: t('Sleep', 'Good sleep', '9–12 h sleep'),
    line: t('Snooze! The heart rests too! 🌙', 'Sleep lets your heart slow down and rest.', 'During deep sleep your heart rate and blood pressure dip, giving your heart a rest.'),
  },
  water: {
    emoji: '💧',
    label: t('Water', 'Water', 'Water'),
    line: t('Glug glug! Yummy water! 💧', 'Water is the best drink for your body and heart!', 'Water keeps your blood flowing easily — the best everyday drink.'),
  },
  apple: {
    emoji: '🍎',
    label: t('Apple', 'Apple', 'Fruit'),
    line: t('Crunch! Apples are great! 🍎', 'Fruit is an everyday food — great for your heart!', 'Fruit brings fibre and vitamins that help keep your heart healthy.'),
  },
  broccoli: {
    emoji: '🥦',
    label: t('Broccoli', 'Broccoli', 'Vegetables'),
    line: t('Little trees! Yum! 🥦', 'Vegetables help your heart stay strong!', 'Vegetables are packed with fibre, vitamins and minerals your heart loves.'),
  },
  banana: {
    emoji: '🍌',
    label: t('Banana', 'Banana', 'Banana'),
    line: t('Banana power! 🍌', 'Bananas are a tasty everyday food!', 'Bananas contain potassium, a mineral your heart and muscles need to work properly.'),
  },
  carrot: {
    emoji: '🥕',
    label: t('Carrot', 'Carrots', 'Carrots'),
    line: t('Crunchy carrots! 🥕', 'Carrots are a crunchy everyday food!', 'Colourful vegetables like carrots are a great everyday choice.'),
  },
  donut: {
    emoji: '🍩',
    label: t('Donut', 'Doughnut', 'Doughnut'),
    line: t('Yum! A treat for sometimes! 🍩', 'That’s a sometimes food — yummy now and then!', 'A fine occasional treat — lots of sugar and fat every day makes the heart work harder.'),
  },
  lolly: {
    emoji: '🍭',
    label: t('Lolly', 'Lollipop', 'Sweets'),
    line: t('Sweet! That’s for sometimes! 🍭', 'Sweets are sometimes treats!', 'Sweets are sometimes foods — enjoy them as treats, not every day.'),
  },
  fries: {
    emoji: '🍟',
    label: t('Fries', 'Fries', 'Salty fries'),
    line: t('Fries are for sometimes!', 'Fries are a sometimes food — fun for a treat!', 'Salty foods are fine sometimes; too much salt can raise blood pressure over time.'),
  },
  fizzy: {
    emoji: '🥤',
    label: t('Fizzy', 'Fizzy drink', 'Sugary drink'),
    line: t('Fizzy is for sometimes!', 'Fizzy drinks are sometimes drinks. Water is the everyday one!', 'Sugary drinks are a sometimes choice — water is the everyday drink.'),
  },
  screens: {
    emoji: '📺',
    label: t('TV', 'TV all day', 'Screens all day'),
    line: t('TV is fun sometimes!', 'Screens are fun sometimes — then go play!', 'Screens are fine in small doses, but long hours of sitting give your heart little exercise.'),
  },
};

export const healthyStop: WorldStop = {
  id: 'healthy-heart',
  title: t('Happy Heart', 'Keep Your Heart Happy', 'A Strong, Healthy Heart'),
  emoji: '🍎',
  color: '#3CCB7F',
  narration: t(
    ['Your heart loves to play! Run, jump, dance! 💃', 'It loves sleep, water and yummy fruit! 🍓', 'Let’s make this heart super happy!'],
    [
      'Your heart is a muscle, {name} — and muscles get stronger when you move!',
      'Active play, good sleep, water, fruit and vegetables all help your heart.',
      'Treats like cake are fine sometimes — we call them “sometimes foods”.',
    ],
    [
      'The heart is a muscle, so regular exercise makes it stronger and more efficient — it pumps more blood with each beat.',
      'Aim for at least 60 minutes of active play a day, and about 9–12 hours of sleep a night for ages 6 to 12.',
      'Fruit, vegetables, whole grains and water fuel a healthy heart; sugary or salty “sometimes foods” are fine as occasional treats.',
    ],
  ),
  facts: t(
    ['Hugs and giggles are good for you too! 🤗', 'Water is the best drink! 💧'],
    [
      'Try to be active for at least an hour every day — playing counts!',
      'Sleep gives your heart and body time to rest and grow.',
      'Eat a rainbow of fruit and veg: red, orange, green and purple!',
    ],
    [
      'A fitter heart recovers faster: after exercise, its rate drops back towards resting sooner.',
      'Eating lots of salt can raise blood pressure over time, which makes the heart work harder.',
      'Smoke harms the heart and lungs — clean air and a smoke-free home help keep your heart healthy.',
    ],
  ),
  task: {
    kind: 'healthy-choices',
    instruction: t(
      `Tap ${TUNING.tiny.healthy.goal} things that make the heart happy!`,
      `Tap ${TUNING.junior.healthy.goal} heart-healthy everyday choices!`,
      `Power up the heart: find all ${TUNING.senior.healthy.goal} heart-healthy everyday choices!`,
    ),
    hint: t(
      'Running, water and fruit! 🍎',
      'Look for moving, sleeping, water, fruit and vegetables.',
      'Everyday choices: activity, sleep, water, fruit and vegetables. Treats are for sometimes.',
    ),
  },
  quiz: [
    {
      id: 'hh-healthy-strong-tiny',
      bands: TINY,
      prompt: 'What makes your heart strong?',
      choices: [
        { id: 'play', label: 'Running and playing', emoji: '🏃' },
        { id: 'sit', label: 'Sitting all day', emoji: '🛋️' },
      ],
      answerId: 'play',
      explain: 'Running and playing! Your heart gets super strong! 💪',
    },
    {
      id: 'hh-healthy-drink-tiny',
      bands: TINY,
      prompt: 'What’s the best everyday drink?',
      choices: [
        { id: 'water', label: 'Water', emoji: '💧' },
        { id: 'fizzy', label: 'Fizzy drink', emoji: '🥤' },
      ],
      answerId: 'water',
      explain: 'Water! Glug glug! Fizzy drinks are for sometimes. 💧',
    },
    {
      id: 'hh-healthy-hour',
      bands: JUNIOR,
      prompt: 'How long should kids be active every day?',
      choices: [
        { id: 'hour', label: 'At least an hour', emoji: '⏰' },
        { id: 'five', label: 'Five minutes', emoji: '⏱️' },
        { id: 'none', label: 'No time at all', emoji: '🛋️' },
      ],
      answerId: 'hour',
      explain: 'At least 60 minutes of active play every day — running, dancing, climbing and games all count!',
    },
    {
      id: 'hh-healthy-everyday',
      bands: JUNIOR,
      prompt: 'Which one is an everyday food?',
      choices: [
        { id: 'apple', label: 'Apple', emoji: '🍎' },
        { id: 'donut', label: 'Doughnut', emoji: '🍩' },
        { id: 'lolly', label: 'Lollipop', emoji: '🍭' },
      ],
      answerId: 'apple',
      explain: 'Apples are an everyday food. Doughnuts and lollipops are yummy sometimes foods.',
    },
    {
      id: 'hh-healthy-why',
      bands: JUNIOR,
      prompt: 'Why is exercise good for your heart?',
      choices: [
        { id: 'stronger', label: 'It makes the heart muscle stronger', emoji: '💪' },
        { id: 'blue', label: 'It makes blood blue', emoji: '🔵' },
        { id: 'smaller', label: 'It makes the heart tiny', emoji: '🤏' },
      ],
      answerId: 'stronger',
      explain: 'Your heart is a muscle — exercise makes it stronger, just like your leg muscles!',
    },
    {
      id: 'hh-healthy-sleep',
      bands: SENIOR,
      prompt: 'How much sleep do 6- to 12-year-olds need each night?',
      choices: [
        { id: '9to12', label: 'About 9–12 hours' },
        { id: '4to5', label: 'About 4–5 hours' },
        { id: '15', label: 'About 15–18 hours' },
        { id: '6', label: 'About 6 hours' },
      ],
      answerId: '9to12',
      explain: 'Sleep experts recommend about 9–12 hours for ages 6–12 — sleep is when your body rests and repairs.',
    },
    {
      id: 'hh-healthy-fit',
      bands: SENIOR,
      prompt: 'What happens to a heart with regular exercise?',
      choices: [
        { id: 'more', label: 'It pumps more blood with each beat' },
        { id: 'weaker', label: 'It gets smaller and weaker' },
        { id: 'nooxygen', label: 'It stops needing oxygen' },
        { id: 'faster', label: 'Its resting rate goes up a lot' },
      ],
      answerId: 'more',
      explain: 'Training makes the heart muscle stronger, so each beat pumps more blood — and the resting rate can go down.',
    },
    {
      id: 'hh-healthy-salt',
      bands: SENIOR,
      prompt: 'Which habit can raise blood pressure over time?',
      choices: [
        { id: 'salt', label: 'Eating lots of salty food' },
        { id: 'water', label: 'Drinking water' },
        { id: 'veg', label: 'Eating vegetables' },
        { id: 'sleep', label: 'Getting enough sleep' },
      ],
      answerId: 'salt',
      explain: 'Too much salt, day after day, can raise blood pressure — so salty snacks are best as sometimes foods.',
    },
    {
      id: 'hh-healthy-sometimes',
      bands: SENIOR,
      prompt: 'What is a “sometimes food”?',
      choices: [
        { id: 'treat', label: 'A treat that’s fine now and then' },
        { id: 'never', label: 'A food you must never eat' },
        { id: 'veg', label: 'Any vegetable' },
        { id: 'night', label: 'Food eaten only at night' },
      ],
      answerId: 'treat',
      explain: 'No food is “banned” — sometimes foods are treats to enjoy now and then, while everyday foods fuel you most of the time.',
    },
  ],
};
