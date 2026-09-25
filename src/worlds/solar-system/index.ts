import type { WorldModule } from '@/core/types';
import { content } from './content';
import { Overlay } from './Overlay';
import { Scene } from './Scene';

/**
 * Solar System Voyage — fly a toy rocket from the Sun out to Neptune. Everything (planets, rings, clouds,
 * continents, the rocket) is procedural: no models, textures or fonts are downloaded.
 */
export default {
  content,
  canvas: {
    camera: { position: [0, 40, 110], fov: 45, far: 4000 },
    background: '#05060f',
    // High threshold: only truly emissive things (the Sun, sparks, glows, flames) bloom — lit surfaces stay crisp.
    bloom: { intensity: 1, luminanceThreshold: 0.9 },
  },
  Scene,
  Overlay,
} satisfies WorldModule;
