import type { WorldModule } from '@/core/types';
import { content } from './content';
import { Overlay } from './Overlay';
import { PALETTE } from './parts/palette';
import { Scene } from './Scene';

/** Inside the Human Heart — meet it, hear it, open it, take it apart, fix it, ride through it, keep it strong. */
export default {
  content,
  canvas: {
    camera: { position: [0, 1, 14], fov: 42, far: 1200 },
    background: PALETTE.canvas,
    bloom: { intensity: 0.7, luminanceThreshold: 0.72 },
  },
  Scene,
  Overlay,
} satisfies WorldModule;
