import type { WorldModule } from '@/core/types';
import { content } from './content';
import { Overlay } from './Overlay';
import { Scene } from './Scene';

/** Chandrayaan Moon Mission — fly ISRO's Chandrayaan-3 from Sriharikota to the lunar south pole. */
export default {
  content,
  canvas: {
    camera: { position: [0, 2, 24], fov: 45, far: 3000 },
    background: '#05071a',
    bloom: { intensity: 0.85, luminanceThreshold: 0.62 },
  },
  Scene,
  Overlay,
} satisfies WorldModule;
