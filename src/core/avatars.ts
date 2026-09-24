export interface Avatar {
  readonly id: string;
  readonly emoji: string;
  readonly name: string;
  /** Helmet / badge colour. */
  readonly color: string;
}

export const AVATARS: readonly Avatar[] = [
  { id: 'fox', emoji: '🦊', name: 'Fox', color: '#FF8A3D' },
  { id: 'panda', emoji: '🐼', name: 'Panda', color: '#6C7BFF' },
  { id: 'tiger', emoji: '🐯', name: 'Tiger', color: '#FFB020' },
  { id: 'bunny', emoji: '🐰', name: 'Bunny', color: '#FF7EB6' },
  { id: 'koala', emoji: '🐨', name: 'Koala', color: '#8C9EB5' },
  { id: 'lion', emoji: '🦁', name: 'Lion', color: '#F2A93B' },
  { id: 'frog', emoji: '🐸', name: 'Frog', color: '#3CCB7F' },
  { id: 'monkey', emoji: '🐵', name: 'Monkey', color: '#B7825A' },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn', color: '#B98CFF' },
  { id: 'penguin', emoji: '🐧', name: 'Penguin', color: '#3FA7F5' },
  { id: 'owl', emoji: '🦉', name: 'Owl', color: '#9C7A5B' },
  { id: 'dino', emoji: '🦖', name: 'Dino', color: '#2EC4B6' },
];

export const DEFAULT_AVATAR = AVATARS[0] as Avatar;

export function avatarById(id: string | undefined | null): Avatar {
  return AVATARS.find((a) => a.id === id) ?? DEFAULT_AVATAR;
}
